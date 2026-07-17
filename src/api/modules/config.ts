import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

const BASE = '/system/configs'

export type ConfigQuery = OperationQuery<'get_system_configs'>
type ConfigAllQuery = OperationQuery<'get_system_configs_all'>
type ConfigExportQuery = OperationQuery<'get_system_configs_export'>
export type ConfigCreateInput = OperationJsonBody<'post_system_configs'>
export type ConfigUpdateInput = OperationJsonBody<'put_system_configs_by_id'>
export type ConfigRecord = ApiSchema<'ConfigVo'>

export function listConfig(params: ConfigQuery) { return request<ConfigRecord[]>({ url: BASE, method: 'get', params }) }
export function listConfigNoPage(params?: ConfigAllQuery) {
  return request<ConfigRecord[]>({
    url: `${BASE}/all`, method: 'get', params: stripPagination(params),
  })
}
export function exportConfig(params?: ConfigExportQuery) {
  return requestBlob({ url: `${BASE}/export`, method: 'get', params: stripPagination(params) })
}
export function getConfig(id: Id)      { return request<ConfigRecord>({ url: `${BASE}/${id}`, method: 'get' }) }

/** 按 Key 查询参数值 */
export function getConfigByKey(key: string) {
  return request<string>({ url: `${BASE}/key/${key}`, method: 'get' })
}

export function createConfig(data: ConfigCreateInput) { return request<ConfigRecord>({ url: BASE, method: 'post', data }) }
export function updateConfig(id: Id, data: ConfigUpdateInput) { return request<ConfigRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteConfig(id: Id) { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }

/** 刷新参数缓存 */
export function refreshConfigCache() { return request({ url: `${BASE}/cache`, method: 'delete' }) }
