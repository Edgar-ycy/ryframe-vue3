import { requestOperation } from '@/api/operationRequest'
import {
  delete_system_roles_batch_by_ids,
  delete_system_roles_by_id,
  get_system_roles,
  get_system_roles_by_id,
  get_system_roles_options,
  post_system_roles,
  post_system_roles_exports,
  put_system_roles_by_id,
  put_system_roles_by_id_data_scope,
  put_system_roles_by_id_permissions,
} from '@/api/generated/operations'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

export type RoleDataScope = '1' | '2' | '3' | '4' | '5'

export type RoleQuery = OperationQuery<'get_system_roles'>
export type RoleOptionQuery = OperationQuery<'get_system_roles_options'>
type RoleExportQuery = OperationJsonBody<'post_system_roles_exports'>['filter']
export type RoleCreateInput = Omit<OperationJsonBody<'post_system_roles'>, 'data_scope'> & {
  data_scope?: RoleDataScope
}
export type RoleUpdateInput = OperationJsonBody<'put_system_roles_by_id'>
export type RoleRecord = Omit<ApiSchema<'RoleVo'>, 'data_scope'> & {
  data_scope: RoleDataScope
}
export type ReplaceRoleDataScopeInput = {
  data_scope: RoleDataScope
  dept_ids: Id[]
}

function isRoleDataScope(value: string): value is RoleDataScope {
  return value === '1' || value === '2' || value === '3' || value === '4' || value === '5'
}

function toRoleRecord(value: ApiSchema<'RoleVo'>): RoleRecord {
  if (!isRoleDataScope(value.data_scope)) {
    throw new TypeError(`服务端返回了未知的角色数据范围：${value.data_scope}`)
  }
  return { ...value, data_scope: value.data_scope }
}

export async function listRole(params: RoleQuery, signal?: AbortSignal) {
  const response = await requestOperation(get_system_roles, { params, signal })
  return {
    ...response,
    data: response.data
      ? { ...response.data, items: response.data.items.map(toRoleRecord) }
      : undefined,
  }
}
export function listRoleOptions(params?: RoleOptionQuery, signal?: AbortSignal) {
  return requestOperation(get_system_roles_options, { params, signal })
}
export function exportRole(
  params: RoleExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
  confirmAll = false,
) {
  return requestOperation(post_system_roles_exports, {
    data: {
      filter: stripPagination(params) ?? {},
      confirm_all: confirmAll,
    },
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}
export async function getRole(id: Id, signal?: AbortSignal) {
  const response = await requestOperation(get_system_roles_by_id, { path: { id }, signal })
  return {
    ...response,
    data: response.data ? toRoleRecord(response.data) : undefined,
  }
}
export async function createRole(data: RoleCreateInput) {
  const response = await requestOperation(post_system_roles, { data })
  return {
    ...response,
    data: response.data ? toRoleRecord(response.data) : undefined,
  }
}
export async function updateRole(id: Id, data: RoleUpdateInput) {
  const response = await requestOperation(put_system_roles_by_id, { path: { id }, data })
  return {
    ...response,
    data: response.data ? toRoleRecord(response.data) : undefined,
  }
}
export function deleteRole(id: Id) {
  return requestOperation(delete_system_roles_by_id, { path: { id } })
}
export function batchDeleteRole(ids: Id[]) {
  return requestOperation(delete_system_roles_batch_by_ids, {
    path: { ids: ids.join(',') },
  })
}

/** 分配权限 */
export function replaceRolePermissions(roleId: Id, permIds: Id[]) {
  return requestOperation(put_system_roles_by_id_permissions, {
    path: { id: roleId },
    data: { perm_ids: permIds.map(String) },
  })
}

/** 原子替换数据范围和自定义部门。 */
export function replaceRoleDataScope(roleId: Id, data: ReplaceRoleDataScopeInput) {
  return requestOperation(put_system_roles_by_id_data_scope, {
    path: { id: roleId },
    data: {
      data_scope: data.data_scope,
      dept_ids: data.dept_ids.map(String),
    },
  })
}
