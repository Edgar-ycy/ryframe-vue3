import { ref } from 'vue'
import type { UserRecord } from '@/api/modules/user'
import type { Id } from '@/shared/http/types'

/** 仅保存用户管理页的临时选择与对话框投影，不承载服务端状态。 */
export function useUserPageProjection() {
  const selectedDeptId = ref<Id>()
  const selectedDeptName = ref('')
  const userDialogVisible = ref(false)
  const editingUser = ref<UserRecord | null>(null)
  const passwordDialogVisible = ref(false)
  const passwordResetUserId = ref<Id | null>(null)
  const roleDialogVisible = ref(false)
  const roleEditingUser = ref<UserRecord | null>(null)

  function resetUserPageProjection(): void {
    selectedDeptId.value = undefined
    selectedDeptName.value = ''
    userDialogVisible.value = false
    editingUser.value = null
    passwordDialogVisible.value = false
    passwordResetUserId.value = null
    roleDialogVisible.value = false
    roleEditingUser.value = null
  }

  return {
    editingUser,
    passwordDialogVisible,
    passwordResetUserId,
    resetUserPageProjection,
    roleDialogVisible,
    roleEditingUser,
    selectedDeptId,
    selectedDeptName,
    userDialogVisible,
  }
}
