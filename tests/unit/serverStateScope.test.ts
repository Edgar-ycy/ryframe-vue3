import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, effectScope, nextTick, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/shared/http/client'
import {
  assertServerStateScopeCurrent,
  configureServerStateErrorReporter,
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  serverStateQueryKey,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, reject, resolve }
}

function activate(subjectId: string, fingerprint: string) {
  transitionServerStateScope(
    { tenantId: 'tenant-a', subjectId, authorizationFingerprint: fingerprint },
    () => undefined,
    { force: true },
  )
  const scope = getServerStateScope()
  if (!scope) throw new Error('测试会话范围未激活')
  return scope
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

describe('服务端状态会话范围', () => {
  beforeEach(() => {
    deactivateServerStateScope()
    configureServerStateErrorReporter(undefined)
  })

  afterEach(() => {
    deactivateServerStateScope()
    configureServerStateErrorReporter(undefined)
  })

  it('同租户换用户和授权指纹变化都会生成新键，令牌轮换不会', () => {
    const first = activate('user-a', 'permission-1')
    const firstKey = serverStateQueryKey(first, 'profile', { scope: 'self' })

    expect(
      transitionServerStateScope(
        {
          tenantId: 'tenant-a',
          subjectId: 'user-a',
          authorizationFingerprint: 'permission-1',
        },
        () => undefined,
      ),
    ).toBe(false)
    expect(getServerStateScope()?.sessionEpoch).toBe(first.sessionEpoch)

    expect(
      transitionServerStateScope(
        {
          tenantId: 'tenant-a',
          subjectId: 'user-a',
          authorizationFingerprint: 'permission-2',
        },
        () => undefined,
      ),
    ).toBe(true)
    const permissionChanged = getServerStateScope()!
    expect(permissionChanged.sessionEpoch).toBeGreaterThan(first.sessionEpoch)
    expect(first.signal.aborted).toBe(true)
    expect(serverStateQueryKey(permissionChanged, 'profile', { scope: 'self' })).not.toEqual(
      firstKey,
    )

    expect(
      transitionServerStateScope(
        {
          tenantId: 'tenant-a',
          subjectId: 'user-b',
          authorizationFingerprint: 'permission-2',
        },
        () => undefined,
      ),
    ).toBe(true)
    expect(getServerStateScope()).toMatchObject({ tenantId: 'tenant-a', subjectId: 'user-b' })
  })

  it('活跃 Query 在同租户切换用户后立即隐藏旧数据并只接受新响应', async () => {
    activate('user-a', 'permission-a')
    const first = deferred<string>()
    const second = deferred<string>()
    const signals: AbortSignal[] = []
    let calls = 0
    const { result: query, scope } = runComposable(() =>
      useServerStateQuery(
        true,
        'slow-profile',
        () => ({ scope: 'self' }),
        (signal) => {
          signals.push(signal)
          calls += 1
          return calls === 1 ? first.promise : second.promise
        },
        { retry: false },
      ),
    )

    await vi.waitFor(() => expect(calls).toBe(1))
    first.resolve('user-a-data')
    await vi.waitFor(() => expect(query.data.value).toBe('user-a-data'))

    transitionServerStateScope(
      {
        tenantId: 'tenant-a',
        subjectId: 'user-b',
        authorizationFingerprint: 'permission-b',
      },
      () => undefined,
    )
    await nextTick()
    expect(query.data.value).toBeUndefined()
    expect(signals[0]?.aborted).toBe(true)
    await vi.waitFor(() => expect(calls).toBe(2))
    second.resolve('user-b-data')
    await vi.waitFor(() => expect(query.data.value).toBe('user-b-data'))
    scope.stop()
  })

  it('慢 Query 即使忽略取消信号，也不能把旧响应交给新范围', async () => {
    activate('user-a', 'permission-a')
    const first = deferred<string>()
    const second = deferred<string>()
    let calls = 0
    const { result: query, scope } = runComposable(() =>
      useServerStateQuery(
        true,
        'slow-query',
        () => null,
        () => (++calls === 1 ? first.promise : second.promise),
        { retry: false },
      ),
    )

    await vi.waitFor(() => expect(calls).toBe(1))
    transitionServerStateScope(
      {
        tenantId: 'tenant-a',
        subjectId: 'user-a',
        authorizationFingerprint: 'permission-b',
      },
      () => undefined,
    )
    await vi.waitFor(() => expect(calls).toBe(2))
    first.resolve('stale')
    await nextTick()
    expect(query.data.value).not.toBe('stale')
    second.resolve('fresh')
    await vi.waitFor(() => expect(query.data.value).toBe('fresh'))
    scope.stop()
  })

  it('慢 Mutation 在范围切换后重置 observer，并屏蔽旧成功回调', async () => {
    activate('user-a', 'permission-a')
    const operation = deferred<string>()
    let requestSignal: AbortSignal | undefined
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onSettled = vi.fn()
    const reportError = vi.fn()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    configureServerStateErrorReporter(reportError)
    const { result: mutation, scope } = runComposable(() =>
      useServerStateMutation<string, void>('slow-mutation', {
        mutationFn: (_variables, context) => {
          requestSignal = context.signal
          return operation.promise
        },
        onSuccess,
        onError,
        onSettled,
      }),
    )

    const pending = mutation.mutateAsync()
    await vi.waitFor(() => expect(mutation.pending.value).toBe(true))
    transitionServerStateScope(
      {
        tenantId: 'tenant-a',
        subjectId: 'user-b',
        authorizationFingerprint: 'permission-b',
      },
      () => undefined,
    )
    await nextTick()
    expect(mutation.pending.value).toBe(false)
    expect(requestSignal?.aborted).toBe(true)
    operation.resolve('stale-success')
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(onSettled).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
    expect(mutation.data.value).toBeUndefined()
    scope.stop()
  })

  it('Mutation 统一组合调用方取消信号与当前会话信号', async () => {
    activate('user-a', 'permission-a')
    const caller = new AbortController()
    let requestSignal: AbortSignal | undefined
    const { result: mutation, scope } = runComposable(() =>
      useServerStateMutation<void, { signal: AbortSignal }>('caller-cancellable', {
        meta: { errorMode: 'silent' },
        callerSignal: (variables) => variables.signal,
        mutationFn: (_variables, context) => {
          requestSignal = context.signal
          return new Promise((_, reject) => {
            context.signal.addEventListener(
              'abort',
              () => reject(new HttpError('调用方已取消', { kind: 'cancelled' })),
              { once: true },
            )
          })
        },
      }),
    )

    const pending = mutation.mutateAsync({ signal: caller.signal })
    await vi.waitFor(() => expect(requestSignal).toBeDefined())
    expect(requestSignal).not.toBe(caller.signal)
    expect(requestSignal?.aborted).toBe(false)
    caller.abort()
    expect(requestSignal?.aborted).toBe(true)
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    scope.stop()
  })

  it('作用域取消错误保持为可识别的 HttpError', () => {
    const scope = activate('user-a', 'permission-a')
    deactivateServerStateScope()
    let thrown: unknown
    try {
      assertServerStateScopeCurrent(scope)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toMatchObject({ kind: 'cancelled', status: 401 })
  })

  it('新投影失败时不发布范围并保持失败关闭', () => {
    const previous = activate('user-a', 'permission-a')

    expect(() =>
      transitionServerStateScope(
        {
          tenantId: 'tenant-a',
          subjectId: 'user-b',
          authorizationFingerprint: 'permission-b',
        },
        () => {
          throw new Error('投影失败')
        },
      ),
    ).toThrow('投影失败')
    expect(previous.signal.aborted).toBe(true)
    expect(getServerStateScope()).toBeUndefined()
  })
})
