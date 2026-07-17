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
    return ({ M: '目录', C: '菜单', F: '按钮' })[type]
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
    const action = status === '1' ? '启用' : '停用'
    const confirmed = await confirmAction(`确认要${action}菜单"${menu.name}"吗？`, '提示', {
      type: 'warning',
    })
    if (!confirmed) {
      menu.status = previousStatus
      return
    }

    try {
      await updateMenu(menu.id, toUpdateInput(menu, status))
      ElMessage.success(`${action}成功`)
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
      `确认删除菜单"${menu.name}"吗？存在子菜单时需先处理子菜单。`,
      '警告',
      { type: 'warning', confirmButtonText: '确认删除' },
    )
    if (!confirmed) return

    deletingId.value = menu.id
    try {
      await deleteMenu(menu.id)
      ElMessage.success('删除成功')
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
