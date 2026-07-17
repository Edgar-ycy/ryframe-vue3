import {
  deletePermission,
  getPermissionTree,
  syncApiPermissions,
  type PermissionSyncReport,
  type PermissionTreeNode,
} from '@/api/modules/permission'
import { refreshAccessibleRoutes } from '@/router'
import type { Id } from '@/shared/http/types'
import { confirmAction } from '@/utils/confirmAction'

export function usePermissionManagement() {
  const loading = ref(false)
  const syncLoading = ref(false)
  const tableData = ref<PermissionTreeNode[]>([])
  const syncReport = ref<PermissionSyncReport | null>(null)
  const dialogVisible = ref(false)
  const editingPermission = ref<PermissionTreeNode | null>(null)
  const parentPermissionId = ref<Id>()

  const syncReportTitle = computed(() => {
    if (!syncReport.value) return ''
    return syncReport.value.created > 0 ? '权限同步完成' : '权限同步完成，未发现新增项'
  })
  const parentTree = computed<PermissionTreeNode[]>(() => [{
    id: '0',
    name: '根权限',
    code: '',
    perm_type: 'menu',
    sort: 0,
    status: '1',
    children: tableData.value,
  }])

  async function fetchData(): Promise<void> {
    loading.value = true
    try {
      const response = await getPermissionTree()
      tableData.value = response.data ?? []
    }
    finally {
      loading.value = false
    }
  }

  function handleAdd(parentId?: Id): void {
    editingPermission.value = null
    parentPermissionId.value = parentId
    dialogVisible.value = true
  }

  function handleEdit(permission: PermissionTreeNode): void {
    editingPermission.value = permission
    parentPermissionId.value = undefined
    dialogVisible.value = true
  }

  async function handleDelete(permission: PermissionTreeNode): Promise<void> {
    const confirmed = await confirmAction(`确认删除权限"${permission.name}"吗？`, '警告', {
      type: 'warning',
      confirmButtonText: '确认删除',
    })
    if (!confirmed) return

    await deletePermission(permission.id)
    ElMessage.success('删除成功')
    await fetchData()
    await refreshAccessibleRoutes()
  }

  async function handleSync(): Promise<void> {
    syncLoading.value = true
    try {
      const response = await syncApiPermissions()
      if (!response.data) throw new Error('权限同步响应缺少数据')
      syncReport.value = response.data
      ElMessage.success(`同步成功，新增 ${response.data.created} 条`)
      await fetchData()
      await refreshAccessibleRoutes()
    }
    finally {
      syncLoading.value = false
    }
  }

  async function handleSaved(): Promise<void> {
    await fetchData()
    await refreshAccessibleRoutes()
  }

  onMounted(() => {
    void fetchData()
  })

  return {
    dialogVisible,
    editingPermission,
    fetchData,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSaved,
    handleSync,
    loading,
    parentPermissionId,
    parentTree,
    syncLoading,
    syncReport,
    syncReportTitle,
    tableData,
  }
}
