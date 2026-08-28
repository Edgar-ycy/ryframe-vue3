import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  changePassword: vi.fn(),
  updateAvatar: vi.fn(),
  updateProfile: vi.fn(),
}))
const session = vi.hoisted(() => ({ terminateSession: vi.fn() }))
const message = vi.hoisted(() => ({ success: vi.fn() }))

vi.mock('@/api/modules/auth', () => api)
vi.mock('@/app/session/sessionCoordinator', () => session)
vi.mock('element-plus', () => ({ ElMessage: message }))

import {
  PASSWORD_SIGN_OUT_DELAY_MS,
  useProfilePasswordMutation,
} from '@/views/profile/useProfileMutations'
import {
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'

interface Deferred {
  promise: Promise<void>
  resolve: () => void
}

function deferred(): Deferred {
  let resolve!: () => void
  const promise = new Promise<void>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function activate(subjectId: string, fingerprint: string): void {
  transitionServerStateScope(
    { tenantId: 'tenant-a', subjectId, authorizationFingerprint: fingerprint },
    () => undefined,
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

async function waitForSignOutTimer(): Promise<void> {
  for (let attempt = 0; attempt < 20 && vi.getTimerCount() === 0; attempt += 1) {
    await Promise.resolve()
  }
  expect(vi.getTimerCount()).toBeGreaterThan(0)
}

describe('个人中心改密会话范围', () => {
  let scopes: EffectScope[]

  beforeEach(() => {
    vi.useFakeTimers()
    scopes = []
    deactivateServerStateScope()
    api.changePassword.mockResolvedValue(undefined)
  })

  afterEach(() => {
    for (const scope of scopes) scope.stop()
    deactivateServerStateScope()
    vi.useRealTimers()
  })

  it('延时期间切换主体会撤销旧任务，不终止新会话', async () => {
    activate('user-a', 'authorization-a')
    const callbackStarted = deferred()
    const releaseCallback = deferred()
    const onPasswordChanged = vi.fn(async () => {
      callbackStarted.resolve()
      await releaseCallback.promise
    })
    const composable = runComposable(() =>
      useProfilePasswordMutation((key) => key, onPasswordChanged),
    )
    scopes.push(composable.scope)

    const pending = composable.result.savePassword({
      new_password: 'NewSecret1!',
      old_password: 'OldSecret1!',
    })
    await callbackStarted.promise
    releaseCallback.resolve()
    await waitForSignOutTimer()

    const requestSignal = api.changePassword.mock.calls[0]?.[1] as AbortSignal
    expect(requestSignal.aborted).toBe(false)
    activate('user-b', 'authorization-b')
    await pending

    expect(requestSignal.aborted).toBe(true)
    expect(session.terminateSession).not.toHaveBeenCalled()
    expect(message.success).toHaveBeenCalledOnce()
  })

  it('会话未变时在固定延时后终止当前会话', async () => {
    activate('user-a', 'authorization-a')
    const composable = runComposable(() =>
      useProfilePasswordMutation(
        (key) => key,
        () => undefined,
      ),
    )
    scopes.push(composable.scope)

    const pending = composable.result.savePassword({
      new_password: 'NewSecret1!',
      old_password: 'OldSecret1!',
    })
    await waitForSignOutTimer()
    await vi.advanceTimersByTimeAsync(PASSWORD_SIGN_OUT_DELAY_MS)
    await pending

    expect(session.terminateSession).toHaveBeenCalledOnce()
  })
})
