import request from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id, PageResponse } from '@/shared/http/types'

const BASE = '/system/depts'

export type DeptQuery = OperationQuery<'get_system_depts'>
export type DeptCreateInput = OperationJsonBody<'post_system_depts'>
export type DeptUpdateInput = OperationJsonBody<'put_system_depts_by_id'>
export type DeptNode = ApiSchema<'DeptTreeNode'>
export type DeptRecord = ApiSchema<'DeptVo'>

/** 部门树 */
export function getDeptTree(signal?: AbortSignal) {
  return request<DeptNode[]>({ url: `${BASE}/tree`, method: 'get', signal })
}
/** 部门列表（分页） */
export function listDept(params?: DeptQuery, signal?: AbortSignal) {
  return request<PageResponse<DeptRecord>>({ url: BASE, method: 'get', params, signal })
}
export function getDept(id: Id, signal?: AbortSignal) {
  return request<DeptRecord>({ url: `${BASE}/${id}`, method: 'get', signal })
}
export function createDept(data: DeptCreateInput)     { return request<DeptRecord>({ url: BASE, method: 'post', data }) }
export function updateDept(id: Id, data: DeptUpdateInput) { return request<DeptRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteDept(id: Id)         { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }
