import { requestOperation } from '@/api/operationRequest'
import {
  delete_system_configs_by_id,
  delete_system_configs_cache,
  get_system_configs,
  get_system_configs_by_id,
  get_system_configs_key_by_key,
  post_system_configs,
  post_system_configs_exports,
  put_system_configs_by_id,
} from '@/api/generated/operations'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

export type ConfigQuery = OperationQuery<'get_system_configs'>
type ConfigExportQuery = Omit<ConfigQuery, 'page' | 'page_size'> & OperationJsonBody<'post_system_configs_exports'>
export type ConfigCreateInput = OperationJsonBody<'post_system_configs'>
export type ConfigUpdateInput = OperationJsonBody<'put_system_configs_by_id'>
export type ConfigRecord = ApiSchema<'ConfigVo'>

export function listConfig(params: ConfigQuery, signal?: AbortSignal) {
  return requestOperation(get_system_configs, { params, signal })
}
export function exportConfig(
  params: ConfigExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation(post_system_configs_exports, {
    data: stripPagination(params),
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}
export function getConfig(id: Id, signal?: AbortSignal) {
  return requestOperation(get_system_configs_by_id, { path: { id }, signal })
}

/** 按键查询参数值 */
export function getConfigByKey(key: string, signal?: AbortSignal) {
  return requestOperation(get_system_configs_key_by_key, { path: { key }, signal })
}

export function createConfig(data: ConfigCreateInput) {
  return requestOperation(post_system_configs, { data })
}
export function updateConfig(id: Id, data: ConfigUpdateInput) {
  return requestOperation(put_system_configs_by_id, { path: { id }, data })
}
export function deleteConfig(id: Id) {
  return requestOperation(delete_system_configs_by_id, { path: { id } })
}

/** 刷新参数缓存 */
export function refreshConfigCache() {
  return requestOperation(delete_system_configs_cache, {})
}
