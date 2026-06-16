import request, { axiosInstance } from '@/api/request'

// ========== 服务器监控 (/monitor) ==========

/** 服务器信息 */
export function getServerInfo() {
  return request({ url: '/monitor/server', method: 'get' })
}

/** 健康检查 */
export function getHealth() {
  return request({ url: '/monitor/health', method: 'get' })
}

/** 缓存统计 */
export function getCacheInfo() {
  return request<CacheInfo>({ url: '/monitor/cache', method: 'get' })
}

/** Redis 命令统计 */
export function getCacheCommands() {
  return request({ url: '/monitor/cache/commands', method: 'get' })
}

/** 数据库连接池 */
export function getDbPool() {
  return request<DbPoolInfo>({ url: '/monitor/db-pool', method: 'get' })
}

export interface RuntimeFeatureFlag {
  key: string
  description: string
  enabled: boolean
  system: boolean
}

export interface RuntimeStatus {
  message_queue: {
    healthy: boolean
  }
  task_queue: {
    len: number | null
  }
  feature_flags: RuntimeFeatureFlag[]
  upload_circuit_breaker: {
    state: string
  }
}

/** 主应用运行时组件状态 */
export function getRuntimeStatus() {
  return request<RuntimeStatus>({ url: '/monitor/runtime', method: 'get' })
}

export interface CacheInfo {
  available: boolean
  mode: string
  server?: {
    version: string
    mode: string
    os: string
    uptime_days: number
    connected_clients: number
  } | null
  keys: {
    total_keys: number
    online_users: number
    captchas: number
    rate_limits: number
    dict_cache: number
    config_cache: number
  }
  memory?: {
    used_memory_human: string
    used_memory_peak_human: string
    mem_fragmentation_ratio: number
    used_memory: number
  } | null
}

export interface DbPoolInfo {
  status: string
  active_connections?: number | null
  timestamp: string
}

/** Prometheus 指标文本 */
export function getMetrics() {
  return axiosInstance.get<string>('/monitor/metrics', {
    responseType: 'text',
  })
}

// ========== 操作日志 (/system/operlogs) ==========

export interface OperLogQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  oper_name?: string
  status?: string
  begin_time?: string
  end_time?: string
}

/** 操作日志分页 */
export function listOperLog(params: OperLogQuery) {
  return request({ url: '/system/operlogs/list', method: 'get', params })
}

/** 操作日志不分页 */
export function listOperLogNoPage(params?: OperLogQuery) {
  return request({ url: '/system/operlogs/listNoPage', method: 'get', params })
}

/** 导出操作日志 */
export function exportOperLog(params?: any) {
  return request({ url: '/system/operlogs/export', method: 'get', params, responseType: 'blob' })
}

/** 清空操作日志 */
export function clearOperLog() {
  return request({ url: '/system/operlogs/clean', method: 'delete' })
}

// ========== 登录日志 (/system/loginlogs) ==========

export interface LoginLogQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  user_name?: string
  status?: string
  begin_time?: string
  end_time?: string
}

/** 登录日志分页 */
export function listLoginLog(params: LoginLogQuery) {
  return request({ url: '/system/loginlogs/list', method: 'get', params })
}

/** 登录日志不分页 */
export function listLoginLogNoPage(params?: LoginLogQuery) {
  return request({ url: '/system/loginlogs/listNoPage', method: 'get', params })
}

/** 导出登录日志 */
export function exportLoginLog(params?: any) {
  return request({ url: '/system/loginlogs/export', method: 'get', params, responseType: 'blob' })
}

/** 清空登录日志 */
export function clearLoginLog() {
  return request({ url: '/system/loginlogs/clean', method: 'delete' })
}

// ========== 在线用户 (/system/online) ==========

export interface OnlineUserQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  username?: string
  ipaddr?: string
}

/** 在线用户列表 */
export function listOnlineUser(params: OnlineUserQuery) {
  return request({ url: '/system/online/list', method: 'get', params })
}

/** 在线用户不分页 */
export function listOnlineUserNoPage(params?: OnlineUserQuery) {
  return request({ url: '/system/online/listNoPage', method: 'get', params })
}

/** 强制下线 */
export function forceLogout(tokenId: string) {
  return request({ url: `/system/online/${tokenId}`, method: 'delete' })
}
