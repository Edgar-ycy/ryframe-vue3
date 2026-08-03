import request, { requestText } from '@/shared/http/client'
import { requestExportJob } from './exportJob'
import type { ApiSchema, OperationData, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type PageResponse } from '@/shared/http/types'

// ========== 服务器监控 (/monitor) ==========

export type ServerInfo = ApiSchema<'ServerInfo'>
export type CacheInfo = ApiSchema<'CacheInfo'>
export type DbPoolInfo = ApiSchema<'DbPoolInfo'>
export type RuntimeStatus = ApiSchema<'RuntimeStatus'>

/** 获取服务器信息。 */
export function getServerInfo(signal?: AbortSignal) {
  return request<ServerInfo>({ url: '/monitor/server', method: 'get', signal })
}

/** 获取缓存统计。 */
export function getCacheInfo(signal?: AbortSignal) {
  return request<CacheInfo>({ url: '/monitor/cache', method: 'get', signal })
}

/** 获取 Redis 命令统计。 */
export function getCacheCommands(signal?: AbortSignal) {
  return request<OperationData<'get_monitor_cache_commands'>>({
    url: '/monitor/cache/commands',
    method: 'get',
    signal,
  })
}

/** 获取数据库连接池状态。 */
export function getDbPool(signal?: AbortSignal) {
  return request<DbPoolInfo>({ url: '/monitor/db-pool', method: 'get', signal })
}

/** 获取主应用运行时组件状态。 */
export function getRuntimeStatus(signal?: AbortSignal) {
  return request<RuntimeStatus>({ url: '/monitor/runtime', method: 'get', signal })
}

/** 获取 Prometheus 指标文本。 */
export function getMetrics(signal?: AbortSignal) {
  return requestText({ url: '/monitor/metrics', method: 'get', signal })
}

// ========== 操作日志 (/system/operlogs) ==========

export type OperLogQuery = OperationQuery<'get_system_operlogs'>
export type OperLogRecord = ApiSchema<'OperLogVo'>

type LogExportFilters = {
  name?: string
  status?: string
  begin_time?: string
  end_time?: string
}
type OperLogExportQuery = LogExportFilters & OperationJsonBody<'post_system_operlogs_exports'>

/** 分页获取操作日志。 */
export function listOperLog(params: OperLogQuery, signal?: AbortSignal) {
  return request<PageResponse<OperLogRecord>>({
    url: '/system/operlogs',
    method: 'get',
    params,
    signal,
  })
}

/** 导出操作日志。 */
export function exportOperLog(params?: OperLogExportQuery, signal?: AbortSignal) {
  return requestExportJob('/system/operlogs/exports', stripPagination(params), signal)
}

// ========== 登录日志 (/system/loginlogs) ==========

export type LoginLogQuery = OperationQuery<'get_system_loginlogs'>
type LoginLogExportQuery = LogExportFilters & OperationJsonBody<'post_system_loginlogs_exports'>
export type LoginLogRecord = ApiSchema<'LoginInfoVo'>

/** 分页获取登录日志。 */
export function listLoginLog(params: LoginLogQuery, signal?: AbortSignal) {
  return request<PageResponse<LoginLogRecord>>({
    url: '/system/loginlogs',
    method: 'get',
    params,
    signal,
  })
}

/** 导出登录日志。 */
export function exportLoginLog(params?: LoginLogExportQuery, signal?: AbortSignal) {
  return requestExportJob('/system/loginlogs/exports', stripPagination(params), signal)
}

// ========== 在线用户 (/system/online) ==========

export type OnlineUserQuery = OperationQuery<'get_system_online'>
export type OnlineUserRecord = ApiSchema<'OnlineUserVo'>

/** 分页获取在线用户。 */
export function listOnlineUser(params: OnlineUserQuery, signal?: AbortSignal) {
  return request<PageResponse<OnlineUserRecord>>({
    url: '/system/online',
    method: 'get',
    params,
    signal,
  })
}

/** 强制指定会话下线。 */
export function forceLogout(sid: string) {
  return request({ url: `/system/online/${encodeURIComponent(sid)}`, method: 'delete' })
}
