import request from '@/api/request'

// ========== 字典类型 ==========

const DICT_TYPE_BASE = '/system/dict/types'

export interface DictTypeQuery {
  [key: string]: any
  page?: number
  pageSize?: number
}

export interface DictTypeForm {
  [key: string]: any
  name: string
  code: string
  status?: string
  remark?: string
}

/** 字典类型分页列表 */
export function listDictType(params: DictTypeQuery) {
  return request({ url: `${DICT_TYPE_BASE}/list`, method: 'get', params })
}

/** 字典类型不分页列表 */
export function listDictTypeNoPage(params?: DictTypeQuery) {
  return request({ url: `${DICT_TYPE_BASE}/listNoPage`, method: 'get', params })
}

/** 导出字典类型 */
export function exportDictType(params?: any) {
  return request({ url: `${DICT_TYPE_BASE}/export`, method: 'get', params, responseType: 'blob' })
}

/** 创建字典类型 */
export function createDictType(data: DictTypeForm) {
  return request({ url: DICT_TYPE_BASE, method: 'post', data })
}

/** 更新字典类型 */
export function updateDictType(id: number | string, data: Partial<DictTypeForm>) {
  return request({ url: `${DICT_TYPE_BASE}/${id}`, method: 'put', data })
}

/** 删除字典类型 */
export function deleteDictType(id: number | string) {
  return request({ url: `${DICT_TYPE_BASE}/${id}`, method: 'delete' })
}

// ========== 字典数据 ==========

const DICT_DATA_BASE = '/system/dict/data'

export interface DictDataQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  type_code?: string
  label?: string
  status?: string
}

export interface DictDataForm {
  [key: string]: any
  type_code: string
  label: string
  value: string
  sort?: number
  status?: string
  remark?: string
}

/** 按类型编码获取字典数据 */
export function getDictData(typeCode: string) {
  return request({ url: `${DICT_DATA_BASE}/type/${typeCode}`, method: 'get' })
}

/** 字典数据列表(按type_code查询) */
export function listDictData(params: DictDataQuery) {
  return request({ url: DICT_DATA_BASE, method: 'get', params })
}

/** 创建字典数据 */
export function createDictData(data: DictDataForm) {
  return request({ url: DICT_DATA_BASE, method: 'post', data })
}

/** 更新字典数据 */
export function updateDictData(id: number | string, data: Partial<DictDataForm>) {
  return request({ url: `${DICT_DATA_BASE}/${id}`, method: 'put', data })
}

/** 删除字典数据 */
export function deleteDictData(id: number | string) {
  return request({ url: `${DICT_DATA_BASE}/${id}`, method: 'delete' })
}
