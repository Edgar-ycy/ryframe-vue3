import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted(() => ({
  activated: [] as Array<() => void>,
  deactivated: [] as Array<() => void>,
}))
const authApi = vi.hoisted(() => ({
  getAuthSessions: vi.fn(),
  revokeAuthSession: vi.fn(),
  revokeOtherAuthSessions: vi.fn(),
}))
const session = vi.hoisted(() => ({
  ensureCsrfToken: vi.fn(),
  logoutSession: vi.fn(),
  terminateSession: vi.fn(),
}))
const ui = vi.hoisted(() => ({ confirm: vi.fn(), error: vi.fn(), info: vi.fn(), success: vi.fn() }))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onActivated: (callback: () => void) => lifecycle.activated.push(callback),
    onDeactivated: (callback: () => void) => lifecycle.deactivated.push(callback),
  }
})
vi.mock('@/api/modules/auth', () => authApi)
vi.mock('@/app/session/sessionCoordinator', () => session)
vi.mock('@/utils/confirmAction', () => ({ confirmAction: ui.confirm }))
vi.mock('element-plus', () => ({
  ElMessage: { error: ui.error, info: ui.info, success: ui.success },
}))

import type { AuthSessionView } from '@/views/profile/authSessionSupport'
import { confirmAndLogoutCurrentSession } from '@/components/layout/Navbar/logoutAction'
import {
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { useAuthSessionManagement } from '@/views/profile/useAuthSessionManagement'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function activate(subjectId: string, fingerprint: string): void {
  transitionServerStateScope(
    { tenantId: 'tenant-a', subjectId, authorizationFingerprint: fingerprint },
    () =>
      useUserStore().$patch({
        sessionStatus: 'authenticated',
        tenantId: 'tenant-a',
        userId: subjectId,
      }),
    { force: true },
  )
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

function device(): AuthSessionView {
  return {
    browser: 'Chrome',
    current: false,
    device: 'Chrome · Windows',
    expiresAt: '2026-08-30',
    ipAddress: '127.0.0.1',
    key: 'session-old',
    lastActivity: '2026-08-29',
    loginLocation: '本地',
    loginTime: '2026-08-29',
    operatingSystem: 'Windows',
  }
}

describe('认证会话与导航栏范围', () => {
  const scopes: EffectScope[] = []

  beforeEach(() => {
    setActivePinia(createPinia())
    queryClient.clear()
    deactivateServerStateScope()
    lifecycle.activated.length = 0
    lifecycle.deactivated.length = 0
    authApi.getAuthSessions.mockResolvedValue({ data: [] })
    session.ensureCsrfToken.mockResolvedValue('csrf-token')
    session.logoutSession.mockResolvedValue(undefined)
    session.terminateSession.mockResolvedValue(undefined)
    activate('user-a', 'authorization-a')
  })

  afterEach(() => {
    while (scopes.length) scopes.pop()?.stop()
    queryClient.clear()
    deactivateServerStateScope()
  })

  it.each([
    ['同租户 A→B', 'user-b', 'authorization-b'],
    ['同主体 epoch 变化', 'user-a', 'authorization-b'],
  ])('导航栏注销确认期间%s时不注销新会话', async (_name, subjectId, fingerprint) => {
    const confirmation = deferred<boolean>()
    const pending = confirmAndLogoutCurrentSession(() => confirmation.promise)

    activate(subjectId, fingerprint)
    confirmation.resolve(true)

    await expect(pending).resolves.toBe(false)
    expect(session.logoutSession).not.toHaveBeenCalled()
  })

  it('设备撤销确认期间 KeepAlive 失活后零 HTTP、零 toast', async () => {
    const confirmation = deferred<boolean>()
    ui.confirm.mockReturnValueOnce(confirmation.promise)
    const composable = runComposable(useAuthSessionManagement)
    scopes.push(composable.scope)

    const pending = composable.result.revokeSession(device())
    for (const deactivate of lifecycle.deactivated) deactivate()
    confirmation.resolve(true)
    await pending

    expect(authApi.revokeAuthSession).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('设备撤销请求期间 KeepAlive 失活会中止请求并屏蔽回写', async () => {
    let requestSignal: AbortSignal | undefined
    ui.confirm.mockResolvedValueOnce(true)
    authApi.revokeAuthSession.mockImplementation(
      (_sid: string, _csrf: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          requestSignal = signal
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        }),
    )
    const composable = runComposable(useAuthSessionManagement)
    scopes.push(composable.scope)

    const pending = composable.result.revokeSession(device())
    await vi.waitFor(() => expect(authApi.revokeAuthSession).toHaveBeenCalledOnce())
    for (const deactivate of lifecycle.deactivated) deactivate()
    await pending

    expect(requestSignal?.aborted).toBe(true)
    expect(ui.success).not.toHaveBeenCalled()
    expect(composable.result.pendingDeviceKey.value).toBeUndefined()
  })
})
