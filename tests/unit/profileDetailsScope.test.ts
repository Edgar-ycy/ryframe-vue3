import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, effectScope, nextTick, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted((): { activated?: () => void; deactivated?: () => void } => ({}))
const api = vi.hoisted(() => ({
  changePassword: vi.fn(),
  getProfile: vi.fn(),
  updateAvatar: vi.fn(),
  updateProfile: vi.fn(),
}))
const session = vi.hoisted(() => ({ terminateSession: vi.fn() }))

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
vi.mock('@/api/modules/auth', () => api)
vi.mock('@/app/session/sessionCoordinator', () => session)
vi.mock('@/i18n', () => ({ normalizeLocale: () => undefined }))
vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ setLocale: vi.fn() }),
}))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))

import type { ProfileInfo, ProfileUpdateParams } from '@/api/modules/auth'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { createProfileDetailsSubmission } from '@/views/profile/profileDetailsSubmission'
import { createProfileAvatarCommandScope } from '@/views/profile/profileAvatarCommand'
import { createProfilePasswordSubmission } from '@/views/profile/profilePasswordSubmission'
import { useProfileManagement } from '@/views/profile/useProfileManagement'
import {
  useProfileAvatarMutation,
  useProfileDetailsMutation,
  useProfilePasswordMutation,
} from '@/views/profile/useProfileMutations'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function profile(subject: 'user-a' | 'user-b'): ProfileInfo {
  return {
    avatar: `${subject}-avatar`,
    created_at: '2026-08-29T00:00:00.000Z',
    dept_name: `${subject}-department`,
    email: `${subject}@example.com`,
    nickname: `${subject}-nickname`,
    permissions: [],
    phone: '',
    roles: [],
    status: '1',
    user_id: subject,
    username: subject,
  }
}

function applyUser(subject: 'user-a' | 'user-b'): void {
  const value = profile(subject)
  useUserStore().$patch({
    avatar: value.avatar ?? '',
    email: value.email,
    nickname: value.nickname,
    permissions: [],
    phone: '',
    roles: [],
    sessionStatus: 'authenticated',
    tenantId: 'tenant-a',
    token: `token-${subject}`,
    userId: subject,
    username: subject,
  })
}

function activate(subject: 'user-a' | 'user-b'): void {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: subject,
      authorizationFingerprint: `authorization-${subject}`,
    },
    () => applyUser(subject),
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

describe('个人资料完整会话范围', () => {
  const scopes: EffectScope[] = []

  beforeEach(() => {
    lifecycle.activated = undefined
    lifecycle.deactivated = undefined
    deactivateServerStateScope()
    queryClient.clear()
    setActivePinia(createPinia())
    api.updateProfile.mockResolvedValue(undefined)
    api.changePassword.mockResolvedValue(undefined)
    api.updateAvatar.mockResolvedValue({ data: { avatar_url: '/avatar-b.png' } })
  })

  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop()
    queryClient.clear()
    deactivateServerStateScope()
  })

  it('同租户 A→B 与 KeepAlive 失活会同步清除 A 的本地资料投影', async () => {
    const oldResponse = deferred<{ data: ProfileInfo }>()
    api.getProfile
      .mockReturnValueOnce(oldResponse.promise)
      .mockResolvedValue({ data: profile('user-b') })
    activate('user-a')
    const composable = runComposable(() => useProfileManagement((key) => key))
    scopes.push(composable.scope)
    await vi.waitFor(() => expect(api.getProfile).toHaveBeenCalledOnce())
    expect(composable.result.profile.value.email).toBe('user-a@example.com')

    activate('user-b')
    expect(composable.result.profile.value.email).not.toBe('user-a@example.com')
    expect(composable.result.profile.value.avatar).not.toBe('user-a-avatar')

    oldResponse.resolve({ data: profile('user-a') })
    await nextTick()
    await Promise.resolve()
    expect(composable.result.profile.value.email).not.toBe('user-a@example.com')
    expect(composable.result.profile.value.avatar).not.toBe('user-a-avatar')

    lifecycle.deactivated?.()
    expect(composable.result.profile.value.email).toBe('')
    expect(composable.result.profile.value.avatar).toBe('')
  })

  it('async validate 期间切换主体时旧 payload 在 HTTP 前取消且零成功回调', async () => {
    activate('user-a')
    const validation = deferred<boolean>()
    const saved = vi.fn()
    const payload: ProfileUpdateParams = {
      email: 'user-a@example.com',
      nickname: 'user-a-nickname',
    }
    const composable = runComposable(() => {
      const mutation = useProfileDetailsMutation()
      const submission = createProfileDetailsSubmission({
        payload: () => payload,
        save: mutation.saveProfile,
        saved,
        validate: () => validation.promise,
      })
      return { mutation, submission }
    })
    scopes.push(composable.scope)

    const pending = composable.result.submission.submit()
    activate('user-b')
    validation.resolve(true)

    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(api.updateProfile).not.toHaveBeenCalled()
    expect(saved).not.toHaveBeenCalled()
  })

  it('Mutation 即使已绑定新观察器也拒绝携带旧 expectedScope 的资料写入', async () => {
    activate('user-a')
    const oldScope = getServerStateScope()
    if (!oldScope) throw new Error('测试缺少旧会话范围')
    const composable = runComposable(() => useProfileDetailsMutation())
    scopes.push(composable.scope)

    activate('user-b')
    await expect(
      composable.result.saveProfile({ nickname: 'user-a-nickname' }, oldScope),
    ).rejects.toMatchObject({ kind: 'cancelled' })
    expect(api.updateProfile).not.toHaveBeenCalled()
  })

  it('密码 async validate 期间切换主体时旧密码在 HTTP 前取消', async () => {
    activate('user-a')
    const validation = deferred<boolean>()
    const applied = vi.fn()
    const composable = runComposable(() => {
      const mutation = useProfilePasswordMutation()
      const submission = createProfilePasswordSubmission({
        applied,
        password: () => ({
          new_password: 'NewSecret1!',
          old_password: 'OldSecret1!',
        }),
        save: mutation.savePassword,
        validate: () => validation.promise,
      })
      return { mutation, submission }
    })
    scopes.push(composable.scope)

    const pending = composable.result.submission.submit()
    activate('user-b')
    validation.resolve(true)

    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(api.changePassword).not.toHaveBeenCalled()
    expect(applied).not.toHaveBeenCalled()
    expect(session.terminateSession).not.toHaveBeenCalled()
  })

  it('Avatar 在 before-upload 与 http-request 之间切换主体时零上传零回调', async () => {
    activate('user-a')
    const file = {} as File
    const applied = vi.fn()
    const command = createProfileAvatarCommandScope()
    command.capture(file)

    activate('user-b')
    await expect(
      command.run(
        file,
        async (scope) => {
          const mutation = runComposable(() => useProfileAvatarMutation((key) => key))
          scopes.push(mutation.scope)
          return mutation.result.uploadAvatar(new FormData(), scope)
        },
        applied,
      ),
    ).rejects.toMatchObject({ kind: 'cancelled' })

    expect(api.updateAvatar).not.toHaveBeenCalled()
    expect(applied).not.toHaveBeenCalled()
  })
})
