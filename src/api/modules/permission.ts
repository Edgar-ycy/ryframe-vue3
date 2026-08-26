import { requestOperation } from '@/api/operationRequest'
import {
  delete_system_perms_by_id,
  get_system_perms_by_id,
  get_system_perms_tree,
  get_system_roles_by_id_permissions,
  post_system_perms,
  post_system_perms_sync,
  put_system_perms_by_id,
} from '@/api/generated/operations'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id } from '@/shared/http/types'

export type PermissionType = ApiSchema<'PermissionType'>
export type PermissionTreeNode = Omit<ApiSchema<'PermissionTreeNode'>, 'children' | 'perm_type'> & {
  children: PermissionTreeNode[]
  perm_type: PermissionType
}
export type PermissionRecord = Omit<ApiSchema<'PermissionVo'>, 'perm_type'> & {
  perm_type: PermissionType
}
export type PermissionForm = OperationJsonBody<'post_system_perms'>
export type PermissionSyncReport = ApiSchema<'PermissionSyncReport'>

export function getPermissionTree(
  params?: OperationQuery<'get_system_perms_tree'>,
  signal?: AbortSignal,
) {
  return requestOperation(get_system_perms_tree, { params, signal })
}

export function getPermission(id: Id, signal?: AbortSignal) {
  return requestOperation(get_system_perms_by_id, { path: { id }, signal })
}

export function createPermission(data: PermissionForm) {
  return requestOperation(post_system_perms, { data })
}

export function updatePermission(id: Id, data: PermissionForm) {
  const body: OperationJsonBody<'put_system_perms_by_id'> = data
  return requestOperation(put_system_perms_by_id, { path: { id }, data: body })
}

export function deletePermission(id: Id) {
  return requestOperation(delete_system_perms_by_id, { path: { id } })
}

export function syncApiPermissions() {
  return requestOperation(post_system_perms_sync, {})
}

export function getRolePermissions(roleId: Id, signal?: AbortSignal) {
  return requestOperation(get_system_roles_by_id_permissions, {
    path: { id: roleId },
    signal,
  })
}
