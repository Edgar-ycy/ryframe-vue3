import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

const BASE = '/system/roles'

export type RoleDataScope = '1' | '2' | '3' | '4' | '5'

export type RoleQuery = OperationQuery<'get_system_roles'>
type RoleAllQuery = OperationQuery<'get_system_roles_all'>
type RoleExportQuery = OperationQuery<'get_system_roles_export'>
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

export function listRole(params: RoleQuery)    { return request<RoleRecord[]>({ url: BASE, method: 'get', params }) }
export function listRoleNoPage(params?: RoleAllQuery) {
  return request<RoleRecord[]>({
    url: `${BASE}/all`, method: 'get', params: stripPagination(params),
  })
}
export function exportRole(params?: RoleExportQuery) {
  return requestBlob({ url: `${BASE}/export`, method: 'get', params: stripPagination(params) })
}
export function getRole(id: Id)           { return request<RoleRecord>({ url: `${BASE}/${id}`, method: 'get' }) }
export function createRole(data: RoleCreateInput)    { return request<RoleRecord>({ url: BASE, method: 'post', data }) }
export function updateRole(id: Id, data: RoleUpdateInput) { return request<RoleRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteRole(id: Id)        { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }
export function batchDeleteRole(ids: Id[]) { return request<void>({ url: `${BASE}/batch/${ids.join(',')}`, method: 'delete' }) }

/** 分配权限 */
export function replaceRolePermissions(roleId: Id, permIds: Id[]) {
  return request({
    url: `${BASE}/${roleId}/permissions`,
    method: 'put',
    data: { perm_ids: permIds.map(String) },
  })
}

/** 原子替换数据范围和自定义部门。 */
export function replaceRoleDataScope(roleId: Id, data: ReplaceRoleDataScopeInput) {
  return request({
    url: `${BASE}/${roleId}/data-scope`,
    method: 'put',
    data: {
      data_scope: data.data_scope,
      dept_ids: data.dept_ids.map(String),
    },
  })
}
