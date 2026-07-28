import request, { requestBlob } from '@/shared/http/client'
import { requestExportJob } from './exportJob'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id, type PageResponse } from '@/shared/http/types'

const BASE = '/system/users'

export type UserManageableStatus = '0' | '1'
export type UserStatus = UserManageableStatus | 'pending_activation'

export type UserQuery = Omit<OperationQuery<'get_system_users'>, 'status'> & {
  status?: UserStatus
}
type UserExportQuery = Omit<UserQuery, 'page' | 'page_size'> & OperationJsonBody<'post_system_users_exports'>
export type UserCreateInput = OperationJsonBody<'post_system_users'> & {
  role_ids: Id[]
}
export type UserUpdateInput = OperationJsonBody<'put_system_users_by_id'>
export type UserRecord = Omit<ApiSchema<'UserVo'>, 'status'> & {
  status: UserStatus
}
export type UserRole = ApiSchema<'RoleBriefVo'>
export type UserDetail = Omit<ApiSchema<'UserDetailVo'>, 'roles' | 'status'> & {
  roles: UserRole[]
  status: UserStatus
}
export type PasswordResetRequestInput = OperationJsonBody<
  'post_system_users_by_id_password_reset_requests'
>
export type PasswordResetRequestResult = ApiSchema<'PasswordResetRequestResponse'>
export type UserImportResult = ApiSchema<'UserImportResult'>

/** 分页查询用户列表 */
export function listUser(params: UserQuery) {
  return request<PageResponse<UserRecord>>({ url: BASE, method: 'get', params })
}

/** 查询用户详情 */
export function getUser(id: Id) {
  return request<UserDetail>({ url: `${BASE}/${id}`, method: 'get' })
}

/** 创建用户 */
export function createUser(data: UserCreateInput) {
  return request<UserRecord>({
    url: BASE,
    method: 'post',
    data: { ...data, role_ids: data.role_ids.map(String) },
  })
}

/** 更新用户 */
export function updateUser(id: Id, data: UserUpdateInput) {
  return request<UserRecord>({ url: `${BASE}/${id}`, method: 'put', data })
}

/** 删除用户 */
export function deleteUser(id: Id) {
  return request<void>({ url: `${BASE}/${id}`, method: 'delete' })
}

/** 发起密码重置请求（管理员操作） */
export function requestPasswordReset(userId: Id, data: PasswordResetRequestInput) {
  return request<PasswordResetRequestResult>({
    url: `${BASE}/${userId}/password-reset-requests`,
    method: 'post',
    data,
  })
}

/** 给用户分配角色 */
export function replaceUserRoles(userId: Id, roleIds: Id[]) {
  return request({
    url: `${BASE}/${userId}/roles`,
    method: 'put',
    data: { role_ids: roleIds.map(String) },
  })
}

/** 修改用户状态 */
export function updateUserStatus(userId: Id, status: UserManageableStatus) {
  return request({ url: `${BASE}/${userId}/status`, method: 'put', data: { status } })
}

/** 批量删除用户 */
export function batchDeleteUser(ids: Id[]) {
  return request({ url: `${BASE}/batch/${ids.join(',')}`, method: 'delete' })
}

/** 导出用户 */
export function exportUser(params?: UserExportQuery) {
  return requestExportJob(`${BASE}/exports`, stripPagination(params))
}

/** 下载导入模板 */
export function downloadImportTemplate() {
  return requestBlob({ url: `${BASE}/import-template`, method: 'get' })
}

/** 导入用户 */
export function importUser(data: FormData) {
  return request<UserImportResult>({
    url: `${BASE}/import`,
    method: 'post',
    data,
    timeout: 120000,
  })
}
