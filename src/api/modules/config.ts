import request from '@/shared/http/client'
import { requestExportJob } from './exportJob'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id, type PageResponse } from '@/shared/http/types'

const BASE = '/system/configs'

export type ConfigQuery = OperationQuery<'get_system_configs'>
type ConfigExportQuery = Omit<ConfigQuery, 'page' | 'page_size'> & OperationJsonBody<'post_system_configs_exports'>
export type ConfigCreateInput = OperationJsonBody<'post_system_configs'>
export type ConfigUpdateInput = OperationJsonBody<'put_system_configs_by_id'>
export type ConfigRecord = ApiSchema<'ConfigVo'>

export function listConfig(params: ConfigQuery, signal?: AbortSignal) {
  return request<PageResponse<ConfigRecord>>({ url: BASE, method: 'get', params, signal })
}
export function exportConfig(params?: ConfigExportQuery, signal?: AbortSignal) {
  return requestExportJob(`${BASE}/exports`, stripPagination(params), signal)
}
export function getConfig(id: Id, signal?: AbortSignal) {
  return request<ConfigRecord>({ url: `${BASE}/${id}`, method: 'get', signal })
}

/** 按键查询参数值 */
export function getConfigByKey(key: string, signal?: AbortSignal) {
  return request<string>({ url: `${BASE}/key/${key}`, method: 'get', signal })
}

export function createConfig(data: ConfigCreateInput) { return request<ConfigRecord>({ url: BASE, method: 'post', data }) }
export function updateConfig(id: Id, data: ConfigUpdateInput) { return request<ConfigRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteConfig(id: Id) { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }

/** 刷新参数缓存 */
export function refreshConfigCache() { return request({ url: `${BASE}/cache`, method: 'delete' }) }
