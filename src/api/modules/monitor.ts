import request, { requestBlob, requestText } from '@/shared/http/client'
import type { ApiSchema, OperationData, OperationQuery } from '@/api/contract'
import { stripPagination } from '@/shared/http/types'

// ========== 服务器监控 (/monitor) ==========

export type ServerInfo = ApiSchema<'ServerInfo'>
export type CacheInfo = ApiSchema<'CacheInfo'>
export type DbPoolInfo = ApiSchema<'DbPoolInfo'>
export type RuntimeStatus = ApiSchema<'RuntimeStatus'>

/** 服务器信息 */
export function getServerInfo() {
  return request<ServerInfo>({ url: '/monitor/server', method: 'get' })
}

/** 缓存统计 */
export function getCacheInfo() {
  return request<CacheInfo>({ url: '/monitor/cache', method: 'get' })
}

/** Redis 命令统计 */
export function getCacheCommands() {
  return request<OperationData<'get_monitor_cache_commands'>>({
    url: '/monitor/cache/commands',
    method: 'get',
  })
}

/** 数据库连接池 */
export function getDbPool() {
  return request<DbPoolInfo>({ url: '/monitor/db-pool', method: 'get' })
}

/** 主应用运行时组件状态 */
export function getRuntimeStatus() {
  return request<RuntimeStatus>({ url: '/monitor/runtime', method: 'get' })
}

/** Prometheus 指标文本 */
export function getMetrics() {
  return requestText({ url: '/monitor/metrics', method: 'get' })
}

// ========== 操作日志 (/system/operlogs) ==========

export type OperLogQuery = OperationQuery<'get_system_operlogs'>
type OperLogAllQuery = OperationQuery<'get_system_operlogs_all'>
type OperLogExportQuery = OperationQuery<'get_system_operlogs_export'>
export type OperLogRecord = ApiSchema<'OperLogVo'>

/** 操作日志分页 */
export function listOperLog(params: OperLogQuery) {
  return request<OperLogRecord[]>({ url: '/system/operlogs', method: 'get', params })
}

/** 操作日志不分页 */
export function listOperLogNoPage(params?: OperLogAllQuery) {
  return request<OperLogRecord[]>({
    url: '/system/operlogs/all', method: 'get', params: stripPagination(params),
  })
}

/** 导出操作日志 */
export function exportOperLog(params?: OperLogExportQuery) {
  return requestBlob({
    url: '/system/operlogs/export', method: 'get', params: stripPagination(params),
  })
}

// ========== 登录日志 (/system/loginlogs) ==========

export type LoginLogQuery = OperationQuery<'get_system_loginlogs'>
type LoginLogAllQuery = OperationQuery<'get_system_loginlogs_all'>
type LoginLogExportQuery = OperationQuery<'get_system_loginlogs_export'>
export type LoginLogRecord = ApiSchema<'LoginInfoVo'>

/** 登录日志分页 */
export function listLoginLog(params: LoginLogQuery) {
  return request<LoginLogRecord[]>({ url: '/system/loginlogs', method: 'get', params })
}

/** 登录日志不分页 */
export function listLoginLogNoPage(params?: LoginLogAllQuery) {
  return request<LoginLogRecord[]>({
    url: '/system/loginlogs/all', method: 'get', params: stripPagination(params),
  })
}

/** 导出登录日志 */
export function exportLoginLog(params?: LoginLogExportQuery) {
  return requestBlob({
    url: '/system/loginlogs/export', method: 'get', params: stripPagination(params),
  })
}

// ========== 在线用户 (/system/online) ==========

export type OnlineUserQuery = OperationQuery<'get_system_online'>
type OnlineUserAllQuery = OperationQuery<'get_system_online_all'>
export type OnlineUserRecord = ApiSchema<'OnlineUserVo'>

/** 在线用户列表 */
export function listOnlineUser(params: OnlineUserQuery) {
  return request<OnlineUserRecord[]>({ url: '/system/online', method: 'get', params })
}

/** 在线用户不分页 */
export function listOnlineUserNoPage(params?: OnlineUserAllQuery) {
  return request<OnlineUserRecord[]>({
    url: '/system/online/all', method: 'get', params: stripPagination(params),
  })
}

/** 强制下线 */
export function forceLogout(sid: string) {
  return request({ url: `/system/online/${encodeURIComponent(sid)}`, method: 'delete' })
}
