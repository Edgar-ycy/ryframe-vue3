import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'

const BASE = '/tools/gen'

export type GenQuery = OperationQuery<'get_tools_gen_tables'>
export type ColumnInfo = ApiSchema<'ColumnInfo'>
export type TableInfo = ApiSchema<'TableInfo'>
export type GenerateOptions = OperationJsonBody<'post_tools_gen_generate'>
export type GeneratedFile = ApiSchema<'GeneratedFile'>
export type WriteReport = ApiSchema<'WriteReport'>

/** 查询数据库表列表 */
export function listTable(params: GenQuery) {
  return request<TableInfo[]>({ url: `${BASE}/tables`, method: 'get', params })
}

/** 预览代码 */
export function previewCode(data: GenerateOptions) {
  return request<GeneratedFile[]>({ url: `${BASE}/preview`, method: 'post', data })
}

/** 生成代码（写盘到项目目录） */
export function generateCode(data: GenerateOptions) {
  return request<WriteReport>({ url: `${BASE}/generate`, method: 'post', data })
}

/** 下载生成代码（打包 zip） */
export function downloadCode(data: GenerateOptions) {
  return requestBlob({ url: `${BASE}/download`, method: 'post', data })
}
