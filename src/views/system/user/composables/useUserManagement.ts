import { ElMessage } from 'element-plus'
import {
  deleteUser,
  exportUser,
  listUser,
  updateUserStatus,
  type UserQuery,
  type UserManageableStatus,
  type UserRecord,
} from '@/api/modules/user'
import { getDeptTree, type DeptNode } from '@/api/modules/dept'
import { confirmAndSubmitExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { usePermission } from '@/hooks/usePermission'
import { useUserStore } from '@/stores/user'
import { translate } from '@/i18n'
import { emptyPageResponse, type Id, type PageResponse } from '@/shared/http/types'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { confirmAction } from '@/utils/confirmAction'
import { useUserPageProjection } from '../useUserPageProjection'
import { isManageableStatus, userStatusLabel, userStatusTag } from '../userStatusPresentation'

interface StatusCommand {
  previousStatus: UserManageableStatus
  row: UserRecord
  status: UserManageableStatus
}

export function useUserManagement() {
  const {
    editingUser,
    passwordDialogVisible,
    passwordResetUserId,
    resetUserPageProjection,
    roleDialogVisible,
    roleEditingUser,
    selectedDeptId,
    selectedDeptName,
    userDialogVisible,
  } = useUserPageProjection()
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
  const { hasPermission } = usePermission()
  const userStore = useUserStore()
  const { pending: exportLoading, submitExport } = useExportJobRequest()
  const pageLifecycle = useServerStatePageLifecycle(resetPageState)
  const authenticated = () =>
    pageLifecycle.pageActive.value && userStore.sessionStatus === 'authenticated'

  const usersQuery = useServerStateQuery<PageResponse<UserRecord>>(
    authenticated,
    'users',
    () => ({ scope: 'list', filters: { ...appliedQueryParams.value } }),
    (signal) =>
      runAppliedQuery(signal, async (query, requestSignal) => {
        const params = { ...query }
        const response = await listUser(params, requestSignal)
        return response.data ?? emptyPageResponse<UserRecord>(params)
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

  const tableResponse = usersQuery.data
  const loading = usersQuery.isFetching
  const deptTree = departmentsQuery.data
  const deptTreeLoading = departmentsQuery.isFetching

  const statusMutation = useServerStateMutation<void, StatusCommand>('users', {
    mutationFn: async ({ row, status }) => {
      await updateUserStatus(row.id, status)
    },
    onError: (_error, variables) => {
      variables.row.status = variables.previousStatus
    },
  })
  const deleteMutation = useServerStateMutation<void, UserRecord>('users', {
    mutationFn: async (user) => {
      await deleteUser(user.id)
    },
  })

  const deletingId = computed<Id | null>(() =>
    deleteMutation.pending.value ? (deleteMutation.variables.value?.id ?? null) : null,
  )
  const statusUpdatingId = computed<Id | null>(() =>
    statusMutation.pending.value ? (statusMutation.variables.value?.row.id ?? null) : null,
  )

  function resetPageState(): void {
    clearSuccessfulQuery()
    resetUserPageProjection()
  }

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

  function handleDeptSelect(department: { id?: Id; name: string }): void {
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
    await confirmAndSubmitExportIntent(
      intent,
      (scope) =>
        submitExport(scope, intent.signature, (idempotencyKey, signal) =>
          exportUser(intent.filter, idempotencyKey, signal, intent.isEmpty),
        ),
      { ownsOperation: pageLifecycle.captureOwnership() },
    )
  }

  async function handleChangeStatus(row: UserRecord, status: UserManageableStatus): Promise<void> {
    const previousStatus = status === '1' ? '0' : '1'
    if (statusMutation.pending.value) {
      row.status = previousStatus
      return
    }

    const actionKey = status === '1' ? 'system.common.enable' : 'system.common.disable'
    const action = translate(actionKey)
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('system.user.statusChangeConfirm', {
            action,
            name: row.username,
          }),
          translate('system.common.prompt'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation) {
      row.status = previousStatus
      return
    }

    await statusMutation.mutateAsync({ previousStatus, row, status })
    operation.apply(
      () => ElMessage.success(translate('system.user.actionSuccess', { action })),
      ownsOperation,
    )
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
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('system.user.deleteConfirm', { name: user.username }),
          translate('system.common.warning'),
          {
            type: 'warning',
            confirmButtonText: translate('system.common.confirmDelete'),
          },
        ),
      ownsOperation,
    )
    if (!operation) return

    await deleteMutation.mutateAsync(user)
    operation.apply(
      () => ElMessage.success(translate('system.common.deleteSuccess')),
      ownsOperation,
    )
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
