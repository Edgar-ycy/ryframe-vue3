import { ElMessage } from 'element-plus'
import {
  deleteRole,
  exportRole,
  listRole,
  type RoleQuery,
  type RoleRecord,
} from '@/api/modules/role'
import { getDeptTree, type DeptNode } from '@/api/modules/dept'
import { getPermissionTree, type PermissionTreeNode } from '@/api/modules/permission'
import { confirmAndSubmitExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { usePermission } from '@/hooks/usePermission'
import { translate } from '@/i18n'
import { emptyPageResponse, type Id, type PageResponse } from '@/shared/http/types'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

export function useRoleManagement() {
  const initialQuery: RoleQuery = {
    page: 1,
    page_size: 10,
    name: '',
    code: '',
    status: '',
  }
  const {
    appliedQuery: appliedQueryParams,
    applyDraft,
    clearSuccessfulQuery,
    draftQuery: queryParams,
    hasSuccessfulQuery: canExport,
    lastSuccessfulQuery,
    refreshApplied,
    runAppliedQuery,
  } = useAppliedListQuery(initialQuery)

  const roleDialogVisible = ref(false)
  const editingRole = ref<RoleRecord | null>(null)
  const permissionDialogVisible = ref(false)
  const permissionRole = ref<RoleRecord | null>(null)
  const dataScopeDialogVisible = ref(false)
  const dataScopeRole = ref<RoleRecord | null>(null)

  const { isSuperAdmin } = usePermission()
  const userStore = useUserStore()
  const { pending: exportLoading, submitExport } = useExportJobRequest()
  const pageLifecycle = useServerStatePageLifecycle(resetPageState)
  const authenticated = () =>
    pageLifecycle.pageActive.value && userStore.sessionStatus === 'authenticated'

  const rolesQuery = useServerStateQuery<PageResponse<RoleRecord>>(
    authenticated,
    'roles',
    () => ({ scope: 'list', filters: { ...appliedQueryParams.value } }),
    (signal) =>
      runAppliedQuery(signal, async (query, requestSignal) => {
        const params = { ...query }
        const response = await listRole(params, requestSignal)
        return response.data ?? emptyPageResponse<RoleRecord>(params)
      }),
  )
  const departmentsQuery = useServerStateQuery<DeptNode[]>(
    authenticated,
    'departments',
    () => ({ scope: 'tree' }),
    async (signal) => {
      const response = await getDeptTree(signal)
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

  const tableResponse = rolesQuery.data
  const loading = rolesQuery.isFetching
  const deptTree = departmentsQuery.data
  const permissionTree = permissionsQuery.data

  const deleteMutation = useServerStateMutation<void, RoleRecord>('roles', {
    mutationFn: async (role) => {
      await deleteRole(role.id)
    },
  })
  const deletingId = computed<Id | null>(() =>
    deleteMutation.pending.value ? (deleteMutation.variables.value?.id ?? null) : null,
  )

  function resetPageState(): void {
    clearSuccessfulQuery()
    roleDialogVisible.value = false
    editingRole.value = null
    permissionDialogVisible.value = false
    permissionRole.value = null
    dataScopeDialogVisible.value = false
    dataScopeRole.value = null
  }

  async function fetchData(): Promise<void> {
    if (applyDraft()) return
    await refreshData()
  }

  async function refreshData(): Promise<void> {
    await refreshApplied(async () => {
      await rolesQuery.refetch({ throwOnError: true })
    })
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

  async function handleExport(): Promise<void> {
    const successfulQuery = lastSuccessfulQuery.value
    if (!successfulQuery) {
      ElMessage.warning(translate('system.common.exportRequiresSuccessfulQuery'))
      return
    }
    const intent = normalizeExportIntent('roles', successfulQuery)
    await confirmAndSubmitExportIntent(
      intent,
      (scope) =>
        submitExport(scope, intent.signature, (idempotencyKey, signal) =>
          exportRole(intent.filter, idempotencyKey, signal, intent.isEmpty),
        ),
      { ownsOperation: pageLifecycle.captureOwnership() },
    )
  }

  function isProtectedRole(role: RoleRecord): boolean {
    return role.is_super === 1 && !isSuperAdmin()
  }

  function guardRole(role: RoleRecord): boolean {
    if (!isProtectedRole(role)) return true
    ElMessage.warning(translate('system.role.superRoleForbidden'))
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
    if (deleteMutation.pending.value || !guardRole(role)) return
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('system.role.deleteConfirm', { name: role.name }),
          translate('system.common.warning'),
          {
            type: 'warning',
            confirmButtonText: translate('system.common.confirmDelete'),
          },
        ),
      ownsOperation,
    )
    if (!operation) return

    await deleteMutation.mutateAsync(role)
    operation.apply(
      () => ElMessage.success(translate('system.common.deleteSuccess')),
      ownsOperation,
    )
    await refreshData()
  }

  return {
    canExport,
    dataScopeDialogVisible,
    dataScopeRole,
    deletingId,
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
    refreshData,
    roleDialogVisible,
    tableResponse,
  }
}
