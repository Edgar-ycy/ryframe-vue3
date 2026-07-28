import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id, type PageResponse } from '@/shared/http/types'

// ========== 字典类型 ==========

const DICT_TYPE_BASE = '/system/dict/types'

export type DictTypeQuery = OperationQuery<'get_system_dict_types'>
type DictTypeAllQuery = OperationQuery<'get_system_dict_types_all'>
type DictTypeExportQuery = OperationQuery<'get_system_dict_types_export'>
export type DictTypeCreateInput = OperationJsonBody<'post_system_dict_types'>
export type DictTypeUpdateInput = OperationJsonBody<'put_system_dict_types_by_id'>
export type DictTypeRecord = ApiSchema<'DictTypeVo'>

/** 字典类型分页列表 */
export function listDictType(params: DictTypeQuery) {
  return request<PageResponse<DictTypeRecord>>({ url: DICT_TYPE_BASE, method: 'get', params })
}

/** 字典类型不分页列表 */
export function listDictTypeNoPage(params?: DictTypeAllQuery) {
  return request<DictTypeRecord[]>({
    url: `${DICT_TYPE_BASE}/all`, method: 'get', params: stripPagination(params),
  })
}

/** 导出字典类型 */
export function exportDictType(params?: DictTypeExportQuery) {
  return requestBlob({
    url: `${DICT_TYPE_BASE}/export`, method: 'get', params: stripPagination(params),
  })
}

/** 创建字典类型 */
export function createDictType(data: DictTypeCreateInput) {
  return request<DictTypeRecord>({ url: DICT_TYPE_BASE, method: 'post', data })
}

/** 更新字典类型 */
export function updateDictType(id: Id, data: DictTypeUpdateInput) {
  return request<DictTypeRecord>({ url: `${DICT_TYPE_BASE}/${id}`, method: 'put', data })
}

/** 删除字典类型 */
export function deleteDictType(id: Id) {
  return request<void>({ url: `${DICT_TYPE_BASE}/${id}`, method: 'delete' })
}

// ========== 字典数据 ==========

const DICT_DATA_BASE = '/system/dict/data'

export type DictDataQuery = OperationQuery<'get_system_dict_data'>
export type DictDataCreateInput = OperationJsonBody<'post_system_dict_data'>
export type DictDataUpdateInput = OperationJsonBody<'put_system_dict_data_by_id'>
export type DictDataRecord = ApiSchema<'DictDataVo'>

/** 字典数据列表(按type_code查询) */
export function listDictData(params: DictDataQuery) {
  return request<DictDataRecord[]>({ url: DICT_DATA_BASE, method: 'get', params })
}

/** 创建字典数据 */
export function createDictData(data: DictDataCreateInput) {
  return request<DictDataRecord>({ url: DICT_DATA_BASE, method: 'post', data })
}

/** 更新字典数据 */
export function updateDictData(id: Id, data: DictDataUpdateInput) {
  return request<DictDataRecord>({ url: `${DICT_DATA_BASE}/${id}`, method: 'put', data })
}

/** 删除字典数据 */
export function deleteDictData(id: Id) {
  return request<void>({ url: `${DICT_DATA_BASE}/${id}`, method: 'delete' })
}
