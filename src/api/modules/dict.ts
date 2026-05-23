import request from '@/api/request'

// ========== 字典类型 ==========

const DICT_TYPE_BASE = '/system/dict/types'

export interface DictTypeQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  dict_name?: string
  dict_type?: string
  status?: string
}

export interface DictTypeForm {
  [key: string]: any
  dict_name: string
  dict_type: string
  status: string
  remark?: string
}

/** 字典类型分页列表 */
export function listDictType(params: DictTypeQuery) {
  return request({ url: `${DICT_TYPE_BASE}/list`, method: 'get', params })
}

/** 创建字典类型 */
export function createDictType(data: DictTypeForm) {
  return request({ url: DICT_TYPE_BASE, method: 'post', data })
}

/** 更新字典类型 */
export function updateDictType(id: number, data: Partial<DictTypeForm>) {
  return request({ url: `${DICT_TYPE_BASE}/${id}`, method: 'put', data })
}

/** 删除字典类型 */
export function deleteDictType(id: number) {
  return request({ url: `${DICT_TYPE_BASE}/${id}`, method: 'delete' })
}

// ========== 字典数据 ==========

const DICT_DATA_BASE = '/system/dict/data'

export interface DictDataQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  dict_type?: string
  dict_label?: string
  status?: string
}

export interface DictDataForm {
  [key: string]: any
  dict_type: string
  dict_label: string
  dict_value: string
  dict_sort?: number
  css_class?: string
  list_class?: string
  is_default?: string
  status: string
  remark?: string
}

/** 按类型编码获取字典数据 */
export function getDictData(typeCode: string) {
  return request({ url: `${DICT_DATA_BASE}/type/${typeCode}`, method: 'get' })
}

/** 字典数据列表(按type_code查询) */
export function listDictData(params: DictDataQuery) {
  return request({ url: `${DICT_DATA_BASE}/listNoPage`, method: 'get', params })
}

/** 创建字典数据 */
export function createDictData(data: DictDataForm) {
  return request({ url: DICT_DATA_BASE, method: 'post', data })
}

/** 更新字典数据 */
export function updateDictData(id: number, data: Partial<DictDataForm>) {
  return request({ url: `${DICT_DATA_BASE}/${id}`, method: 'put', data })
}

/** 删除字典数据 */
export function deleteDictData(id: number) {
  return request({ url: `${DICT_DATA_BASE}/${id}`, method: 'delete' })
}
