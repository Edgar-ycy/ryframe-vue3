import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/client'
import {
  configureServerStateErrorReporter,
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  serverStateQueryKey,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

function activate(subjectId: string) {
  transitionServerStateScope(
    { tenantId: 'tenant-refetch', subjectId, authorizationFingerprint: subjectId },
    () => undefined,
  )
}

function queryFixture(queryFn: () => Promise<string>) {
  activate('user-a')
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const query = app.runWithContext(() =>
    scope.run(() =>
      useServerStateQuery(false, 'manual-refetch', () => null, queryFn, { retry: false }),
    ),
  )!
  return { query, stop: () => scope.stop() }
}

afterEach(() => {
  deactivateServerStateScope()
  configureServerStateErrorReporter(undefined)
})

describe('显式刷新与会话取消', () => {
  it('清理旧 scope 时将 TanStack 取消转换为 cancelled，旧刷新不进入成功回调', async () => {
    const pending = deferred<string>()
    const { query, stop } = queryFixture(() => pending.promise)
    const success = vi.fn()
    const result = query.refetch({ throwOnError: true }).then(success, (error: unknown) => error)
    await vi.waitFor(() => expect(query.isFetching.value).toBe(true))
    activate('user-b')
    const error = await result
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({ kind: 'cancelled' })
    pending.resolve('old-result')
    expect(success).not.toHaveBeenCalled()
    expect(query.data.value).not.toBe('old-result')
    stop()
  })

  it('同一 scope 主动取消刷新仍不报错提示', async () => {
    const pending = deferred<string>()
    const { query, stop } = queryFixture(() => pending.promise)
    const reporter = vi.fn()
    configureServerStateErrorReporter(reporter)
    const result = query.refetch({ throwOnError: true }).catch((error: unknown) => error)
    await vi.waitFor(() => expect(query.isFetching.value).toBe(true))
    await queryClient.cancelQueries({
      queryKey: serverStateQueryKey(getServerStateScope()!, 'manual-refetch'),
    })
    expect(await result).toMatchObject({ kind: 'cancelled' })
    pending.resolve('cancelled-result')
    expect(reporter).not.toHaveBeenCalled()
    stop()
  })

  it('普通 HTTP 失败原样传播且只提示一次', async () => {
    const failure = new HttpError('真实失败', { status: 500 })
    const { query, stop } = queryFixture(() => Promise.reject(failure))
    const reporter = vi.fn()
    configureServerStateErrorReporter(reporter)
    await expect(query.refetch({ throwOnError: true })).rejects.toBe(failure)
    expect(reporter).toHaveBeenCalledExactlyOnceWith(failure)
    stop()
  })
})
