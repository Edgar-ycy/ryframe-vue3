import request, { rawRequest } from '@/shared/http/client'
import type { AppLocale } from '@/i18n'
import type {
  ApiSchema,
  OperationData,
  OperationJsonBody,
  OperationQuery,
} from '@/api/contract'

export type UserInfo = ApiSchema<'UserInfo'> & {
  preferred_locale?: AppLocale | null
}
export type LoginResult = Omit<OperationData<'post_auth_login'>, 'user_info'> & {
  user_info: UserInfo
}
export type LoginParams = OperationJsonBody<'post_auth_login'>
export type CsrfChallenge = OperationData<'get_auth_csrf'>
export type CompletePasswordResetParams = OperationJsonBody<'post_auth_password_reset_complete'>
export type ProfileInfo = ApiSchema<'UserProfileResponse'> & {
  preferred_locale?: AppLocale | null
}
export type ProfileUpdateParams = OperationJsonBody<'put_auth_profile'> & {
  preferred_locale?: AppLocale | null
}
export type PasswordChangeParams = OperationJsonBody<'put_auth_profile_password'>

/** 登录 */
export function getCsrfChallenge() {
  return rawRequest<CsrfChallenge>({
    url: '/auth/csrf',
    method: 'get',
    skipAuthRefresh: true,
    skipTenantHeader: true,
  })
}

export function login(data: LoginParams, tenantId: string, csrfToken: string) {
  return request<LoginResult>({
    url: '/auth/login',
    method: 'post',
    data,
    headers: {
      'X-Tenant-Id': tenantId,
      'X-CSRF-Token': csrfToken,
    },
    skipAuthRefresh: true,
  })
}

/** 登出 */
export function logout(csrfToken: string, accessToken?: string) {
  return rawRequest({
    url: '/auth/logout',
    method: 'post',
    headers: {
      'X-CSRF-Token': csrfToken,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    skipAuthRefresh: true,
    skipTenantHeader: true,
  })
}

/** 刷新令牌 */
export function refreshToken(csrfToken: string) {
  return rawRequest<LoginResult>({
    url: '/auth/refresh',
    method: 'post',
    headers: { 'X-CSRF-Token': csrfToken },
    skipAuthRefresh: true,
    skipTenantHeader: true,
  })
}

/** 完成密码重置 */
export function completePasswordReset(data: CompletePasswordResetParams) {
  return request({
    url: '/auth/password-reset/complete',
    method: 'post',
    data,
    headers: { 'X-Tenant-Id': data.tenant_id },
    skipAuthRefresh: true,
  })
}

export function getUserInfo() {
  return request<UserInfo>({
    url: '/auth/me',
    method: 'get',
  })
}

// ========== 验证码 ==========

/** 生成验证码 */
export function getCaptcha(params?: OperationQuery<'get_auth_captcha_generate'>) {
  return request<OperationData<'get_auth_captcha_generate'>>({
    url: '/auth/captcha/generate',
    method: 'get',
    params,
  })
}

/** 校验验证码 */
export function verifyCaptcha(data: OperationJsonBody<'post_auth_captcha_verify'>) {
  return request<OperationData<'post_auth_captcha_verify'>>({
    url: '/auth/captcha/verify',
    method: 'post',
    data,
  })
}

/** 查询验证码开关状态（公开接口） */
export function getCaptchaConfig() {
  return request<OperationData<'get_auth_captcha_config'>>({
    url: '/auth/captcha/config',
    method: 'get',
  })
}

// ========== 个人中心 ==========

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
  return request<OperationData<'put_auth_profile_avatar'>>({
    url: '/auth/profile/avatar',
    method: 'put',
    data,
    timeout: 120000,
  })
}
