import request from '@/api/request'

const BASE = '/tools/gen'

export interface GenQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  table_name?: string
  table_comment?: string
}

/** 查询数据库表列表 */
export function listTable(params: GenQuery) {
  return request({ url: `${BASE}/tables`, method: 'get', params })
}

/** 预览代码 */
export function previewCode(data: { table_name: string; module_name?: string; business_name?: string; class_name?: string }) {
  return request({ url: `${BASE}/preview`, method: 'post', data })
}

/** 生成代码（写盘到项目目录） */
export function generateCode(data: { table_name: string; module_name?: string; business_name?: string; class_name?: string }) {
  return request({ url: `${BASE}/generate`, method: 'post', data })
}

/** 下载生成代码（打包 zip） */
export function downloadCode(data: { table_name: string; module_name?: string; business_name?: string; class_name?: string }) {
  return request({ url: `${BASE}/download`, method: 'post', data, responseType: 'blob' })
}
