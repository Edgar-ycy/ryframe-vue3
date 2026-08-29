import { ElMessage } from 'element-plus'
import type { TagProps } from 'element-plus'
import {
  deleteMenu,
  getMenuTree,
  updateMenu,
  type MenuTreeNode,
  type MenuType,
  type MenuUpdateInput,
} from '@/api/modules/menu'
import { getPermissionTree, type PermissionTreeNode } from '@/api/modules/permission'
import { usePermission } from '@/hooks/usePermission'
import { translate } from '@/i18n'
import type { Id } from '@/shared/http/types'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import { flattenPermissionOptions } from '../menuTree'

interface StatusCommand {
  menu: MenuTreeNode
  previousStatus: string
  status: string
}

export function useMenuManagement() {
  const dialogVisible = ref(false)
  const editingMenu = ref<MenuTreeNode | null>(null)
  const parentMenuId = ref<Id>()
  const { hasPermission } = usePermission()
  const userStore = useUserStore()
  const pageLifecycle = useServerStatePageLifecycle(resetPageState)
  const authenticated = () =>
    pageLifecycle.pageActive.value && userStore.sessionStatus === 'authenticated'

  const menusQuery = useServerStateQuery<MenuTreeNode[]>(
    authenticated,
    'menus',
    () => ({ scope: 'tree' }),
    async (signal) => {
      const response = await getMenuTree(signal)
      return response.data ?? []
    },
  )
  const permissionsQuery = useServerStateQuery<PermissionTreeNode[]>(
    authenticated,
    'permissions',
    () => ({ scope: 'tree' }),
    async (signal) => {
      const response = await getPermissionTree(undefined, signal)
      return response.data ?? []
    },
  )
  const tableData = menusQuery.data
  const permissionOptions = computed(() =>
    flattenPermissionOptions(permissionsQuery.data.value ?? []),
  )
  const loading = menusQuery.isFetching

  const statusMutation = useServerStateMutation<void, StatusCommand>('menus', {
    mutationFn: async (variables) => {
      await updateMenu(variables.menu.id, toUpdateInput(variables.menu, variables.status))
    },
    onError: (_error, variables) => {
      variables.menu.status = variables.previousStatus
    },
  })
  const deleteMutation = useServerStateMutation<void, MenuTreeNode>('menus', {
    mutationFn: async (menu) => {
      await deleteMenu(menu.id)
    },
  })
  const deletingId = computed<Id | null>(() =>
    deleteMutation.pending.value ? (deleteMutation.variables.value?.id ?? null) : null,
  )
  const statusUpdatingId = computed<Id | null>(() =>
    statusMutation.pending.value ? (statusMutation.variables.value?.menu.id ?? null) : null,
  )

  function resetPageState(): void {
    dialogVisible.value = false
    editingMenu.value = null
    parentMenuId.value = undefined
  }

  async function fetchData(): Promise<void> {
    await menusQuery.refetch({ throwOnError: true })
  }

  function menuTypeLabel(type: MenuType): string {
    return translate(
      (
        {
          M: 'system.menu.directory',
          C: 'system.menu.menu',
          F: 'system.menu.button',
        } as const
      )[type],
    )
  }

  function menuTypeTag(type: MenuType): TagProps['type'] | undefined {
    // 目录不使用彩色标签，返回 undefined 让 el-tag 走默认样式，避免空字符串 prop 告警。
    return ({ M: undefined, C: 'success', F: 'warning' } as const)[type]
  }

  function permissionLabel(menu: MenuTreeNode): string {
    if (menu.perm_id == null) return '-'
    const permission = permissionOptions.value.find((option) => option.id === menu.perm_id)
    return permission ? `${permission.name} (${permission.code})` : (menu.perm_code ?? '-')
  }

  function toUpdateInput(menu: MenuTreeNode, status: string): MenuUpdateInput {
    return {
      name: menu.name,
      parent_id: menu.parent_id ?? undefined,
      menu_type: menu.menu_type,
      perm_id: menu.perm_id ?? undefined,
      route_key: menu.route_key ?? undefined,
      icon: menu.icon ?? undefined,
      sort: menu.sort,
      visible: menu.visible,
      status,
    }
  }

  async function handleChangeStatus(menu: MenuTreeNode, status: string): Promise<void> {
    const previousStatus = status === '1' ? '0' : '1'
    if (statusMutation.pending.value) {
      menu.status = previousStatus
      return
    }
    const action = translate(status === '1' ? 'system.common.enable' : 'system.common.disable')
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('system.menu.statusChangeConfirm', { action, name: menu.name }),
          translate('system.common.prompt'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation) {
      menu.status = previousStatus
      return
    }

    await statusMutation.mutateAsync({ menu, previousStatus, status })
    operation.apply(
      () => ElMessage.success(translate('system.common.actionSuccess', { action })),
      ownsOperation,
    )
    await menusQuery.refetch({ throwOnError: true })
  }

  function handleAdd(parentId?: Id): void {
    editingMenu.value = null
    parentMenuId.value = parentId
    dialogVisible.value = true
  }

  function handleEdit(menu: MenuTreeNode): void {
    editingMenu.value = menu
    parentMenuId.value = undefined
    dialogVisible.value = true
  }

  async function handleDelete(menu: MenuTreeNode): Promise<void> {
    if (deleteMutation.pending.value) return
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('system.menu.deleteConfirm', { name: menu.name }),
          translate('system.common.warning'),
          {
            type: 'warning',
            confirmButtonText: translate('system.common.confirmDelete'),
          },
        ),
      ownsOperation,
    )
    if (!operation) return

    await deleteMutation.mutateAsync(menu)
    operation.apply(
      () => ElMessage.success(translate('system.common.deleteSuccess')),
      ownsOperation,
    )
    await menusQuery.refetch({ throwOnError: true })
  }

  return {
    deletingId,
    dialogVisible,
    editingMenu,
    fetchData,
    handleAdd,
    handleChangeStatus,
    handleDelete,
    handleEdit,
    hasPermission,
    loading,
    menuTypeLabel,
    menuTypeTag,
    parentMenuId,
    permissionLabel,
    permissionOptions,
    statusUpdatingId,
    tableData,
  }
}
