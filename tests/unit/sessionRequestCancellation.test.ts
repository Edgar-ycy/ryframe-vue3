import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sessionContext } from './sessionContextFixtures'

const mocks = vi.hoisted(() => ({
  challenge: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  publish: vi.fn(),
  apply: vi.fn(),
  broadcast: vi.fn(),
  failure: vi.fn(),
  routes: vi.fn(),
  user: { token: 'access-a' },
}))
vi.mock('@/api/modules/auth', () => ({
  getCsrfChallenge: mocks.challenge,
  login: mocks.login,
  refreshToken: mocks.refresh,
}))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/stores/tenantContext', () => ({
  useTenantContextStore: () => ({ context: sessionContext(false) }),
}))
vi.mock('@/app/session/lifecycle', () => ({ publishAuthenticatedSession: mocks.publish }))
vi.mock('@/app/tenant-context/coordinator', () => ({
  applyTenantSessionContext: mocks.apply,
  failClosedTenantContext: vi.fn(),
}))
vi.mock('@/app/tenant-context/contextRefresh', () => ({ synchronizeTenantContextUi: mocks.routes }))
vi.mock('@/app/session/channel', () => ({
  broadcastAuthenticated: mocks.broadcast,
  broadcastRefreshFailed: mocks.failure,
  getRemoteRefreshOperation: () => undefined,
  startLocalRefreshOperation: () => ({ operationId: 'local', startedAt: 1 }),
  waitForRemoteRefresh: vi.fn(),
}))

let csrf: typeof import('@/app/session/csrf')
let refresh: typeof import('@/app/session/refresh')
let login: typeof import('@/app/session/login')
let query: typeof import('@/shared/query/client')
let HttpError: typeof import('@/shared/http/client').HttpError
const credentials = { username: 'tester', password: 'test-password' }
const auth = () => ({ data: { access_token: 'late-a', session_context: sessionContext(false) } })
const challenge = (token: string) => ({ data: { csrf_token: token, expires_in: 60 } })

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  query = await import('@/shared/query/client')
  csrf = await import('@/app/session/csrf')
  refresh = await import('@/app/session/refresh')
  login = await import('@/app/session/login')
  HttpError = (await import('@/shared/http/client')).HttpError
  mocks.challenge.mockResolvedValue(challenge('old-csrf'))
  mocks.apply.mockReturnValue(false)
  mocks.routes.mockResolvedValue(undefined)
})
afterEach(() => {
  csrf.invalidateCsrfToken()
  query.deactivateServerStateScope()
})

describe('匿名和认证原始请求的代次取消', () => {
  it('匿名初始化刷新在代次失效时中止传输且不发布认证结果', async () => {
    let signal: AbortSignal | undefined
    mocks.refresh.mockImplementation((_token: string, value: AbortSignal) => {
      signal = value
      return new Promise((_resolve, reject) => {
        value.addEventListener(
          'abort',
          () => reject(new HttpError('aborted', { kind: 'cancelled' })),
          { once: true },
        )
      })
    })
    expect(query.getServerStateScope()).toBeUndefined()
    const pending = refresh.refreshAccessToken()
    const rejected = expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce())
    query.deactivateServerStateScope()
    expect(signal?.aborted).toBe(true)
    await rejected
    expect(mocks.apply).not.toHaveBeenCalled()
    expect(mocks.broadcast).not.toHaveBeenCalled()
  })

  it('普通 token 轮换复用信号，授权变化才递增纪元并中止旧信号', async () => {
    const identity = { tenantId: 'tenant-a', subjectId: '42', authorizationFingerprint: 'a' }
    query.transitionServerStateScope(identity, () => undefined)
    const current = query.getServerStateRequestContext()
    mocks.refresh.mockResolvedValue(auth())
    await expect(refresh.refreshAccessToken()).resolves.toBe('late-a')
    expect(query.getServerStateRequestContext()).toEqual(current)
    expect(current.signal.aborted).toBe(false)
    query.transitionServerStateScope(
      { ...identity, authorizationFingerprint: 'b' },
      () => undefined,
    )
    expect(current.signal.aborted).toBe(true)
    expect(query.getServerStateRequestContext().sessionEpoch).toBe(current.sessionEpoch + 1)
  })

  it('旧 CSRF 结果与 finally 均不能覆盖新请求和缓存', async () => {
    const old = deferred<ReturnType<typeof challenge>>()
    const fresh = deferred<ReturnType<typeof challenge>>()
    mocks.challenge.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
    const first = csrf.ensureCsrfToken()
    const rejected = expect(first).rejects.toMatchObject({ kind: 'cancelled' })
    const signal: AbortSignal = mocks.challenge.mock.calls[0]![0]
    csrf.invalidateCsrfToken()
    expect(signal.aborted).toBe(true)
    const second = csrf.ensureCsrfToken()
    old.resolve(challenge('stale-csrf'))
    await rejected
    expect(csrf.ensureCsrfToken()).toBe(second)
    fresh.resolve(challenge('new-csrf'))
    await expect(second).resolves.toBe('new-csrf')
    await expect(csrf.ensureCsrfToken()).resolves.toBe('new-csrf')
    expect(mocks.challenge).toHaveBeenCalledTimes(2)
  })

  it('旧刷新 finally 不失效新身份的 CSRF 挑战', async () => {
    const old = deferred<ReturnType<typeof auth>>()
    mocks.refresh.mockReturnValueOnce(old.promise)
    const pending = refresh.refreshAccessToken()
    const rejected = expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce())
    query.deactivateServerStateScope()
    mocks.challenge.mockResolvedValue(challenge('new-csrf'))
    await expect(csrf.ensureCsrfToken()).resolves.toBe('new-csrf')
    old.resolve(auth())
    await rejected
    await expect(csrf.ensureCsrfToken()).resolves.toBe('new-csrf')
    expect(mocks.challenge).toHaveBeenCalledTimes(2)
    expect(mocks.apply).not.toHaveBeenCalled()
  })

  it('登录等待 CSRF 时切换身份，不能继续发出旧登录请求', async () => {
    const old = deferred<ReturnType<typeof challenge>>()
    mocks.challenge.mockReturnValueOnce(old.promise)
    const pending = login.authenticateWithPassword(credentials, 'tenant-a')
    const rejected = expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    query.deactivateServerStateScope()
    old.resolve(challenge('stale-csrf'))
    await rejected
    expect(mocks.login).not.toHaveBeenCalled()
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('新代次刷新不复用旧 pending，也不通知旧监听者或被旧 finally 清理', async () => {
    const old = deferred<ReturnType<typeof auth>>()
    const fresh = deferred<ReturnType<typeof auth>>()
    const oldApplied = vi.fn()
    const newApplied = vi.fn()
    mocks.refresh.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
    const first = refresh.refreshAccessToken(oldApplied)
    const rejected = expect(first).rejects.toMatchObject({ kind: 'cancelled' })
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce())
    query.deactivateServerStateScope()
    const second = refresh.refreshAccessToken(newApplied)
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(2))
    const newPending = refresh.getPendingRefresh()
    old.resolve(auth())
    await rejected
    expect(refresh.getPendingRefresh()).toBe(newPending)
    fresh.resolve({ data: { access_token: 'new-b', session_context: sessionContext(false) } })
    await expect(second).resolves.toBe('new-b')
    expect(newApplied).toHaveBeenCalledExactlyOnceWith('new-b')
    expect(oldApplied).not.toHaveBeenCalled()
  })

  it('旧登录响应到达时已取消，不能发布或覆盖新身份', async () => {
    const old = deferred<ReturnType<typeof auth>>()
    mocks.login.mockReturnValueOnce(old.promise)
    const pending = login.authenticateWithPassword(credentials, 'tenant-a')
    const rejected = expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    await vi.waitFor(() => expect(mocks.login).toHaveBeenCalledOnce())
    const signal: AbortSignal = mocks.login.mock.calls[0]![3]
    query.deactivateServerStateScope()
    expect(signal.aborted).toBe(true)
    old.resolve(auth())
    await rejected
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('旧刷新仍挂起时，新代次 token 只交给新监听者', async () => {
    const old = deferred<ReturnType<typeof auth>>()
    const oldApplied = vi.fn()
    const newApplied = vi.fn()
    mocks.refresh.mockReturnValueOnce(old.promise).mockResolvedValueOnce(auth())
    const first = refresh.refreshAccessToken(oldApplied)
    const rejected = expect(first).rejects.toMatchObject({ kind: 'cancelled' })
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce())
    query.deactivateServerStateScope()
    await expect(refresh.refreshAccessToken(newApplied)).resolves.toBe('late-a')
    expect(newApplied).toHaveBeenCalledExactlyOnceWith('late-a')
    expect(oldApplied).not.toHaveBeenCalled()
    old.resolve(auth())
    await rejected
  })
})
