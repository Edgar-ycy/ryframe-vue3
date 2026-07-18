import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  request: vi.fn(async () => ({ code: 200, msg: 'ok' })),
  rawRequest: vi.fn(async () => ({ code: 200, msg: 'ok' })),
}))

vi.mock('@/shared/http/client', () => ({
  default: http.request,
  request: http.request,
  rawRequest: http.rawRequest,
}))

describe('auth API contract adapters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses credentialed raw transport for CSRF and bodyless refresh', async () => {
    const auth = await import('./modules/auth')

    await auth.getCsrfChallenge()
    await auth.refreshToken('csrf-refresh')

    expect(http.rawRequest).toHaveBeenNthCalledWith(1, {
      url: '/auth/csrf',
      method: 'get',
      skipAuthRefresh: true,
      skipTenantHeader: true,
    })
    expect(http.rawRequest).toHaveBeenNthCalledWith(2, {
      url: '/auth/refresh',
      method: 'post',
      headers: { 'X-CSRF-Token': 'csrf-refresh' },
      skipAuthRefresh: true,
      skipTenantHeader: true,
    })
    const rawCalls = http.rawRequest.mock.calls as unknown[][]
    expect(rawCalls[1]?.[0]).not.toHaveProperty('data')
  })

  it('sends login and logout CSRF headers without exposing a refresh token in JSON', async () => {
    const auth = await import('./modules/auth')
    const login = {
      username: 'alice',
      password: 'Strong@123',
      captcha_id: 'captcha',
      captcha_code: '1234',
    }

    await auth.login(login, 'tenant-a', 'csrf-login')
    await auth.logout('csrf-logout', 'access-token')
    await auth.logout('csrf-cookie-only')

    expect(http.request).toHaveBeenNthCalledWith(1, {
      url: '/auth/login',
      method: 'post',
      data: login,
      headers: {
        'X-Tenant-Id': 'tenant-a',
        'X-CSRF-Token': 'csrf-login',
      },
      skipAuthRefresh: true,
    })
    expect(http.rawRequest).toHaveBeenNthCalledWith(1, {
      url: '/auth/logout',
      method: 'post',
      headers: {
        'X-CSRF-Token': 'csrf-logout',
        Authorization: 'Bearer access-token',
      },
      skipAuthRefresh: true,
      skipTenantHeader: true,
    })
    expect(http.rawRequest).toHaveBeenNthCalledWith(2, {
      url: '/auth/logout',
      method: 'post',
      headers: { 'X-CSRF-Token': 'csrf-cookie-only' },
      skipAuthRefresh: true,
      skipTenantHeader: true,
    })
  })

  it('maps profile, password reset, captcha, and avatar operations to the generated contract', async () => {
    const auth = await import('./modules/auth')
    const reset = {
      tenant_id: 'tenant-a',
      token: 'reset-token',
      new_password: 'Changed@123',
    } as Parameters<typeof auth.completePasswordReset>[0]
    const profile = { nickname: 'Alice' } as Parameters<typeof auth.updateProfile>[0]
    const password = {
      old_password: 'Old@123',
      new_password: 'New@123',
    } as Parameters<typeof auth.changePassword>[0]
    const verify = { captcha_id: 'id', code: 'code' } as Parameters<typeof auth.verifyCaptcha>[0]
    const avatar = new FormData()

    await auth.completePasswordReset(reset)
    await auth.getUserInfo()
    await auth.getCaptcha({ type: 'login' } as Parameters<typeof auth.getCaptcha>[0])
    await auth.verifyCaptcha(verify)
    await auth.getCaptchaConfig()
    await auth.getProfile()
    await auth.updateProfile(profile)
    await auth.changePassword(password)
    await auth.updateAvatar(avatar)

    const requestCalls = http.request.mock.calls as unknown[][]
    expect(requestCalls.map(call => call[0])).toEqual([
      expect.objectContaining({ url: '/auth/password-reset/complete', data: reset }),
      expect.objectContaining({ url: '/auth/me', method: 'get' }),
      expect.objectContaining({ url: '/auth/captcha/generate', method: 'get' }),
      expect.objectContaining({ url: '/auth/captcha/verify', data: verify }),
      expect.objectContaining({ url: '/auth/captcha/config', method: 'get' }),
      expect.objectContaining({ url: '/auth/profile', method: 'get' }),
      expect.objectContaining({ url: '/auth/profile', method: 'put', data: profile }),
      expect.objectContaining({ url: '/auth/profile/password', method: 'put', data: password }),
      expect.objectContaining({ url: '/auth/profile/avatar', method: 'put', data: avatar, timeout: 120000 }),
    ])
  })
})
