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
import { listRoleNoPage, type RoleRecord } from '@/api/modules/role'
import { getDeptTree, type DeptNode } from '@/api/modules/dept'
import { useDownload } from '@/hooks/useDownload'
import { usePermission } from '@/hooks/usePermission'
import { useUserStore } from '@/stores/user'
import { translate } from '@/i18n'
import type { Id } from '@/shared/http/types'
import { confirmAction } from '@/utils/confirmAction'

const USER_STATUS_KEYS: Record<UserStatus, string> = {
  0: 'system.common.disabled',
  1: 'system.common.normal',
  pending_activation: 'system.user.pendingActivation',
}

export function useUserManagement() {
  const loading = ref(false)
  const tableData = ref<UserRecord[]>([])
  const total = ref(0)
  const roleList = ref<RoleRecord[]>([])
  const deptTree = ref<DeptNode[]>([])
  const deptTreeLoading = ref(false)
  const selectedDeptId = ref<Id>()
  const selectedDeptName = ref('')
  const queryParams = ref<UserQuery>({ page: 1, page_size: 10 })

  const userDialogVisible = ref(false)
  const editingUser = ref<UserRecord | null>(null)
  const passwordDialogVisible = ref(false)
  const passwordResetUserId = ref<Id | null>(null)
  const roleDialogVisible = ref(false)
  const roleEditingUser = ref<UserRecord | null>(null)
  const deletingId = ref<Id | null>(null)

  const { isAdmin, hasPermission } = usePermission()
  const { downloading: exportLoading, downloadBlob } = useDownload()
  const userStore = useUserStore()

  async function fetchData(): Promise<void> {
    loading.value = true
    try {
      const response = await listUser(queryParams.value)
      tableData.value = response.data?.items ?? []
      total.value = response.data?.total ?? 0
    }
    finally {
      loading.value = false
    }
  }

  async function loadDeptTree(): Promise<void> {
    deptTreeLoading.value = true
    try {
      const response = await getDeptTree()
      deptTree.value = response.data ?? []
    }
    finally {
      deptTreeLoading.value = false
    }
  }

  async function loadRoleList(): Promise<void> {
    const response = await listRoleNoPage()
    roleList.value = response.data ?? []
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

  function handleExport(): Promise<void> {
    return downloadBlob(
      () => exportUser(queryParams.value),
      { filename: translate('system.user.exportFilename') },
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

    try {
      await updateUserStatus(row.id, status)
      ElMessage.success(translate('system.user.actionSuccess', { action }))
    }
    catch (error) {
      row.status = previousStatus
      throw error
    }
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
    const confirmed = await confirmAction(translate('system.user.deleteConfirm', {
      name: user.username,
    }), translate('system.common.warning'), {
      type: 'warning',
      confirmButtonText: translate('system.common.confirmDelete'),
    })
    if (!confirmed) return

    deletingId.value = user.id
    try {
      await deleteUser(user.id)
      ElMessage.success(translate('system.common.deleteSuccess'))
      await fetchData()
    }
    finally {
      deletingId.value = null
    }
  }

  function handleResetPassword(user: UserRecord): void {
    passwordResetUserId.value = user.id
    passwordDialogVisible.value = true
  }

  onMounted(() => {
    void Promise.allSettled([fetchData(), loadDeptTree(), loadRoleList()])
  })

  return {
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
    isAdmin,
    isManageableStatus,
    loading,
    passwordDialogVisible,
    passwordResetUserId,
    queryParams,
    roleList,
    roleDialogVisible,
    roleEditingUser,
    selectedDeptId,
    selectedDeptName,
    tableData,
    total,
    userStatusLabel,
    userStatusTag,
    userDialogVisible,
    userStore,
  }
}
