import request from '@/api/request'

// ========== 服务器监控 (/monitor) ==========

/** 服务器信息 */
export function getServerInfo() {
  return request({ url: '/monitor/server', method: 'get' })
}

/** 健康检查 */
export function getHealth() {
  return request({ url: '/monitor/health', method: 'get' })
}

// ========== 操作日志 (/system/operlogs) ==========

export interface OperLogQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  title?: string
  oper_name?: string
  status?: string
  oper_time?: string
}

/** 操作日志分页 */
export function listOperLog(params: OperLogQuery) {
  return request({ url: '/system/operlogs/list', method: 'get', params })
}

/** 清空操作日志 */
export function clearOperLog() {
  return request({ url: '/system/operlogs/clean', method: 'delete' })
}

// ========== 登录日志 (/system/loginlogs) ==========

export interface LoginLogQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  user_name?: string
  status?: string
  login_time?: string
}

/** 登录日志分页 */
export function listLoginLog(params: LoginLogQuery) {
  return request({ url: '/system/loginlogs/list', method: 'get', params })
}

/** 清空登录日志 */
export function clearLoginLog() {
  return request({ url: '/system/loginlogs/clean', method: 'delete' })
}

// ========== 在线用户 (/system/online) ==========

export interface OnlineUserQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  user_name?: string
}

/** 在线用户列表 */
export function listOnlineUser(params: OnlineUserQuery) {
  return request({ url: '/system/online/list', method: 'get', params })
}

/** 强制下线 */
export function forceLogout(tokenId: string) {
  return request({ url: `/system/online/${tokenId}`, method: 'delete' })
}
