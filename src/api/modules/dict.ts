import { requestOperation } from '@/api/operationRequest'
import {
  delete_system_dict_data_by_id,
  delete_system_dict_types_by_id,
  get_system_dict_data,
  get_system_dict_types,
  post_system_dict_data,
  post_system_dict_types,
  post_system_dict_types_exports,
  put_system_dict_data_by_id,
  put_system_dict_types_by_id,
} from '@/api/generated/operations'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

// ========== 字典类型 ==========

export type DictTypeQuery = OperationQuery<'get_system_dict_types'>
type DictTypeExportQuery = Omit<DictTypeQuery, 'page' | 'page_size'> & OperationJsonBody<'post_system_dict_types_exports'>
export type DictTypeCreateInput = OperationJsonBody<'post_system_dict_types'>
export type DictTypeUpdateInput = OperationJsonBody<'put_system_dict_types_by_id'>
export type DictTypeRecord = ApiSchema<'DictTypeVo'>

/** 字典类型分页列表 */
export function listDictType(params: DictTypeQuery, signal?: AbortSignal) {
  return requestOperation(get_system_dict_types, { params, signal })
}

/** 导出字典类型 */
export function exportDictType(
  params: DictTypeExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation(post_system_dict_types_exports, {
    data: stripPagination(params),
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}

/** 创建字典类型 */
export function createDictType(data: DictTypeCreateInput) {
  return requestOperation(post_system_dict_types, { data })
}

/** 更新字典类型 */
export function updateDictType(id: Id, data: DictTypeUpdateInput) {
  return requestOperation(put_system_dict_types_by_id, { path: { id }, data })
}

/** 删除字典类型 */
export function deleteDictType(id: Id) {
  return requestOperation(delete_system_dict_types_by_id, { path: { id } })
}

// ========== 字典数据 ==========

export type DictDataQuery = OperationQuery<'get_system_dict_data'>
export type DictDataCreateInput = OperationJsonBody<'post_system_dict_data'>
export type DictDataUpdateInput = OperationJsonBody<'put_system_dict_data_by_id'>
export type DictDataRecord = ApiSchema<'DictDataVo'>

/** 字典数据列表(按type_code查询) */
export function listDictData(params: DictDataQuery, signal?: AbortSignal) {
  return requestOperation(get_system_dict_data, { params, signal })
}

/** 创建字典数据 */
export function createDictData(data: DictDataCreateInput) {
  return requestOperation(post_system_dict_data, { data })
}

/** 更新字典数据 */
export function updateDictData(id: Id, data: DictDataUpdateInput) {
  return requestOperation(put_system_dict_data_by_id, { path: { id }, data })
}

/** 删除字典数据 */
export function deleteDictData(id: Id) {
  return requestOperation(delete_system_dict_data_by_id, { path: { id } })
}
