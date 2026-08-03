import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PermissionSyncReport,
  PermissionTreeNode,
} from '@/api/modules/permission'

interface MutationOptionsMock {
  mutationFn: (input: unknown) => Promise<unknown>
  onError?: (error: unknown, input: unknown) => unknown
  onSuccess?: (data: unknown, input: unknown) => unknown
}

interface MutationHarnessEntry {
  resource: string
  pending: { value: boolean }
  variables: { value?: unknown }
  mutateAsync: (variables?: unknown) => Promise<unknown>
}

const mocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  deletePermission: vi.fn(),
  getPermissionTree: vi.fn(),
  mutationCalls: [] as MutationHarnessEntry[],
  queryCalls: [] as unknown[][],
  refetchPermissions: vi.fn(),
  refreshAccessibleRoutes: vi.fn(),
  syncApiPermissions: vi.fn(),
}))

vi.mock('@/api/modules/permission', () => ({
  deletePermission: mocks.deletePermission,
  getPermissionTree: mocks.getPermissionTree,
  syncApiPermissions: mocks.syncApiPermissions,
}))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/router', () => ({ refreshAccessibleRoutes: mocks.refreshAccessibleRoutes }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a', sessionStatus: 'authenticated' }),
}))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: mocks.confirmAction }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    return {
      data: { value: [] },
      isFetching: { value: false },
      refetch: mocks.refetchPermissions,
    }
  },
}))
vi.mock('@/shared/query/useTenantMutation', () => ({
  useTenantMutation: (_tenantId: unknown, resource: string, options: MutationOptionsMock) => {
    const pending = { value: false }
    const variables: { value?: unknown } = {}
    const mutateAsync = async (input?: unknown) => {
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

import { usePermissionManagement } from './usePermissionManagement'

function permission(): PermissionTreeNode {
  return {
    id: 'permission-1',
    name: 'User list',
    code: 'system:user:list',
    parent_id: null,
    perm_type: 'api',
    icon: null,
    sort: 1,
    status: '1',
    children: [],
  } as PermissionTreeNode
}

function report(): PermissionSyncReport {
  return {
    scanned: 3,
    existing: 2,
    created: 1,
    missing: ['system:user:list'],
  }
}

describe('权限管理 Query/Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryCalls.length = 0
    mocks.mutationCalls.length = 0
    mocks.confirmAction.mockResolvedValue(true)
    mocks.deletePermission.mockResolvedValue({})
    mocks.getPermissionTree.mockResolvedValue({ data: [] })
    mocks.refetchPermissions.mockResolvedValue({})
    mocks.refreshAccessibleRoutes.mockResolvedValue(undefined)
    mocks.syncApiPermissions.mockResolvedValue({ data: report() })
  })

  it('使用租户权限树键并把 AbortSignal 传给 API', async () => {
    usePermissionManagement()
    const tree = mocks.queryCalls[0]!
    const controller = new AbortController()

    expect((tree[0] as () => string)()).toBe('tenant-a')
    expect(tree[2]).toBe('permissions')
    expect((tree[3] as () => unknown)()).toEqual({ scope: 'tree' })
    await (tree[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.getPermissionTree).toHaveBeenCalledWith(undefined, controller.signal)
  })

  it('删除 pending 时阻止重复提交并在资源失效后刷新权限树和路由', async () => {
    let finishDelete!: () => void
    mocks.deletePermission.mockImplementation(() => new Promise<void>((resolve) => {
      finishDelete = resolve
    }))
    const management = usePermissionManagement()
    const target = permission()
    const first = management.handleDelete(target)
    await vi.waitFor(() => expect(mocks.deletePermission).toHaveBeenCalledOnce())

    await management.handleDelete(target)
    expect(mocks.deletePermission).toHaveBeenCalledOnce()

    finishDelete()
    await first
    expect(mocks.mutationCalls[0]?.resource).toBe('permissions')
    expect(mocks.refetchPermissions).toHaveBeenCalledOnce()
    expect(mocks.refreshAccessibleRoutes).toHaveBeenCalledOnce()
  })

  it('同步成功后保留报告并刷新权限状态', async () => {
    const management = usePermissionManagement()

    await management.handleSync()

    expect(management.syncReport.value).toEqual(report())
    expect(mocks.mutationCalls[1]?.resource).toBe('permissions')
    expect(mocks.refetchPermissions).toHaveBeenCalledOnce()
    expect(mocks.refreshAccessibleRoutes).toHaveBeenCalledOnce()
  })

  it('删除 API 错误保持原对象并且不会错误刷新', async () => {
    const error = new Error('delete failed')
    mocks.deletePermission.mockRejectedValueOnce(error)
    const management = usePermissionManagement()

    await expect(management.handleDelete(permission())).rejects.toBe(error)
    expect(mocks.refetchPermissions).not.toHaveBeenCalled()
    expect(mocks.refreshAccessibleRoutes).not.toHaveBeenCalled()
  })
})
