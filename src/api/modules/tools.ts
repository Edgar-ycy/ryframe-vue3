import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { PageResponse } from '@/shared/http/types'

const BASE = '/tools/gen'

export type GenQuery = OperationQuery<'get_tools_gen_tables'>
export type ColumnInfo = ApiSchema<'ColumnInfo'>
export type TableInfo = ApiSchema<'TableInfo'>
export type GenerateOptions = OperationJsonBody<'post_tools_gen_preview'>
export type GenerateRequest = OperationJsonBody<'post_tools_gen_generate'>
export type GeneratedFile = ApiSchema<'GeneratedFile'>
export type WriteReport = ApiSchema<'WriteReport'>

/** 查询数据库表列表 */
export function listTable(params: GenQuery, signal?: AbortSignal) {
  return request<PageResponse<TableInfo>>({
    url: `${BASE}/tables`,
    method: 'get',
    params,
    signal,
  })
}

/** 预览代码 */
export function previewCode(data: GenerateOptions, signal?: AbortSignal) {
  return request<GeneratedFile[]>({
    url: `${BASE}/preview`,
    method: 'post',
    data,
    signal,
  })
}

/** 将生成代码写入指定的外部目录 */
export function generateCode(data: GenerateRequest) {
  return request<WriteReport>({ url: `${BASE}/generate`, method: 'post', data })
}

/** 下载生成代码（打包为压缩包） */
export function downloadCode(data: GenerateOptions) {
  return requestBlob({ url: `${BASE}/download`, method: 'post', data })
}
