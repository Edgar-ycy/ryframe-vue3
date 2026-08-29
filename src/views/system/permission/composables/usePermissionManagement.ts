import { ElMessage } from 'element-plus'
import {
  deletePermission,
  getPermissionTree,
  syncApiPermissions,
  type PermissionSyncReport,
  type PermissionTreeNode,
} from '@/api/modules/permission'
import { refreshRuntimeAccessibleRoutes } from '@/app/navigation/runtime'
import { translate } from '@/i18n'
import type { Id } from '@/shared/http/types'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

export function usePermissionManagement() {
  const syncReport = ref<PermissionSyncReport | null>(null)
  const dialogVisible = ref(false)
  const editingPermission = ref<PermissionTreeNode | null>(null)
  const parentPermissionId = ref<Id>()
  const userStore = useUserStore()
  const pageLifecycle = useServerStatePageLifecycle(resetPageState)

  const permissionsQuery = useServerStateQuery<PermissionTreeNode[]>(
    () => pageLifecycle.pageActive.value && userStore.sessionStatus === 'authenticated',
    'permissions',
    () => ({ scope: 'tree' }),
    async (signal) => {
      const response = await getPermissionTree(undefined, signal)
      return response.data ?? []
    },
  )
  const tableData = permissionsQuery.data
  const loading = permissionsQuery.isFetching

  const deleteMutation = useServerStateMutation<void, PermissionTreeNode>('permissions', {
    mutationFn: async (permission) => {
      await deletePermission(permission.id)
    },
  })
  const syncMutation = useServerStateMutation<PermissionSyncReport, void>('permissions', {
    mutationFn: async () => {
      const response = await syncApiPermissions()
      if (!response.data) throw new Error(translate('system.permission.syncResponseMissing'))
      return response.data
    },
  })

  const deletingId = computed<Id | null>(() =>
    deleteMutation.pending.value ? (deleteMutation.variables.value?.id ?? null) : null,
  )
  const syncLoading = syncMutation.pending

  function resetPageState(): void {
    syncReport.value = null
    dialogVisible.value = false
    editingPermission.value = null
    parentPermissionId.value = undefined
  }

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
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('system.permission.deleteConfirm', { name: permission.name }),
          translate('system.common.warning'),
          {
            type: 'warning',
            confirmButtonText: translate('system.common.confirmDelete'),
          },
        ),
      ownsOperation,
    )
    if (!operation) return

    await deleteMutation.mutateAsync(permission)
    operation.apply(
      () => ElMessage.success(translate('system.common.deleteSuccess')),
      ownsOperation,
    )
    await Promise.all([fetchData(), refreshRuntimeAccessibleRoutes()])
  }

  async function handleSync(): Promise<void> {
    if (syncMutation.pending.value) return
    const operation = beginServerStatePageOperation()
    const ownsOperation = pageLifecycle.captureOwnership()
    const report = await syncMutation.mutateAsync()
    operation.apply(() => {
      syncReport.value = report
      ElMessage.success(translate('system.permission.syncSuccess', { count: report.created }))
    }, ownsOperation)
    await Promise.all([fetchData(), refreshRuntimeAccessibleRoutes()])
  }

  async function handleSaved(): Promise<void> {
    await Promise.all([fetchData(), refreshRuntimeAccessibleRoutes()])
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
