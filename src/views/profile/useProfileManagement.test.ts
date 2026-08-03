import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  queryCalls: [] as unknown[][],
  refetchProfile: vi.fn(),
  setLocale: vi.fn(),
  setPreferredLocale: vi.fn(),
  userStore: {
    avatar: 'old-avatar',
    email: 'old@example.com',
    nickname: 'Old Name',
    permissions: ['profile:read'],
    phone: '13800000000',
    preferredLocale: 'zh-CN',
    roles: ['user'],
    sessionStatus: 'authenticated',
    setPreferredLocale: vi.fn(),
    tenantId: 'tenant-a',
    userId: 'user-1',
    username: 'alice',
  },
}))

vi.mock('@/api/modules/auth', () => ({ getProfile: mocks.getProfile }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.userStore }))
vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ setLocale: mocks.setLocale }),
}))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    return {
      data: { value: undefined },
      isFetching: { value: false },
      refetch: mocks.refetchProfile,
    }
  },
}))

import { useProfileManagement } from './useProfileManagement'

describe('个人资料 Query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryCalls.length = 0
    mocks.getProfile.mockResolvedValue({
      data: {
        avatar: 'new-avatar',
        created_at: '2026-08-03T10:00:00Z',
        dept_name: '研发部',
        email: 'alice@example.com',
        nickname: 'Alice',
        permissions: ['profile:read'],
        phone: '13900000000',
        preferred_locale: 'zh-CN',
        roles: ['user'],
        status: '1',
        user_id: 'user-1',
        username: 'alice',
      },
    })
    mocks.refetchProfile.mockResolvedValue({})
    Object.assign(mocks.userStore, {
      avatar: 'old-avatar',
      email: 'old@example.com',
      nickname: 'Old Name',
      phone: '13800000000',
    })
  })

  it('使用租户资料资源键并把 AbortSignal 传给读取接口', async () => {
    useProfileManagement(key => key)
    const query = mocks.queryCalls[0]!
    const controller = new AbortController()

    expect((query[0] as () => string)()).toBe('tenant-a')
    expect((query[1] as () => boolean)()).toBe(true)
    expect(query[2]).toBe('profile')
    expect((query[3] as () => unknown)()).toEqual({ scope: 'self' })
    await (query[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.getProfile).toHaveBeenCalledWith(controller.signal)
  })

  it('资料和头像写入后同步当前用户并刷新资料', async () => {
    const management = useProfileManagement(key => key)

    await management.handleProfileSaved({
      nickname: 'Alice',
      email: 'alice@example.com',
      phone: '13900000000',
    })
    expect(mocks.userStore.nickname).toBe('Alice')
    expect(mocks.userStore.email).toBe('alice@example.com')

    await management.handleAvatarUpdated('new-avatar')
    expect(mocks.userStore.avatar).toBe('new-avatar')
    expect(mocks.refetchProfile).toHaveBeenCalledTimes(2)
  })

  it('缺少资料响应时抛出明确错误', async () => {
    mocks.getProfile.mockResolvedValueOnce({ data: undefined })
    useProfileManagement(key => key)
    const query = mocks.queryCalls[0]!

    await expect(
      (query[4] as (signal: AbortSignal) => Promise<unknown>)(new AbortController().signal),
    ).rejects.toThrow('profile.responseMissing')
  })
})
