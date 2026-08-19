import { requestOperation } from '@/api/operationRequest'
import {
  delete_system_depts_by_id,
  get_system_depts,
  get_system_depts_by_id,
  get_system_depts_tree,
  post_system_depts,
  put_system_depts_by_id,
} from '@/api/generated/operations'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id } from '@/shared/http/types'

export type DeptQuery = OperationQuery<'get_system_depts'>
export type DeptCreateInput = OperationJsonBody<'post_system_depts'>
export type DeptUpdateInput = OperationJsonBody<'put_system_depts_by_id'>
export type DeptNode = ApiSchema<'DeptTreeNode'>
export type DeptRecord = ApiSchema<'DeptVo'>

/** 部门树 */
export function getDeptTree(signal?: AbortSignal) {
  return requestOperation(get_system_depts_tree, { signal })
}
/** 部门列表（分页） */
export function listDept(params?: DeptQuery, signal?: AbortSignal) {
  return requestOperation(get_system_depts, { params, signal })
}
export function getDept(id: Id, signal?: AbortSignal) {
  return requestOperation(get_system_depts_by_id, { path: { id }, signal })
}
export function createDept(data: DeptCreateInput) {
  return requestOperation(post_system_depts, { data })
}
export function updateDept(id: Id, data: DeptUpdateInput) {
  return requestOperation(put_system_depts_by_id, { path: { id }, data })
}
export function deleteDept(id: Id) {
  return requestOperation(delete_system_depts_by_id, { path: { id } })
}
