import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { requestBlobOperation, requestOperation } from '@/api/operationRequest'
import {
  delete_system_users_batch_by_ids,
  delete_system_users_by_id,
  get_system_users,
  get_system_users_by_id,
  get_system_users_import_template,
  get_system_users_options,
  post_system_users,
  post_system_users_by_id_password_reset_requests,
  post_system_users_exports,
  put_system_users_by_id,
  put_system_users_by_id_roles,
  put_system_users_by_id_status,
} from '@/api/generated/operations'
import { stripPagination, type ApiResponse, type Id, type PageResponse } from '@/shared/http/types'

export type UserManageableStatus = '0' | '1'
export type UserStatus = UserManageableStatus | 'pending_activation'

export type UserQuery = Omit<OperationQuery<'get_system_users'>, 'status'> & {
  status?: UserStatus
}
export type UserOptionQuery = OperationQuery<'get_system_users_options'>
type UserExportQuery = OperationJsonBody<'post_system_users_exports'>['filter']
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

/** 分页查询用户列表 */
export function listUser(params: UserQuery, signal?: AbortSignal) {
  return requestOperation(get_system_users, { params, signal }) as Promise<
    ApiResponse<PageResponse<UserRecord>>
  >
}

/** 查询当前数据范围内的用户候选项 */
export function listUserOptions(params?: UserOptionQuery, signal?: AbortSignal) {
  return requestOperation(get_system_users_options, { params, signal })
}

/** 查询用户详情 */
export function getUser(id: Id, signal?: AbortSignal) {
  return requestOperation(get_system_users_by_id, { path: { id }, signal }) as Promise<
    ApiResponse<UserDetail>
  >
}

/** 创建用户 */
export function createUser(data: UserCreateInput) {
  return requestOperation(post_system_users, { data }) as Promise<ApiResponse<UserRecord>>
}

/** 更新用户 */
export function updateUser(id: Id, data: UserUpdateInput) {
  return requestOperation(put_system_users_by_id, { path: { id }, data }) as Promise<
    ApiResponse<UserRecord>
  >
}

/** 删除用户 */
export function deleteUser(id: Id) {
  return requestOperation(delete_system_users_by_id, { path: { id } })
}

/** 发起密码重置请求（管理员操作） */
export function requestPasswordReset(userId: Id, data: PasswordResetRequestInput) {
  return requestOperation(post_system_users_by_id_password_reset_requests, {
    path: { id: userId },
    data,
  })
}

/** 给用户分配角色 */
export function replaceUserRoles(userId: Id, roleIds: Id[]) {
  return requestOperation(put_system_users_by_id_roles, {
    path: { id: userId },
    data: { role_ids: roleIds },
  })
}

/** 修改用户状态 */
export function updateUserStatus(userId: Id, status: UserManageableStatus) {
  return requestOperation(put_system_users_by_id_status, {
    path: { id: userId },
    data: { status },
  })
}

/** 批量删除用户 */
export function batchDeleteUser(ids: Id[]) {
  return requestOperation(delete_system_users_batch_by_ids, {
    path: { ids: ids.join(',') },
  })
}

/** 导出用户 */
export function exportUser(
  params: UserExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
  confirmAll = false,
) {
  return requestOperation(post_system_users_exports, {
    data: {
      filter: stripPagination(params) ?? {},
      confirm_all: confirmAll,
    },
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}

/** 下载导入模板 */
export function downloadImportTemplate() {
  return requestBlobOperation(get_system_users_import_template, {})
}
