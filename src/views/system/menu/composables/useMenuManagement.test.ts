import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuTreeNode } from '@/api/modules/menu'

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
  confirmAction: vi.fn(),
  deleteMenu: vi.fn(),
  getMenuTree: vi.fn(),
  getPermissionTree: vi.fn(),
  mutationCalls: [] as MutationHarnessEntry[],
  queryCalls: [] as unknown[][],
  refetchMenus: vi.fn(),
  updateMenu: vi.fn(),
}))

vi.mock('@/api/modules/menu', () => ({
  deleteMenu: mocks.deleteMenu,
  getMenuTree: mocks.getMenuTree,
  updateMenu: mocks.updateMenu,
}))
vi.mock('@/api/modules/permission', () => ({
  getPermissionTree: mocks.getPermissionTree,
}))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a', sessionStatus: 'authenticated' }),
}))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: mocks.confirmAction }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    if (args[2] === 'menus') {
      return {
        data: { value: [] },
        isFetching: { value: false },
        refetch: mocks.refetchMenus,
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
    mocks.mutationCalls.push({ resource, pending, variables, mutateAsync })
    return { pending, variables, mutateAsync }
  },
}))

import { useMenuManagement } from './useMenuManagement'

function menu(overrides: Partial<MenuTreeNode> = {}): MenuTreeNode {
  return {
    id: 'menu-1',
    name: 'Users',
    parent_id: null,
    menu_type: 'C',
    perm_id: 'permission-1',
    perm_code: 'system:user:list',
    route_key: 'system-user',
    icon: 'User',
    sort: 1,
    visible: true,
    status: '1',
    children: [],
    ...overrides,
  } as MenuTreeNode
}

describe('菜单管理 Query/Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryCalls.length = 0
    mocks.mutationCalls.length = 0
    mocks.confirmAction.mockResolvedValue(true)
    mocks.deleteMenu.mockResolvedValue({})
    mocks.getMenuTree.mockResolvedValue({ data: [] })
    mocks.getPermissionTree.mockResolvedValue({ data: [] })
    mocks.refetchMenus.mockResolvedValue({})
    mocks.updateMenu.mockResolvedValue({})
  })

  it('使用租户资源键并把 AbortSignal 传给菜单树和权限树', async () => {
    useMenuManagement()
    const menus = mocks.queryCalls[0]!
    const permissions = mocks.queryCalls[1]!
    const controller = new AbortController()

    expect((menus[0] as () => string)()).toBe('tenant-a')
    expect(menus[2]).toBe('menus')
    expect((menus[3] as () => unknown)()).toEqual({ scope: 'tree' })
    await (menus[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)
    await (permissions[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.getMenuTree).toHaveBeenCalledWith(controller.signal)
    expect(mocks.getPermissionTree).toHaveBeenCalledWith(undefined, controller.signal)
  })

  it('状态确认取消只回滚本地值而不会触发 API', async () => {
    mocks.confirmAction.mockResolvedValueOnce(false)
    const management = useMenuManagement()
    const target = menu({ status: '1' })

    await management.handleChangeStatus(target, '1')

    expect(target.status).toBe('0')
    expect(mocks.updateMenu).not.toHaveBeenCalled()
  })

  it('状态 API 错误保持原对象、回滚状态且不刷新', async () => {
    const error = new Error('update failed')
    mocks.updateMenu.mockRejectedValueOnce(error)
    const management = useMenuManagement()
    const target = menu({ status: '1' })

    await expect(management.handleChangeStatus(target, '1')).rejects.toBe(error)
    expect(target.status).toBe('0')
    expect(mocks.refetchMenus).not.toHaveBeenCalled()
  })

  it('删除 pending 时阻止重复提交并在菜单资源失效后刷新', async () => {
    let finishDelete!: () => void
    mocks.deleteMenu.mockImplementation(() => new Promise<void>((resolve) => {
      finishDelete = resolve
    }))
    const management = useMenuManagement()
    const target = menu()
    const first = management.handleDelete(target)
    await vi.waitFor(() => expect(mocks.deleteMenu).toHaveBeenCalledOnce())

    await management.handleDelete(target)
    expect(mocks.deleteMenu).toHaveBeenCalledOnce()

    finishDelete()
    await first
    expect(mocks.mutationCalls[1]?.resource).toBe('menus')
    expect(mocks.refetchMenus).toHaveBeenCalledOnce()
  })
})
