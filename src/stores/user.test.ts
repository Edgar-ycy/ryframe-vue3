import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  login: vi.fn(),
  getUserInfo: vi.fn(),
}))
const session = vi.hoisted(() => ({
  ensureCsrfToken: vi.fn(),
  publishAuthenticatedSession: vi.fn(),
}))

vi.mock('@/api/modules/auth', () => api)
vi.mock('@/app/session/sessionCoordinator', () => session)

const userInfo = {
  id: '42',
  tenant_id: 'tenant-a',
  tenant_name: 'Tenant A',
  username: 'alice',
  nickname: 'Alice',
  avatar: '/avatar.png',
  email: 'alice@example.com',
  phone: '13800000000',
  roles: ['admin'],
  perms: ['*:*:*'],
}

describe('user store memory session', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    session.ensureCsrfToken.mockResolvedValue('csrf-token')
    api.login.mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: { access_token: 'memory-token', expires_in: 3600, user_info: userInfo },
    })
    api.getUserInfo.mockResolvedValue({ code: 200, msg: 'ok', data: userInfo })
  })

  it('logs in with CSRF and publishes an in-memory authenticated session', async () => {
    const { useUserStore } = await import('./user')
    const store = useUserStore()

    await store.login('alice', 'Strong@123', 'tenant-a', 'captcha-id', '1234')

    expect(api.login).toHaveBeenCalledWith({
      username: 'alice',
      password: 'Strong@123',
      captcha_id: 'captcha-id',
      captcha_code: '1234',
    }, 'tenant-a', 'csrf-token')
    expect(session.publishAuthenticatedSession).toHaveBeenCalledWith('memory-token', userInfo)
    expect(store.token).toBe('memory-token')
    expect(store.sessionStatus).toBe('authenticated')
    expect(store.isAdmin).toBe(true)
    expect(store.isSuper).toBe(true)
  })

  it('hydrates user data and resets all credential-bearing memory', async () => {
    const { useUserStore } = await import('./user')
    const store = useUserStore()
    await store.getUserInfo()

    expect(store.username).toBe('alice')
    expect(store.permissions).toEqual(['*:*:*'])

    store.token = 'temporary'
    store.resetState()
    expect(store.token).toBe('')
    expect(store.sessionStatus).toBe('anonymous')
    expect(store.roles).toEqual([])
    expect(store.permissions).toEqual([])
  })

  it('rejects malformed login and profile responses', async () => {
    const { useUserStore } = await import('./user')
    const store = useUserStore()
    api.login.mockResolvedValueOnce({ code: 200, msg: 'ok' })
    await expect(store.login('alice', 'password', 'tenant-a')).rejects.toThrow()

    api.login.mockResolvedValueOnce({
      code: 200,
      msg: 'ok',
      data: { access_token: '', user_info: userInfo },
    })
    await expect(store.login('alice', 'password', 'tenant-a')).rejects.toThrow()

    api.login.mockResolvedValueOnce({
      code: 200,
      msg: 'ok',
      data: { access_token: 'token', user_info: { ...userInfo, tenant_id: '' } },
    })
    await expect(store.login('alice', 'password', 'tenant-a')).rejects.toThrow()

    api.getUserInfo.mockResolvedValueOnce({ code: 200, msg: 'ok' })
    await expect(store.getUserInfo()).rejects.toThrow()
  })

  it('normalizes missing optional profile fields and evaluates non-admin getters', async () => {
    const { useUserStore } = await import('./user')
    const store = useUserStore()
    const minimalInfo = {
      ...userInfo,
      tenant_name: null,
      nickname: null,
      avatar: null,
      email: null,
      phone: null,
      roles: undefined,
      perms: undefined,
    }

    store.applyUserInfo(minimalInfo as never)

    expect(store.tenantName).toBe('tenant-a')
    expect(store.nickname).toBe('')
    expect(store.avatar).toBe('')
    expect(store.email).toBe('')
    expect(store.phone).toBe('')
    expect(store.roles).toEqual([])
    expect(store.permissions).toEqual([])
    expect(store.isAdmin).toBe(false)
    expect(store.isSuper).toBe(false)
    expect(store.isLoggedIn).toBe(false)

    store.permissions = ['*:*:*']
    expect(store.isSuper).toBe(true)
  })
})
