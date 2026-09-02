import { effectScope, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted(() => ({
  activated: undefined as (() => void) | undefined,
  deactivated: undefined as (() => void) | undefined,
}))

vi.mock('vue', async (loadActual) => {
  const actual = await loadActual<typeof import('vue')>()
  return {
    ...actual,
    onActivated: (callback: () => void) => {
      lifecycle.activated = callback
    },
    onDeactivated: (callback: () => void) => {
      lifecycle.deactivated = callback
    },
  }
})

import { deactivateServerStateScope, transitionServerStateScope } from '@/shared/query/client'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'

function activate(subjectId: string, fingerprint: string): void {
  transitionServerStateScope(
    { tenantId: 'tenant-a', subjectId, authorizationFingerprint: fingerprint },
    () => undefined,
    { force: true },
  )
}

beforeEach(() => {
  lifecycle.activated = undefined
  lifecycle.deactivated = undefined
  deactivateServerStateScope()
})

afterEach(() => {
  deactivateServerStateScope()
})

describe('服务端状态页面生命周期', () => {
  it('完整 scope 变化同步 reset 并使旧 ownership 失效', () => {
    activate('user-a', 'authorization-a')
    const reset = vi.fn()
    const scope = effectScope()
    const page = scope.run(() => useServerStatePageLifecycle(reset))
    if (!page) throw new Error('测试页面生命周期未创建')
    const ownsOldOperation = page.captureOwnership()

    activate('user-a', 'authorization-b')

    expect(reset).toHaveBeenCalled()
    expect(ownsOldOperation()).toBe(false)
    scope.stop()
  })

  it('KeepAlive 失活同步 reset，重新激活只恢复新 ownership', async () => {
    activate('user-a', 'authorization-a')
    const reset = vi.fn()
    const scope = effectScope()
    const page = scope.run(() => useServerStatePageLifecycle(reset))
    if (!page) throw new Error('测试页面生命周期未创建')
    const ownsOldOperation = page.captureOwnership()

    lifecycle.deactivated?.()
    expect(page.pageActive.value).toBe(false)
    expect(reset).toHaveBeenCalledOnce()
    expect(ownsOldOperation()).toBe(false)

    lifecycle.activated?.()
    await nextTick()
    expect(page.pageActive.value).toBe(true)
    expect(page.captureOwnership()()).toBe(true)
    scope.stop()
  })
})
