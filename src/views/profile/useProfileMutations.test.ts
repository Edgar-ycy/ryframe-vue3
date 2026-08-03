import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PasswordChangeParams,
  ProfileUpdateParams,
} from '@/api/modules/auth'

interface MutationOptionsMock {
  mutationFn: (input: unknown) => Promise<unknown>
  onError?: (error: unknown, input: unknown) => unknown
  onSuccess?: (data: unknown, input: unknown) => unknown
}

interface MutationHarnessEntry {
  resource: string
  pending: { value: boolean }
  variables: { value?: unknown }
  mutateAsync: (variables: unknown) => Promise<unknown>
}

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  mutationCalls: [] as MutationHarnessEntry[],
  terminateSession: vi.fn(),
  updateAvatar: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('@/api/modules/auth', () => ({
  changePassword: mocks.changePassword,
  updateAvatar: mocks.updateAvatar,
  updateProfile: mocks.updateProfile,
}))
vi.mock('@/app/session/sessionCoordinator', () => ({
  terminateSession: mocks.terminateSession,
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a' }),
}))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/shared/query/useTenantMutation', () => ({
  useTenantMutation: (_tenantId: unknown, resource: string, options: MutationOptionsMock) => {
    const pending = { value: false }
    const variables: { value?: unknown } = {}
    const mutateAsync = async (input: unknown) => {
      pending.value = true
      variables.value = input
      try {
        const data = await options.mutationFn(input)
        await options.onSuccess?.(data, input)
        return data
      }
      catch (error) {
        await options.onError?.(error, input)
        throw error
      }
      finally {
        pending.value = false
      }
    }
    mocks.mutationCalls.push({ resource, pending, variables, mutateAsync })
    return { pending, variables, mutateAsync }
  },
}))

import {
  PASSWORD_SIGN_OUT_DELAY_MS,
  useProfileAvatarMutation,
  useProfileDetailsMutation,
  useProfilePasswordMutation,
} from './useProfileMutations'

describe('个人资料 Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutationCalls.length = 0
    mocks.changePassword.mockResolvedValue({})
    mocks.terminateSession.mockResolvedValue(undefined)
    mocks.updateAvatar.mockResolvedValue({ data: { avatar_url: '/avatar/new.png' } })
    mocks.updateProfile.mockResolvedValue({})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('资料保存 pending 时阻止重复提交并使用 profile 资源', async () => {
    let finishUpdate!: () => void
    mocks.updateProfile.mockImplementation(() => new Promise<void>((resolve) => {
      finishUpdate = resolve
    }))
    const onSaved = vi.fn()
    const details = useProfileDetailsMutation(key => key, onSaved)
    const profile: ProfileUpdateParams = {
      nickname: 'Alice',
      email: 'alice@example.com',
      phone: '13900000000',
    }
    const first = details.saveProfile(profile)
    await vi.waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledOnce())

    await details.saveProfile(profile)
    expect(mocks.updateProfile).toHaveBeenCalledOnce()

    finishUpdate()
    await first
    expect(mocks.mutationCalls[0]?.resource).toBe('profile')
    expect(onSaved).toHaveBeenCalledWith(profile)
  })

  it('头像响应不完整时抛错且不发布更新事件', async () => {
    const onUpdated = vi.fn()
    const avatar = useProfileAvatarMutation(key => key, onUpdated)
    mocks.updateAvatar.mockResolvedValueOnce({ data: undefined })

    await expect(avatar.uploadAvatar(new FormData())).rejects.toThrow(
      'account.avatarResponseMissing',
    )
    expect(mocks.mutationCalls[0]?.resource).toBe('profile')
    expect(onUpdated).not.toHaveBeenCalled()
  })

  it('修改密码期间保持 pending，并在延迟后安全退出', async () => {
    vi.useFakeTimers()
    const onPasswordChanged = vi.fn()
    const password = useProfilePasswordMutation(key => key, onPasswordChanged)
    const payload: PasswordChangeParams = {
      old_password: 'OldPassword1!',
      new_password: 'NewPassword1!',
    }
    const first = password.savePassword(payload)
    await vi.advanceTimersByTimeAsync(0)

    expect(mocks.changePassword).toHaveBeenCalledOnce()
    expect(password.submitting.value).toBe(true)
    await password.savePassword(payload)
    expect(mocks.changePassword).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(PASSWORD_SIGN_OUT_DELAY_MS)
    await first
    expect(onPasswordChanged).toHaveBeenCalledOnce()
    expect(mocks.terminateSession).toHaveBeenCalledOnce()
    expect(mocks.mutationCalls[0]?.resource).toBe('profile-password')
  })

  it('密码接口错误继续抛出且不会退出当前会话', async () => {
    const error = new Error('password failed')
    mocks.changePassword.mockRejectedValueOnce(error)
    const password = useProfilePasswordMutation(key => key, vi.fn())

    await expect(password.savePassword({
      old_password: 'OldPassword1!',
      new_password: 'NewPassword1!',
    })).rejects.toBe(error)
    expect(mocks.terminateSession).not.toHaveBeenCalled()
  })
})
