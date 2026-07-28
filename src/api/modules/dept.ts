import request from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id, type PageResponse } from '@/shared/http/types'

const BASE = '/system/depts'

export type DeptQuery = OperationQuery<'get_system_depts'>
type DeptAllQuery = OperationQuery<'get_system_depts_all'>
export type DeptCreateInput = OperationJsonBody<'post_system_depts'>
export type DeptUpdateInput = OperationJsonBody<'put_system_depts_by_id'>
export type DeptNode = ApiSchema<'DeptTreeNode'>
export type DeptRecord = ApiSchema<'DeptVo'>

/** 部门树 */
export function getDeptTree()             { return request<DeptNode[]>({ url: `${BASE}/tree`, method: 'get' }) }
/** 部门列表（分页） */
export function listDept(params?: DeptQuery) { return request<PageResponse<DeptRecord>>({ url: BASE, method: 'get', params }) }
/** 部门列表（不分页） */
export function listDeptNoPage(params?: DeptAllQuery) {
  return request<DeptRecord[]>({
    url: `${BASE}/all`, method: 'get', params: stripPagination(params),
  })
}
export function getDept(id: Id)            { return request<DeptRecord>({ url: `${BASE}/${id}`, method: 'get' }) }
export function createDept(data: DeptCreateInput)     { return request<DeptRecord>({ url: BASE, method: 'post', data }) }
export function updateDept(id: Id, data: DeptUpdateInput) { return request<DeptRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteDept(id: Id)         { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }
