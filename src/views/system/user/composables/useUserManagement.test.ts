import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserRecord } from '@/api/modules/user'

interface MutationOptionsMock {
  mutationFn: (input: unknown) => Promise<unknown>
  onError?: (error: unknown, input: unknown) => unknown
  onSuccess?: (data: unknown, input: unknown) => unknown
}

const mocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  deleteUser: vi.fn(),
  listUser: vi.fn(),
  getDeptTree: vi.fn(),
  queryCalls: [] as unknown[][],
  mutationCalls: [] as Array<{
    resource: string
    options: MutationOptionsMock
    pending: { value: boolean }
    variables: { value?: unknown }
    mutateAsync: (variables: unknown) => Promise<unknown>
  }>,
  refetchUsers: vi.fn(),
  updateUserStatus: vi.fn(),
}))

vi.mock('@/api/modules/user', () => ({
  deleteUser: mocks.deleteUser,
  exportUser: vi.fn(),
  listUser: mocks.listUser,
  updateUserStatus: mocks.updateUserStatus,
}))
vi.mock('@/api/modules/dept', () => ({ getDeptTree: mocks.getDeptTree }))
vi.mock('@/hooks/useAsyncExport', () => ({
  useAsyncExport: () => ({ pending: { value: false }, exportAndDownload: vi.fn() }),
}))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    tenantId: 'tenant-a',
    sessionStatus: 'authenticated',
    userId: 'current-user',
    isSuper: false,
  }),
}))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: mocks.confirmAction }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    const resource = args[2]
    if (resource === 'users') {
      return {
        data: { value: { items: [], total: 0 } },
        isFetching: { value: false },
        refetch: mocks.refetchUsers,
      }
    }
    return { data: { value: [] }, isFetching: { value: false }, refetch: vi.fn() }
  },
}))
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
    mocks.mutationCalls.push({ resource, options, pending, variables, mutateAsync })
    return { pending, variables, mutateAsync }
  },
}))

import { useUserManagement } from './useUserManagement'

function user(): UserRecord {
  return {
    id: 'user-1',
    username: 'alice',
    nickname: 'Alice',
    email: '',
    phone: '',
    dept_id: null,
    dept_name: '',
    status: '1',
    created_at: '2026-08-01T00:00:00Z',
  } as UserRecord
}

describe('用户管理 Query/Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryCalls.length = 0
    mocks.mutationCalls.length = 0
    mocks.confirmAction.mockResolvedValue(true)
    mocks.listUser.mockResolvedValue({ data: { items: [], total: 0 } })
    mocks.getDeptTree.mockResolvedValue({ data: [] })
    mocks.refetchUsers.mockResolvedValue({})
  })

  it('使用租户资源键并把取消信号传给列表和部门树 API', async () => {
    useUserManagement()
    const users = mocks.queryCalls[0]!
    const departments = mocks.queryCalls[1]!
    const controller = new AbortController()

    expect((users[0] as () => string)()).toBe('tenant-a')
    expect(users[2]).toBe('users')
    expect((users[3] as () => unknown)()).toEqual({
      scope: 'list',
      filters: { page: 1, page_size: 10 },
    })
    await (users[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)
    await (departments[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.listUser).toHaveBeenCalledWith({ page: 1, page_size: 10 }, controller.signal)
    expect(mocks.getDeptTree).toHaveBeenCalledWith(controller.signal)
  })

  it('删除 pending 时阻止重复提交并在成功后刷新当前列表', async () => {
    let finishDelete!: () => void
    mocks.deleteUser.mockImplementation(() => new Promise<void>((resolve) => {
      finishDelete = resolve
    }))
    const management = useUserManagement()
    const target = user()
    const first = management.handleDelete(target)
    await vi.waitFor(() => expect(mocks.deleteUser).toHaveBeenCalledOnce())

    await management.handleDelete(target)
    expect(mocks.deleteUser).toHaveBeenCalledOnce()

    finishDelete()
    await first
    expect(mocks.refetchUsers).toHaveBeenCalledOnce()
    expect(mocks.mutationCalls[1]?.resource).toBe('users')
  })
})
