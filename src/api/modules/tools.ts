import request from '@/api/request'

const BASE = '/tools/gen'

export interface GenQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  table_name?: string
  table_comment?: string
}

/** 分页查询数据库表 */
export function listTable(params: GenQuery) {
  return request({ url: `${BASE}/tables/list`, method: 'get', params })
}

/** 获取表信息 */
export function getTableInfo(tableName: string) {
  return request({ url: `${BASE}/${tableName}`, method: 'get' })
}

/** 预览代码 */
export function previewCode(tableName: string) {
  return request({ url: `${BASE}/preview/${tableName}`, method: 'get' })
}

/** 生成代码（下载） */
export function downloadCode(tableNames: string) {
  return request({ url: `${BASE}/download/${tableNames}`, method: 'get', responseType: 'blob' })
}

/** 导入表 */
export function importTable(tables: string[]) {
  return request({ url: `${BASE}/import`, method: 'post', data: { tables } })
}

/** 同步表结构 */
export function syncTable(tableName: string) {
  return request({ url: `${BASE}/sync/${tableName}`, method: 'put' })
}

/** 删除表 */
export function deleteTable(tableName: string) {
  return request({ url: `${BASE}/${tableName}`, method: 'delete' })
}
