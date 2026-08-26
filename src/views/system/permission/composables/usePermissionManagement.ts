import {
  deletePermission,
  getPermissionTree,
  syncApiPermissions,
  type PermissionSyncReport,
  type PermissionTreeNode,
} from '@/api/modules/permission'
import { translate } from '@/i18n'
import { refreshAccessibleRoutes } from '@/router'
import type { Id } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

export function usePermissionManagement() {
  const syncReport = ref<PermissionSyncReport | null>(null)
  const dialogVisible = ref(false)
  const editingPermission = ref<PermissionTreeNode | null>(null)
  const parentPermissionId = ref<Id>()
  const userStore = useUserStore()

  const permissionsQuery = useTenantQuery<PermissionTreeNode[]>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated',
    'permissions',
    () => ({ scope: 'tree' }),
    async (signal) => {
      const response = await getPermissionTree(undefined, signal)
      return response.data ?? []
    },
  )
  const tableData = permissionsQuery.data
  const loading = permissionsQuery.isFetching

  const deleteMutation = useTenantMutation<void, PermissionTreeNode>(
    () => userStore.tenantId,
    'permissions',
    {
      mutationFn: async (permission) => {
        await deletePermission(permission.id)
      },
      onSuccess: () => {
        ElMessage.success(translate('system.common.deleteSuccess'))
      },
    },
  )
  const syncMutation = useTenantMutation<PermissionSyncReport, void>(
    () => userStore.tenantId,
    'permissions',
    {
      mutationFn: async () => {
        const response = await syncApiPermissions()
        if (!response.data) throw new Error(translate('system.permission.syncResponseMissing'))
        return response.data
      },
      onSuccess: (report) => {
        syncReport.value = report
        ElMessage.success(translate('system.permission.syncSuccess', { count: report.created }))
      },
    },
  )

  const deletingId = computed<Id | null>(() =>
    deleteMutation.pending.value ? (deleteMutation.variables.value?.id ?? null) : null,
  )
  const syncLoading = syncMutation.pending
  function syncReportTitle(): string {
    if (!syncReport.value) return ''
    return translate(
      syncReport.value.created > 0 ? 'system.permission.syncDone' : 'system.permission.syncNoNew',
    )
  }
  const parentTree = computed<PermissionTreeNode[]>(() => [
    {
      id: '0',
      name: translate('system.permission.root'),
      code: '',
      perm_type: 'menu',
      sort: 0,
      status: '1',
      children: tableData.value ?? [],
    },
  ])

  async function fetchData(): Promise<void> {
    await permissionsQuery.refetch({ throwOnError: true })
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
    if (deleteMutation.pending.value) return
    const confirmed = await confirmAction(
      translate('system.permission.deleteConfirm', { name: permission.name }),
      translate('system.common.warning'),
      {
        type: 'warning',
        confirmButtonText: translate('system.common.confirmDelete'),
      },
    )
    if (!confirmed) return

    await deleteMutation.mutateAsync(permission)
    await Promise.all([fetchData(), refreshAccessibleRoutes()])
  }

  async function handleSync(): Promise<void> {
    if (syncMutation.pending.value) return
    await syncMutation.mutateAsync()
    await Promise.all([fetchData(), refreshAccessibleRoutes()])
  }

  async function handleSaved(): Promise<void> {
    await Promise.all([fetchData(), refreshAccessibleRoutes()])
  }

  return {
    deletingId,
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
