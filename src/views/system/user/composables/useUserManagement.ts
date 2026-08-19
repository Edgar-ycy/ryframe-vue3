import {
  deleteUser,
  exportUser,
  listUser,
  updateUserStatus,
  type UserQuery,
  type UserManageableStatus,
  type UserRecord,
  type UserStatus,
} from '@/api/modules/user'
import { getDeptTree, type DeptNode } from '@/api/modules/dept'
import { confirmExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { usePermission } from '@/hooks/usePermission'
import { useUserStore } from '@/stores/user'
import { translate } from '@/i18n'
import { emptyPageResponse, type Id, type PageResponse } from '@/shared/http/types'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { confirmAction } from '@/utils/confirmAction'

const USER_STATUS_KEYS: Record<UserStatus, string> = {
  0: 'system.common.disabled',
  1: 'system.common.normal',
  pending_activation: 'system.user.pendingActivation',
}

interface StatusCommand {
  action: string
  previousStatus: UserManageableStatus
  row: UserRecord
  status: UserManageableStatus
}

export function useUserManagement() {
  const selectedDeptId = ref<Id>()
  const selectedDeptName = ref('')
  const {
    appliedQuery: appliedQueryParams,
    applyDraft,
    clearSuccessfulQuery,
    draftQuery: queryParams,
    hasSuccessfulQuery: canExport,
    lastSuccessfulQuery,
    refreshApplied,
    runAppliedQuery,
  } = useAppliedListQuery<UserQuery>({ page: 1, page_size: 10 })

  const userDialogVisible = ref(false)
  const editingUser = ref<UserRecord | null>(null)
  const passwordDialogVisible = ref(false)
  const passwordResetUserId = ref<Id | null>(null)
  const roleDialogVisible = ref(false)
  const roleEditingUser = ref<UserRecord | null>(null)

  const { hasPermission } = usePermission()
  const userStore = useUserStore()
  const { pending: exportLoading, submitExport } = useExportJobRequest()
  const authenticated = () => userStore.sessionStatus === 'authenticated'

  watch(
    () => [userStore.tenantId, userStore.userId] as const,
    () => clearSuccessfulQuery(),
    { flush: 'sync' },
  )

  const usersQuery = useTenantQuery<PageResponse<UserRecord>>(
    () => userStore.tenantId,
    authenticated,
    'users',
    () => ({ scope: 'list', filters: { ...appliedQueryParams.value } }),
    signal => runAppliedQuery(signal, async (query, requestSignal) => {
      const params = { ...query }
      const response = await listUser(params, requestSignal)
      return response.data ?? emptyPageResponse<UserRecord>(params)
    }),
  )
  const departmentsQuery = useTenantQuery<DeptNode[]>(
    () => userStore.tenantId,
    authenticated,
    'departments',
    () => ({ scope: 'tree' }),
    async signal => {
      const response = await getDeptTree(signal)
      return response.data ?? []
    },
  )

  const tableResponse = usersQuery.data
  const loading = usersQuery.isFetching
  const deptTree = departmentsQuery.data
  const deptTreeLoading = departmentsQuery.isFetching

  const statusMutation = useTenantMutation<void, StatusCommand>(
    () => userStore.tenantId,
    'users',
    {
      mutationFn: async ({ row, status }) => {
        await updateUserStatus(row.id, status)
      },
      onError: (_error, variables) => {
        variables.row.status = variables.previousStatus
      },
      onSuccess: (_data, variables) => {
        ElMessage.success(translate('system.user.actionSuccess', { action: variables.action }))
      },
    },
  )
  const deleteMutation = useTenantMutation<void, UserRecord>(
    () => userStore.tenantId,
    'users',
    {
      mutationFn: async user => {
        await deleteUser(user.id)
      },
      onSuccess: () => {
        ElMessage.success(translate('system.common.deleteSuccess'))
      },
    },
  )

  const deletingId = computed<Id | null>(() => (
    deleteMutation.pending.value ? deleteMutation.variables.value?.id ?? null : null
  ))
  const statusUpdatingId = computed<Id | null>(() => (
    statusMutation.pending.value ? statusMutation.variables.value?.row.id ?? null : null
  ))

  async function fetchData(): Promise<void> {
    if (applyDraft()) return
    await refreshData()
  }

  async function refreshData(): Promise<void> {
    await refreshApplied(async () => {
      await usersQuery.refetch({ throwOnError: true })
    })
  }

  function handleSearch(): void {
    queryParams.value.page = 1
    void fetchData()
  }

  function handleReset(): void {
    queryParams.value = { page: 1, page_size: queryParams.value.page_size }
    selectedDeptId.value = undefined
    selectedDeptName.value = ''
    void fetchData()
  }

  function handleDeptSelect(department: { id?: Id, name: string }): void {
    selectedDeptId.value = department.id
    selectedDeptName.value = department.name
    queryParams.value.dept_id = department.id
    handleSearch()
  }

  function clearDeptFilter(): void {
    handleDeptSelect({ name: '' })
  }

  async function handleExport(): Promise<void> {
    const successfulQuery = lastSuccessfulQuery.value
    if (!successfulQuery) {
      ElMessage.warning(translate('system.common.exportRequiresSuccessfulQuery'))
      return
    }
    const intent = normalizeExportIntent('users', successfulQuery)
    if (!(await confirmExportIntent(intent))) return

    await submitExport(
      intent.signature,
      (idempotencyKey, signal) => exportUser(
        intent.filter,
        idempotencyKey,
        signal,
        intent.isEmpty,
      ),
    )
  }

  function isManageableStatus(status: UserStatus): status is UserManageableStatus {
    return status === '0' || status === '1'
  }

  function userStatusLabel(status: UserStatus): string {
    return translate(USER_STATUS_KEYS[status])
  }

  function userStatusTag(status: UserStatus): 'danger' | 'success' | 'warning' {
    if (status === '1') return 'success'
    if (status === '0') return 'danger'
    return 'warning'
  }

  async function handleChangeStatus(
    row: UserRecord,
    status: UserManageableStatus,
  ): Promise<void> {
    const previousStatus = status === '1' ? '0' : '1'
    if (statusMutation.pending.value) {
      row.status = previousStatus
      return
    }

    const actionKey = status === '1' ? 'system.common.enable' : 'system.common.disable'
    const action = translate(actionKey)
    const confirmed = await confirmAction(translate('system.user.statusChangeConfirm', {
      action,
      name: row.username,
    }), translate('system.common.prompt'), {
      type: 'warning',
    })
    if (!confirmed) {
      row.status = previousStatus
      return
    }

    await statusMutation.mutateAsync({ action, previousStatus, row, status })
    await refreshData()
  }

  function handleAdd(): void {
    editingUser.value = null
    userDialogVisible.value = true
  }

  function handleEdit(user: UserRecord): void {
    editingUser.value = user
    userDialogVisible.value = true
  }

  function handleAssignRoles(user: UserRecord): void {
    roleEditingUser.value = user
    roleDialogVisible.value = true
  }

  async function handleDelete(user: UserRecord): Promise<void> {
    if (deleteMutation.pending.value) return
    const confirmed = await confirmAction(translate('system.user.deleteConfirm', {
      name: user.username,
    }), translate('system.common.warning'), {
      type: 'warning',
      confirmButtonText: translate('system.common.confirmDelete'),
    })
    if (!confirmed) return

    await deleteMutation.mutateAsync(user)
    await refreshData()
  }

  function handleResetPassword(user: UserRecord): void {
    passwordResetUserId.value = user.id
    passwordDialogVisible.value = true
  }

  return {
    canExport,
    clearDeptFilter,
    deletingId,
    deptTree,
    deptTreeLoading,
    editingUser,
    exportLoading,
    fetchData,
    handleAdd,
    handleAssignRoles,
    handleChangeStatus,
    handleDelete,
    handleDeptSelect,
    handleEdit,
    handleExport,
    handleReset,
    handleResetPassword,
    handleSearch,
    hasPermission,
    isManageableStatus,
    loading,
    passwordDialogVisible,
    passwordResetUserId,
    queryParams,
    refreshData,
    roleDialogVisible,
    roleEditingUser,
    selectedDeptId,
    selectedDeptName,
    statusUpdatingId,
    tableResponse,
    userStatusLabel,
    userStatusTag,
    userDialogVisible,
    userStore,
  }
}
