import { requestMultipartOperation, requestOperation } from '@/api/operationRequest'
import {
  delete_auth_sessions_by_sid,
  get_auth_captcha_config,
  get_auth_captcha_generate,
  get_auth_csrf,
  get_auth_profile,
  get_auth_sessions,
  post_auth_captcha_verify,
  post_auth_login,
  post_auth_logout,
  post_auth_password_reset_complete,
  post_auth_refresh,
  post_auth_sessions_revoke_others,
  put_auth_profile,
  put_auth_profile_avatar,
  put_auth_profile_password,
} from '@/api/generated/operations'
import type {
  ApiSchema,
  OperationData,
  OperationJsonBody,
  OperationPath,
  OperationQuery,
} from '@/api/contract'

export type UserInfo = ApiSchema<'UserInfo'>
export type LoginResult = OperationData<'post_auth_login'>
export type LoginParams = OperationJsonBody<'post_auth_login'>
export type CsrfChallenge = OperationData<'get_auth_csrf'>
export type CompletePasswordResetParams = OperationJsonBody<'post_auth_password_reset_complete'>
export type ProfileInfo = ApiSchema<'UserProfileResponse'>
export type ProfileUpdateParams = OperationJsonBody<'put_auth_profile'>
export type PasswordChangeParams = OperationJsonBody<'put_auth_profile_password'>
export type AuthSession = OperationData<'get_auth_sessions'>[number]
export type AuthSessionPath = OperationPath<'delete_auth_sessions_by_sid'>
export type RevokeOtherSessionsResult = OperationData<'post_auth_sessions_revoke_others'>

/** 登录 */
export function getCsrfChallenge() {
  return requestOperation(get_auth_csrf, {
    transport: 'raw',
    skipAuthRefresh: true,
    skipTenantHeader: true,
  })
}

export function login(data: LoginParams, tenantId: string, csrfToken: string) {
  return requestOperation(post_auth_login, {
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
  return requestOperation(post_auth_logout, {
    headers: {
      'X-CSRF-Token': csrfToken,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    transport: 'raw',
    skipAuthRefresh: true,
    skipTenantHeader: true,
  })
}

/** 刷新令牌 */
export function refreshToken(csrfToken: string) {
  return requestOperation(post_auth_refresh, {
    headers: { 'X-CSRF-Token': csrfToken },
    transport: 'raw',
    skipAuthRefresh: true,
    skipTenantHeader: true,
  })
}

/** 完成密码重置 */
export function completePasswordReset(data: CompletePasswordResetParams) {
  return requestOperation(post_auth_password_reset_complete, {
    data,
    headers: { 'X-Tenant-Id': data.tenant_id },
    skipAuthRefresh: true,
  })
}

// ========== 验证码 ==========

/** 生成指定租户的验证码 */
export function getCaptcha(
  tenantId: string,
  params?: OperationQuery<'get_auth_captcha_generate'>,
) {
  return requestOperation(get_auth_captcha_generate, {
    params,
    headers: { 'X-Tenant-Id': tenantId },
    skipTenantHeader: true,
  })
}

/** 校验验证码 */
export function verifyCaptcha(data: OperationJsonBody<'post_auth_captcha_verify'>) {
  return requestOperation(post_auth_captcha_verify, { data })
}

/** 查询指定租户的验证码开关状态（公开接口） */
export function getCaptchaConfig(tenantId: string) {
  return requestOperation(get_auth_captcha_config, {
    headers: { 'X-Tenant-Id': tenantId },
    skipTenantHeader: true,
  })
}

// ========== 个人中心 ==========

/** 获取个人信息 */
export function getProfile(signal?: AbortSignal) {
  return requestOperation(get_auth_profile, { signal })
}

/** 更新个人信息 */
export function updateProfile(data: ProfileUpdateParams) {
  return requestOperation(put_auth_profile, { data })
}

/** 修改密码 */
export function changePassword(data: PasswordChangeParams) {
  return requestOperation(put_auth_profile_password, { data })
}

/** 更新头像（FormData 直接传文件，不设 Content-Type，浏览器自动加 boundary；后端返回 avatar_url） */
export function updateAvatar(data: FormData) {
  return requestMultipartOperation(put_auth_profile_avatar, {
    data,
    timeout: 120000,
  })
}

// ========== 登录设备 ==========

/** 获取当前租户、当前用户仍然有效的登录设备。 */
export function getAuthSessions(signal?: AbortSignal) {
  return requestOperation(get_auth_sessions, { signal })
}

/** 精确撤销当前用户的一个登录设备；CSRF 挑战由调用方按当前会话取得。 */
export function revokeAuthSession(
  sid: AuthSessionPath['sid'],
  csrfToken: string,
  signal?: AbortSignal,
) {
  return requestOperation(delete_auth_sessions_by_sid, {
    path: { sid },
    headers: { 'X-CSRF-Token': csrfToken },
    signal,
  })
}

/** 撤销当前用户除当前设备之外的全部登录会话。 */
export function revokeOtherAuthSessions(csrfToken: string, signal?: AbortSignal) {
  return requestOperation(post_auth_sessions_revoke_others, {
    data: {},
    headers: { 'X-CSRF-Token': csrfToken },
    signal,
  })
}
