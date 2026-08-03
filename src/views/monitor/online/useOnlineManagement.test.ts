import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OnlineUserRecord } from '@/api/modules/monitor'

interface MutationOptionsMock {
  mutationFn: (input: OnlineUserRecord) => Promise<unknown>
  onError?: (error: unknown, input: OnlineUserRecord) => unknown
  onSuccess?: (data: unknown, input: OnlineUserRecord) => unknown
}

interface MutationHarnessEntry {
  resource: string
  pending: { value: boolean }
  variables: { value?: OnlineUserRecord }
  mutateAsync: (variables: OnlineUserRecord) => Promise<unknown>
}

const mocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  forceLogout: vi.fn(),
  mutationCalls: [] as MutationHarnessEntry[],
  queryCalls: [] as unknown[][],
  refetchOnlineUsers: vi.fn(),
  listOnlineUser: vi.fn(),
}))

vi.mock('@/api/modules/monitor', () => ({
  forceLogout: mocks.forceLogout,
  listOnlineUser: mocks.listOnlineUser,
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a', sessionStatus: 'authenticated' }),
}))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: mocks.confirmAction }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    return {
      data: {
        value: {
          items: [],
          page: 1,
          page_size: 10,
          total: 0,
          total_pages: 0,
          max_page_size: 100,
        },
      },
      isFetching: { value: false },
      refetch: mocks.refetchOnlineUsers,
    }
  },
}))
vi.mock('@/shared/query/useTenantMutation', () => ({
  useTenantMutation: (
    _tenantId: unknown,
    resource: string,
    options: MutationOptionsMock,
  ) => {
    const pending = { value: false }
    const variables: { value?: OnlineUserRecord } = {}
    const mutateAsync = async (input: OnlineUserRecord) => {
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

import { useOnlineManagement } from './useOnlineManagement'

function onlineUser(): OnlineUserRecord {
  return {
    browser: 'Chrome',
    dept_name: '研发部',
    ipaddr: '127.0.0.1',
    last_access_time: '2026-08-03T10:01:00Z',
    login_location: '本地',
    login_time: '2026-08-03T10:00:00Z',
    os: 'Windows',
    sid: 'session-1',
    username: 'alice',
  }
}

describe('在线用户 Query/Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutationCalls.length = 0
    mocks.queryCalls.length = 0
    mocks.confirmAction.mockResolvedValue(true)
    mocks.forceLogout.mockResolvedValue({})
    mocks.listOnlineUser.mockResolvedValue({ data: undefined })
    mocks.refetchOnlineUsers.mockResolvedValue({})
  })

  it('使用租户资源键并把 AbortSignal 传给在线用户读取', async () => {
    useOnlineManagement(key => key)
    const query = mocks.queryCalls[0]!
    const controller = new AbortController()

    expect((query[0] as () => string)()).toBe('tenant-a')
    expect((query[1] as () => boolean)()).toBe(true)
    expect(query[2]).toBe('monitor-online-users')
    expect((query[3] as () => unknown)()).toEqual({
      scope: 'list',
      filters: { page: 1, page_size: 10, username: '', ipaddr: '' },
    })
    await (query[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.listOnlineUser).toHaveBeenCalledWith(
      { page: 1, page_size: 10, username: '', ipaddr: '' },
      controller.signal,
    )
    expect(mocks.mutationCalls[0]?.resource).toBe('monitor-online-users')
  })

  it('只在提交筛选条件后切换查询键', async () => {
    const management = useOnlineManagement(key => key)
    const query = mocks.queryCalls[0]!

    management.queryParams.value.username = 'alice'
    await management.fetchData()

    expect((query[3] as () => unknown)()).toEqual({
      scope: 'list',
      filters: { page: 1, page_size: 10, username: 'alice', ipaddr: '' },
    })
    expect(mocks.refetchOnlineUsers).not.toHaveBeenCalled()

    await management.fetchData()
    expect(mocks.refetchOnlineUsers).toHaveBeenCalledOnce()
  })

  it('强退 pending 时阻止重复提交并在成功后刷新', async () => {
    let finishLogout!: () => void
    mocks.forceLogout.mockImplementation(() => new Promise<void>((resolve) => {
      finishLogout = resolve
    }))
    const management = useOnlineManagement(key => key)
    const target = onlineUser()
    const first = management.handleForceLogout(target)
    await vi.waitFor(() => expect(mocks.forceLogout).toHaveBeenCalledOnce())

    await management.handleForceLogout(target)
    expect(mocks.confirmAction).toHaveBeenCalledOnce()
    expect(mocks.forceLogout).toHaveBeenCalledOnce()

    finishLogout()
    await first
    expect(mocks.refetchOnlineUsers).toHaveBeenCalledOnce()
  })

  it('确认取消不调用接口，真实接口错误继续抛出', async () => {
    const management = useOnlineManagement(key => key)
    const target = onlineUser()
    mocks.confirmAction.mockResolvedValueOnce(false)

    await management.handleForceLogout(target)
    expect(mocks.forceLogout).not.toHaveBeenCalled()

    const error = new Error('force logout failed')
    mocks.confirmAction.mockResolvedValueOnce(true)
    mocks.forceLogout.mockRejectedValueOnce(error)
    await expect(management.handleForceLogout(target)).rejects.toBe(error)
    expect(mocks.refetchOnlineUsers).not.toHaveBeenCalled()
  })
})
