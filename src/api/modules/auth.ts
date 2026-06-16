import request from '@/api/request'
import type { Id, LoginResult, UserInfo } from '@/api/types'

export interface LoginParams {
  username: string
  password: string
  captcha_id?: string
  captcha_code?: string
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

// ========== 验证码 ==========

/** 生成验证码 */
export function getCaptcha(params?: { captcha_type?: string }) {
  return request<{ captcha_id: string; image_base64: string }>({
    url: '/auth/captcha/generate',
    method: 'get',
    params,
  })
}

/** 校验验证码 */
export function verifyCaptcha(data: { captcha_id: string; code: string }) {
  return request<{ valid: boolean }>({
    url: '/auth/captcha/verify',
    method: 'post',
    data,
  })
}

/** 查询验证码开关状态（公开接口） */
export function getCaptchaConfig() {
  return request<{ captcha_enabled: boolean }>({
    url: '/auth/captcha/config',
    method: 'get',
  })
}

// ========== 个人中心 ==========

export interface ProfileInfo {
  /** user_id 为 number|string，后端 Snowflake ID 序列化为字符串避免 JS 精度丢失 */
  user_id: Id
  username: string
  nickname: string
  email?: string
  phone?: string
  avatar?: string
  dept_id?: Id
  dept_name?: string
  status?: string
  login_ip?: string
  login_date?: string
  created_at?: string
  roles?: string[]
  permissions?: string[]
}

export interface ProfileUpdateParams {
  nickname: string
  email?: string
  phone?: string
  sex?: string
}

export interface PasswordChangeParams {
  old_password: string
  new_password: string
}

/** 获取个人信息 */
export function getProfile() {
  return request<ProfileInfo>({
    url: '/auth/profile',
    method: 'get',
  })
}

/** 更新个人信息 */
export function updateProfile(data: ProfileUpdateParams) {
  return request({
    url: '/auth/profile',
    method: 'put',
    data,
  })
}

/** 修改密码 */
export function changePassword(data: PasswordChangeParams) {
  return request({
    url: '/auth/profile/password',
    method: 'put',
    data,
  })
}

/** 更新头像（FormData 直接传文件，不设 Content-Type，浏览器自动加 boundary；后端返回 avatar_url） */
export function updateAvatar(data: FormData) {
  return request<{ avatar_url: string }>({
    url: '/auth/profile/avatar',
    method: 'put',
    data,
  })
}
