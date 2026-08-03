import request from '@/shared/http/client'
import { requestExportJob } from './exportJob'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id, type PageResponse } from '@/shared/http/types'

const BASE = '/system/roles'

export type RoleDataScope = '1' | '2' | '3' | '4' | '5'

export type RoleQuery = OperationQuery<'get_system_roles'>
export type RoleOptionQuery = OperationQuery<'get_system_roles_options'>
type RoleExportQuery = Omit<RoleQuery, 'page' | 'page_size'> & OperationJsonBody<'post_system_roles_exports'>
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

export function listRole(params: RoleQuery, signal?: AbortSignal) {
  return request<PageResponse<RoleRecord>>({ url: BASE, method: 'get', params, signal })
}
export function listRoleOptions(params?: RoleOptionQuery, signal?: AbortSignal) {
  return request<ApiSchema<'OptionList'>>({ url: `${BASE}/options`, method: 'get', params, signal })
}
export function exportRole(params?: RoleExportQuery, signal?: AbortSignal) {
  return requestExportJob(`${BASE}/exports`, stripPagination(params), signal)
}
export function getRole(id: Id, signal?: AbortSignal) {
  return request<RoleRecord>({ url: `${BASE}/${id}`, method: 'get', signal })
}
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
