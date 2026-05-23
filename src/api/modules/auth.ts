import request from '@/api/request'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  access_token: string
  refresh_token: string
  expires_in: number
  user_info?: {
    id: number
    username: string
    nickname: string
    email?: string
    phone?: string
    avatar?: string
    roles?: string[]
    perms?: string[]
  }
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
  email?: string
  phone?: string
  roles?: string[]
  perms?: string[]
  permissions?: string[]
}

/** 登录 */
export function login(data: LoginParams) {
  return request<LoginResult>({
    url: '/auth/login',
    method: 'post',
    data,
  })
}

/** 登出 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post',
  })
}

/** 刷新令牌 */
export function refreshToken(data: { refresh_token: string }) {
  return request<LoginResult>({
    url: '/auth/refresh',
    method: 'post',
    data,
  })
}

/** 获取当前用户信息 */
export function getUserInfo() {
  return request<UserInfo>({
    url: '/auth/me',
    method: 'get',
  })
}
