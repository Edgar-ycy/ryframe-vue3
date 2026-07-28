import {
  deleteMenu,
  getMenuTree,
  updateMenu,
  type MenuTreeNode,
  type MenuType,
  type MenuUpdateInput,
} from '@/api/modules/menu'
import { getPermissionTree } from '@/api/modules/permission'
import { usePermission } from '@/hooks/usePermission'
import { translate } from '@/i18n'
import type { Id } from '@/shared/http/types'
import { confirmAction } from '@/utils/confirmAction'
import { flattenPermissionOptions, type PermissionOption } from '../menuTree'

export function useMenuManagement() {
  const loading = ref(false)
  const tableData = ref<MenuTreeNode[]>([])
  const permissionOptions = ref<PermissionOption[]>([])
  const deletingId = ref<Id | null>(null)
  const dialogVisible = ref(false)
  const editingMenu = ref<MenuTreeNode | null>(null)
  const parentMenuId = ref<Id>()
  const { hasPermission } = usePermission()

  async function fetchData(): Promise<void> {
    loading.value = true
    try {
      const response = await getMenuTree()
      tableData.value = response.data ?? []
    }
    finally {
      loading.value = false
    }
  }

  async function loadPermissionOptions(): Promise<void> {
    const response = await getPermissionTree()
    permissionOptions.value = flattenPermissionOptions(response.data ?? [])
  }

  function menuTypeLabel(type: MenuType): string {
    return translate(({
      M: 'system.menu.directory',
      C: 'system.menu.menu',
      F: 'system.menu.button',
    } as const)[type])
  }

  function menuTypeTag(type: MenuType): '' | 'success' | 'warning' {
    return ({ M: '', C: 'success', F: 'warning' } as const)[type]
  }

  function permissionLabel(menu: MenuTreeNode): string {
    if (menu.perm_id == null) return '-'
    const permission = permissionOptions.value.find(option => option.id === menu.perm_id)
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
    const action = translate(
      status === '1' ? 'system.common.enable' : 'system.common.disable',
    )
    const confirmed = await confirmAction(
      translate('system.menu.statusChangeConfirm', { action, name: menu.name }),
      translate('system.common.prompt'),
      { type: 'warning' },
    )
    if (!confirmed) {
      menu.status = previousStatus
      return
    }

    try {
      await updateMenu(menu.id, toUpdateInput(menu, status))
      ElMessage.success(translate('system.common.actionSuccess', { action }))
      await fetchData()
    }
    catch (error) {
      menu.status = previousStatus
      throw error
    }
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
    const confirmed = await confirmAction(
      translate('system.menu.deleteConfirm', { name: menu.name }),
      translate('system.common.warning'),
      {
        type: 'warning',
        confirmButtonText: translate('system.common.confirmDelete'),
      },
    )
    if (!confirmed) return

    deletingId.value = menu.id
    try {
      await deleteMenu(menu.id)
      ElMessage.success(translate('system.common.deleteSuccess'))
      await fetchData()
    }
    finally {
      deletingId.value = null
    }
  }

  onMounted(() => {
    void Promise.allSettled([fetchData(), loadPermissionOptions()])
  })

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
    tableData,
  }
}
