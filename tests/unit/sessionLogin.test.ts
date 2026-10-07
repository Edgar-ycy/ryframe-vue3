import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sessionContext } from './sessionContextFixtures'

const mocks = vi.hoisted(() => ({ challenge: vi.fn(), login: vi.fn(), publish: vi.fn() }))
vi.mock('@/api/modules/auth', () => ({ getCsrfChallenge: mocks.challenge, login: mocks.login }))
vi.mock('@/app/session/lifecycle', () => ({ publishAuthenticatedSession: mocks.publish }))
vi.mock('@/app/tenant-context/coordinator', () => ({
  applyTenantSessionContext: vi.fn(),
  failClosedTenantContext: vi.fn(),
}))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))

let csrf: typeof import('@/app/session/csrf')
let login: typeof import('@/app/session/login')
const credentials = { username: 'tester', password: 'test-password' }

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(1_000)
  mocks.challenge.mockResolvedValue({ data: { csrf_token: 'challenge', expires_in: 30 } })
  csrf = await import('@/app/session/csrf')
  login = await import('@/app/session/login')
})

afterEach(() => vi.useRealTimers())

describe('登录前的 CSRF 挑战', () => {
  it('合并在途请求、复用有效值，在到期偏差边界主动更新', async () => {
    const first = csrf.ensureCsrfToken()
    expect(csrf.ensureCsrfToken()).toBe(first)
    await expect(first).resolves.toBe('challenge')
    await expect(csrf.ensureCsrfToken()).resolves.toBe('challenge')
    expect(mocks.challenge).toHaveBeenCalledOnce()
    vi.setSystemTime(26_000)
    await csrf.ensureCsrfToken()
    expect(mocks.challenge).toHaveBeenCalledTimes(2)
    await csrf.ensureCsrfToken(true)
    expect(mocks.challenge).toHaveBeenCalledTimes(3)
    csrf.invalidateCsrfToken()
    await csrf.ensureCsrfToken()
    expect(mocks.challenge).toHaveBeenCalledTimes(4)
  })

  it.each([{}, { data: {} }, { data: { csrf_token: 'token', expires_in: 0 } }])(
    '拒绝无效挑战并允许下次重试：%j',
    async (response) => {
      mocks.challenge.mockResolvedValueOnce(response)
      await expect(csrf.ensureCsrfToken()).rejects.toMatchObject({ kind: 'invalid_response' })
      await expect(csrf.ensureCsrfToken()).resolves.toBe('challenge')
    },
  )

  it('网络失败会清理 pending，失败值不会缓存', async () => {
    mocks.challenge.mockRejectedValueOnce(new Error('network'))
    await expect(csrf.ensureCsrfToken()).rejects.toThrow('network')
    await expect(csrf.ensureCsrfToken()).resolves.toBe('challenge')
  })
})

describe('密码登录', () => {
  it('租户信息完整但菜单权限不在当前目录时明确报告契约不一致', async () => {
    const context = {
      ...sessionContext(true),
      menus: [
        {
          children: [],
          id: '20009',
          menu_type: 'C',
          name: '配置迁移',
          perm_code: 'system:config-transfer:list',
          route_key: 'system.config-transfer',
          sort: 10,
          status: '1',
          visible: true,
        },
      ],
    }
    mocks.login.mockResolvedValue({ data: { access_token: 'access', session_context: context } })
    await expect(login.authenticateWithPassword(credentials, 'tenant-a')).rejects.toMatchObject({
      kind: 'invalid_response',
      message: 'shell.session.loginResponseInvalid',
    })
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('成功响应校验失败后重新获取挑战，避免重用已绑定旧 Cookie 的令牌', async () => {
    mocks.login.mockResolvedValueOnce({ data: { access_token: 'access', session_context: {} } })
    await expect(login.authenticateWithPassword(credentials, 'tenant-a')).rejects.toThrow()
    mocks.challenge.mockResolvedValueOnce({ data: { csrf_token: 'new-challenge', expires_in: 30 } })
    const context = sessionContext(false)
    mocks.login.mockResolvedValueOnce({
      data: { access_token: 'access', session_context: context },
    })
    await login.authenticateWithPassword(credentials, 'tenant-a')
    expect(mocks.challenge).toHaveBeenCalledTimes(2)
    expect(mocks.login).toHaveBeenLastCalledWith(
      credentials,
      'tenant-a',
      'new-challenge',
      expect.any(AbortSignal),
    )
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith('access', context)
  })

  it('登录请求失败后也不会重用旧挑战', async () => {
    mocks.login.mockRejectedValueOnce(new Error('denied'))
    await expect(login.authenticateWithPassword(credentials, 'tenant-a')).rejects.toThrow('denied')
    await csrf.ensureCsrfToken()
    expect(mocks.challenge).toHaveBeenCalledTimes(2)
  })

  it('完整校验上下文后才发布身份，并使用同次 CSRF 挑战', async () => {
    const context = sessionContext(false)
    const response = { data: { access_token: 'access', session_context: context } }
    mocks.login.mockResolvedValue(response)
    await expect(login.authenticateWithPassword(credentials, 'tenant-a')).resolves.toBe(response)
    expect(mocks.login).toHaveBeenCalledExactlyOnceWith(
      credentials,
      'tenant-a',
      'challenge',
      expect.any(AbortSignal),
    )
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith('access', context)
  })

  it.each([
    {},
    { data: {} },
    { data: { access_token: '', session_context: sessionContext(false) } },
    { data: { access_token: 'access', session_context: {} } },
    { data: { access_token: 'access', session_context: { ...sessionContext(false), user: {} } } },
  ])('缺少认证数据或上下文时不发布身份：%j', async (response) => {
    mocks.login.mockResolvedValue(response)
    await expect(login.authenticateWithPassword(credentials, 'tenant-a')).rejects.toThrow()
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('挑战失败不发登录请求，登录失败不发布身份', async () => {
    mocks.challenge.mockRejectedValueOnce(new Error('challenge unavailable'))
    await expect(login.authenticateWithPassword(credentials, 'tenant-a')).rejects.toThrow()
    expect(mocks.login).not.toHaveBeenCalled()
    mocks.login.mockRejectedValueOnce(new Error('denied'))
    await expect(login.authenticateWithPassword(credentials, 'tenant-a')).rejects.toThrow('denied')
    expect(mocks.publish).not.toHaveBeenCalled()
  })
})
