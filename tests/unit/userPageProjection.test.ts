import { effectScope } from 'vue'
import { describe, expect, it } from 'vitest'
import type { UserRecord } from '@/api/modules/user'
import { useUserPageProjection } from '@/views/system/user/useUserPageProjection'

describe('用户管理页临时投影', () => {
  it('身份或 KeepAlive 失效时可同步关闭全部业务对话框并清除旧 ID', () => {
    const scope = effectScope()
    const state = scope.run(useUserPageProjection)
    if (!state) throw new Error('测试用户页投影未创建')
    state.selectedDeptId.value = 'dept-old'
    state.selectedDeptName.value = '旧部门'
    const oldUser = { id: 'user-old' } as UserRecord
    state.editingUser.value = oldUser
    state.userDialogVisible.value = true
    state.passwordResetUserId.value = 'user-old'
    state.passwordDialogVisible.value = true
    state.roleEditingUser.value = oldUser
    state.roleDialogVisible.value = true

    state.resetUserPageProjection()

    expect(state.selectedDeptId.value).toBeUndefined()
    expect(state.selectedDeptName.value).toBe('')
    expect(state.editingUser.value).toBeNull()
    expect(state.userDialogVisible.value).toBe(false)
    expect(state.passwordResetUserId.value).toBeNull()
    expect(state.passwordDialogVisible.value).toBe(false)
    expect(state.roleEditingUser.value).toBeNull()
    expect(state.roleDialogVisible.value).toBe(false)
    scope.stop()
  })
})
