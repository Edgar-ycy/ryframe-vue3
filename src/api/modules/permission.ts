import request from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id } from '@/shared/http/types'

const BASE = '/system/perms'
const ROLE_BASE = '/system/roles'

export type PermissionType = ApiSchema<'PermissionType'>
export type PermissionTreeNode = Omit<
  ApiSchema<'PermissionTreeNode'>,
  'children' | 'perm_type'
> & {
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
  return request<PermissionTreeNode[]>({
    url: `${BASE}/tree`,
    method: 'get',
    params,
    signal,
  })
}

export function getPermission(id: Id, signal?: AbortSignal) {
  return request<PermissionRecord>({
    url: `${BASE}/${id}`,
    method: 'get',
    signal,
  })
}

export function createPermission(data: PermissionForm) {
  return request<PermissionRecord>({
    url: BASE,
    method: 'post',
    data,
  })
}

export function updatePermission(id: Id, data: PermissionForm) {
  const body: OperationJsonBody<'put_system_perms_by_id'> = data
  return request<PermissionRecord>({
    url: `${BASE}/${id}`,
    method: 'put',
    data: body,
  })
}

export function deletePermission(id: Id) {
  return request({
    url: `${BASE}/${id}`,
    method: 'delete',
  })
}

export function syncApiPermissions() {
  return request<PermissionSyncReport>({
    url: `${BASE}/sync`,
    method: 'post',
  })
}

export function getRolePermissions(roleId: Id, signal?: AbortSignal) {
  return request<string[]>({
    url: `${ROLE_BASE}/${roleId}/permissions`,
    method: 'get',
    signal,
  })
}
