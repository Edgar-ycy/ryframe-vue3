import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoleRecord } from '@/api/modules/role'

interface MutationOptionsMock {
  mutationFn: (input: unknown) => Promise<unknown>
  onError?: (error: unknown, input: unknown) => unknown
  onSuccess?: (data: unknown, input: unknown) => unknown
}

interface MutationHarnessEntry {
  resource: string
  options: MutationOptionsMock
  pending: { value: boolean }
  variables: { value?: unknown }
  mutateAsync: (variables: unknown) => Promise<unknown>
}

const mocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  deleteRole: vi.fn(),
  getDeptTree: vi.fn(),
  getPermissionTree: vi.fn(),
  listRole: vi.fn(),
  mutationCalls: [] as MutationHarnessEntry[],
  queryCalls: [] as unknown[][],
  refetchRoles: vi.fn(),
}))

vi.mock('@/api/modules/role', () => ({
  deleteRole: mocks.deleteRole,
  exportRole: vi.fn(),
  listRole: mocks.listRole,
}))
vi.mock('@/api/modules/dept', () => ({ getDeptTree: mocks.getDeptTree }))
vi.mock('@/api/modules/permission', () => ({
  getPermissionTree: mocks.getPermissionTree,
}))
vi.mock('@/hooks/useAsyncExport', () => ({
  useAsyncExport: () => ({ pending: { value: false }, exportAndDownload: vi.fn() }),
}))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ isAdmin: () => false }),
}))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a', sessionStatus: 'authenticated' }),
}))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: mocks.confirmAction }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    const resource = args[2]
    if (resource === 'roles') {
      return {
        data: { value: { items: [], total: 0 } },
        isFetching: { value: false },
        refetch: mocks.refetchRoles,
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

import { useRoleManagement } from './useRoleManagement'

function role(): RoleRecord {
  return {
    id: 'role-1',
    name: 'Operator',
    code: 'operator',
    sort: 1,
    status: '1',
    data_scope: '1',
    is_super: 0,
    created_at: '2026-08-01T00:00:00Z',
  } as RoleRecord
}

describe('角色管理 Query/Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryCalls.length = 0
    mocks.mutationCalls.length = 0
    mocks.confirmAction.mockResolvedValue(true)
    mocks.listRole.mockResolvedValue({ data: { items: [], total: 0 } })
    mocks.getDeptTree.mockResolvedValue({ data: [] })
    mocks.getPermissionTree.mockResolvedValue({ data: [] })
    mocks.deleteRole.mockResolvedValue({})
    mocks.refetchRoles.mockResolvedValue({})
  })

  it('使用租户资源键并把 AbortSignal 传给列表与两棵依赖树', async () => {
    useRoleManagement()
    const roles = mocks.queryCalls[0]!
    const departments = mocks.queryCalls[1]!
    const permissions = mocks.queryCalls[2]!
    const controller = new AbortController()

    expect((roles[0] as () => string)()).toBe('tenant-a')
    expect(roles[2]).toBe('roles')
    expect((roles[3] as () => unknown)()).toEqual({
      scope: 'list',
      filters: { page: 1, page_size: 10, name: '', code: '', status: '' },
    })
    await (roles[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)
    await (departments[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)
    await (permissions[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.listRole).toHaveBeenCalledWith(
      { page: 1, page_size: 10, name: '', code: '', status: '' },
      controller.signal,
    )
    expect(mocks.getDeptTree).toHaveBeenCalledWith(controller.signal)
    expect(mocks.getPermissionTree).toHaveBeenCalledWith(undefined, controller.signal)
  })

  it('删除 pending 时阻止重复提交并在角色资源失效后刷新列表', async () => {
    let finishDelete!: () => void
    mocks.deleteRole.mockImplementation(() => new Promise<void>((resolve) => {
      finishDelete = resolve
    }))
    const management = useRoleManagement()
    const target = role()
    const first = management.handleDelete(target)
    await vi.waitFor(() => expect(mocks.deleteRole).toHaveBeenCalledOnce())

    await management.handleDelete(target)
    expect(mocks.deleteRole).toHaveBeenCalledOnce()

    finishDelete()
    await first
    expect(mocks.mutationCalls[0]?.resource).toBe('roles')
    expect(mocks.refetchRoles).toHaveBeenCalledOnce()
  })

  it('删除 API 错误保持原对象并且不会错误刷新', async () => {
    const error = new Error('delete failed')
    mocks.deleteRole.mockRejectedValueOnce(error)
    const management = useRoleManagement()

    await expect(management.handleDelete(role())).rejects.toBe(error)
    expect(mocks.refetchRoles).not.toHaveBeenCalled()
  })
})
