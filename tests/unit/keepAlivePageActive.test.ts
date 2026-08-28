import { VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted((): { activated?: () => void; deactivated?: () => void } => ({}))

vi.mock('vue', async (importOriginal) => {
  const vue = await importOriginal<typeof import('vue')>()
  return {
    ...vue,
    onActivated: (callback: () => void) => {
      lifecycle.activated = callback
    },
    onDeactivated: (callback: () => void) => {
      lifecycle.deactivated = callback
    },
  }
})

import { createApp, effectScope, nextTick, ref, watch, type EffectScope } from 'vue'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import {
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

describe('KeepAlive 页面活动状态', () => {
  beforeEach(() => {
    lifecycle.activated = undefined
    lifecycle.deactivated = undefined
    deactivateServerStateScope()
  })

  afterEach(() => deactivateServerStateScope())

  it('离开时停用请求，重新激活时只刷新一次', async () => {
    const pageActive = ref(true)
    const refresh = vi.fn(async () => undefined)
    useKeepAlivePageActive(pageActive, refresh)

    lifecycle.deactivated?.()
    expect(pageActive.value).toBe(false)

    lifecycle.activated?.()
    expect(pageActive.value).toBe(true)
    expect(refresh).toHaveBeenCalledOnce()

    lifecycle.activated?.()
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('缓存期间切换主体后恢复页面时旧结果渲染次数为零', async () => {
    transitionServerStateScope(
      {
        tenantId: 'tenant-a',
        subjectId: 'user-a',
        authorizationFingerprint: 'permission-a',
      },
      () => undefined,
      { force: true },
    )
    const pageActive = ref(true)
    const first = deferred<string>()
    const second = deferred<string>()
    const rendered: string[] = []
    let calls = 0
    const { result: query, scope } = runComposable(() => {
      const activeQuery = useServerStateQuery(
        pageActive,
        'keep-alive-profile',
        () => ({ scope: 'self' }),
        () => (++calls === 1 ? first.promise : second.promise),
        { retry: false },
      )
      useKeepAlivePageActive(pageActive, () => activeQuery.refetch())
      watch(
        activeQuery.data,
        (value) => {
          if (value) rendered.push(value)
        },
        { flush: 'sync' },
      )
      return activeQuery
    })

    await vi.waitFor(() => expect(calls).toBe(1))
    lifecycle.deactivated?.()
    expect(pageActive.value).toBe(false)
    transitionServerStateScope(
      {
        tenantId: 'tenant-a',
        subjectId: 'user-b',
        authorizationFingerprint: 'permission-b',
      },
      () => undefined,
    )
    first.resolve('user-a-data')
    await nextTick()
    await Promise.resolve()
    expect(query.data.value).toBeUndefined()
    expect(rendered.filter((value) => value === 'user-a-data')).toHaveLength(0)

    lifecycle.activated?.()
    await vi.waitFor(() => expect(calls).toBeGreaterThanOrEqual(2))
    second.resolve('user-b-data')
    await vi.waitFor(() => expect(query.data.value).toBe('user-b-data'))
    expect(rendered).toEqual(['user-b-data'])
    scope.stop()
  })
})
