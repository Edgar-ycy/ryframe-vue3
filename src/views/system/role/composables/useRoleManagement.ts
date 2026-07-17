import {
  deleteRole,
  exportRole,
  listRole,
  type RoleQuery,
  type RoleRecord,
} from '@/api/modules/role'
import { getDeptTree, type DeptNode } from '@/api/modules/dept'
import { getPermissionTree, type PermissionTreeNode } from '@/api/modules/permission'
import { useDownload } from '@/hooks/useDownload'
import { usePermission } from '@/hooks/usePermission'
import { confirmAction } from '@/utils/confirmAction'

export function useRoleManagement() {
  const loading = ref(false)
  const tableData = ref<RoleRecord[]>([])
  const total = ref(0)
  const deptTree = ref<DeptNode[]>([])
  const permissionTree = ref<PermissionTreeNode[]>([])
  const queryParams = ref<RoleQuery>({
    page: 1,
    page_size: 10,
    name: '',
    code: '',
    status: '',
  })

  const roleDialogVisible = ref(false)
  const editingRole = ref<RoleRecord | null>(null)
  const permissionDialogVisible = ref(false)
  const permissionRole = ref<RoleRecord | null>(null)
  const dataScopeDialogVisible = ref(false)
  const dataScopeRole = ref<RoleRecord | null>(null)

  const { isAdmin } = usePermission()
  const { downloading: exportLoading, downloadBlob } = useDownload()

  async function fetchData(): Promise<void> {
    loading.value = true
    try {
      const response = await listRole(queryParams.value)
      tableData.value = response.rows ?? []
      total.value = response.total ?? 0
    }
    finally {
      loading.value = false
    }
  }

  async function loadDeptTree(): Promise<void> {
    const response = await getDeptTree()
    deptTree.value = response.data ?? []
  }

  async function loadPermissionTree(): Promise<void> {
    const response = await getPermissionTree()
    permissionTree.value = response.data ?? []
  }

  function handleSearch(): void {
    queryParams.value.page = 1
    void fetchData()
  }

  function handleReset(): void {
    queryParams.value = {
      page: 1,
      page_size: queryParams.value.page_size,
      name: '',
      code: '',
      status: '',
    }
    void fetchData()
  }

  function handleExport(): Promise<void> {
    return downloadBlob(() => exportRole(queryParams.value), { filename: '角色数据.xlsx' })
  }

  function isProtectedRole(role: RoleRecord): boolean {
    return (role.is_super === 1 || role.code === 'admin') && !isAdmin()
  }

  function guardRole(role: RoleRecord): boolean {
    if (!isProtectedRole(role)) return true
    ElMessage.warning('禁止操作超级管理员角色')
    return false
  }

  function handleAdd(): void {
    editingRole.value = null
    roleDialogVisible.value = true
  }

  function handleEdit(role: RoleRecord): void {
    if (!guardRole(role)) return
    editingRole.value = role
    roleDialogVisible.value = true
  }

  function handleAssignPermissions(role: RoleRecord): void {
    if (!guardRole(role)) return
    permissionRole.value = role
    permissionDialogVisible.value = true
  }

  function handleDataScope(role: RoleRecord): void {
    if (!guardRole(role)) return
    dataScopeRole.value = role
    dataScopeDialogVisible.value = true
  }

  async function handleDelete(role: RoleRecord): Promise<void> {
    if (!guardRole(role)) return
    const confirmed = await confirmAction(`确认删除角色"${role.name}"吗？`, '警告', {
      type: 'warning',
      confirmButtonText: '确认删除',
    })
    if (!confirmed) return

    await deleteRole(role.id)
    ElMessage.success('删除成功')
    await fetchData()
  }

  onMounted(() => {
    void Promise.allSettled([fetchData(), loadDeptTree(), loadPermissionTree()])
  })

  return {
    dataScopeDialogVisible,
    dataScopeRole,
    deptTree,
    editingRole,
    exportLoading,
    fetchData,
    handleAdd,
    handleAssignPermissions,
    handleDataScope,
    handleDelete,
    handleEdit,
    handleExport,
    handleReset,
    handleSearch,
    isProtectedRole,
    loading,
    permissionDialogVisible,
    permissionRole,
    permissionTree,
    queryParams,
    roleDialogVisible,
    tableData,
    total,
  }
}
