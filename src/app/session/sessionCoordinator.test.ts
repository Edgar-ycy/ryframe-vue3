import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'

const authMocks = vi.hoisted(() => ({
  getCsrfChallenge: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
  login: vi.fn(),
  getUserInfo: vi.fn(),
}))

const messageMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}))

const httpMocks = vi.hoisted(() => {
  class TestHttpError extends Error {
    constructor(
      message: string,
      public readonly status?: number,
      public readonly code?: number,
      public readonly cause?: unknown,
      public readonly retryAfterSeconds?: number,
    ) {
      super(message)
      this.name = 'HttpError'
    }
  }

  return {
    configureHttpSession: vi.fn(),
    HttpError: TestHttpError,
  }
})

vi.mock('element-plus', () => ({ ElMessage: messageMocks }))
vi.mock('@/api/modules/auth', () => authMocks)
vi.mock('@/shared/http/client', () => httpMocks)

const userInfo = {
  id: '1001',
  tenant_id: 'system',
  tenant_name: 'System tenant',
  username: 'operator',
  nickname: 'Test user',
  avatar: null,
  email: 'operator@example.com',
  phone: '',
  roles: ['operator'],
  perms: ['system:user:list'],
}

type MessageListener = (event: MessageEvent) => void

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = []

  readonly posted: unknown[] = []
  private readonly listeners = new Set<MessageListener>()

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this)
  }

  addEventListener(_type: string, listener: MessageListener): void {
    this.listeners.add(listener)
  }

  postMessage(message: unknown): void {
    this.posted.push(message)
  }

  emit(data: unknown): void {
    for (const listener of this.listeners) listener({ data } as MessageEvent)
  }

  close(): void {}
}

function runtime(path = '/index') {
  return {
    router: {
      currentRoute: { value: { path } },
      replace: vi.fn(async () => undefined),
    } as unknown as Router,
    refreshAccessibleRoutes: vi.fn(async () => []),
    resetDynamicRoutes: vi.fn(),
  }
}

function installBrowser(): void {
  FakeBroadcastChannel.instances = []
  vi.stubGlobal('window', { setTimeout })
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
}

describe('session coordinator', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    setActivePinia(createPinia())
    authMocks.getCsrfChallenge.mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: { csrf_token: 'csrf-challenge', expires_in: 300 },
    })
    authMocks.refreshToken.mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: { access_token: 'memory-token', expires_in: 3600, user_info: userInfo },
    })
    authMocks.logout.mockResolvedValue({ code: 200, msg: 'ok' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('silently restores once, refreshes routes, and keeps access credentials in memory', async () => {
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime()
    session.installSessionCoordinator(appRuntime)

    await Promise.all([session.initializeSession(), session.initializeSession()])

    expect(authMocks.getCsrfChallenge).toHaveBeenCalledOnce()
    expect(authMocks.refreshToken).toHaveBeenCalledOnce()
    expect(authMocks.refreshToken).toHaveBeenCalledWith('csrf-challenge')
    expect(appRuntime.refreshAccessibleRoutes).toHaveBeenCalledOnce()
    expect(appRuntime.refreshAccessibleRoutes).toHaveBeenCalledWith({ skipAuthRefresh: true })
    expect(useUserStore().token).toBe('memory-token')
    expect(useUserStore().sessionStatus).toBe('authenticated')
    expect(httpMocks.configureHttpSession).toHaveBeenCalledOnce()
  })

  it('single-flights concurrent CSRF and refresh requests', async () => {
    let resolveRefresh!: (value: unknown) => void
    authMocks.refreshToken.mockReturnValueOnce(new Promise(resolve => { resolveRefresh = resolve }))
    const session = await import('./sessionCoordinator')

    const first = session.refreshAccessToken()
    const second = session.refreshAccessToken()
    await vi.waitFor(() => expect(authMocks.refreshToken).toHaveBeenCalledOnce())
    resolveRefresh({
      code: 200,
      msg: 'ok',
      data: { access_token: 'single-flight', expires_in: 3600, user_info: userInfo },
    })

    await expect(first).resolves.toBe('single-flight')
    await expect(second).resolves.toBe('single-flight')
    expect(authMocks.getCsrfChallenge).toHaveBeenCalledOnce()
    expect(authMocks.refreshToken).toHaveBeenCalledOnce()
  })

  it('publishes unique operation IDs and correlates each authentication result', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    session.installSessionCoordinator(runtime())
    const broadcast = FakeBroadcastChannel.instances.at(-1)!

    session.publishAuthenticatedSession('first-token', userInfo)
    session.publishAuthenticatedSession('second-token', userInfo)

    const starts = broadcast.posted.filter(message => (
      typeof message === 'object'
      && message !== null
      && 'type' in message
      && message.type === 'refresh-start'
    )) as Array<{ operationId: string }>
    const completions = broadcast.posted.filter(message => (
      typeof message === 'object'
      && message !== null
      && 'type' in message
      && message.type === 'authenticated'
    )) as Array<{ operationId: string }>

    expect(starts).toHaveLength(2)
    expect(completions).toHaveLength(2)
    expect(completions.map(message => message.operationId))
      .toEqual(starts.map(message => message.operationId))
    expect(new Set(starts.map(message => message.operationId)).size).toBe(2)
  })

  it('uses getRandomValues when randomUUID is unavailable', async () => {
    installBrowser()
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values.set([1, 2, 3, 4])
      return values
    })
    vi.stubGlobal('crypto', { getRandomValues })
    const session = await import('./sessionCoordinator')
    session.installSessionCoordinator(runtime())

    session.publishAuthenticatedSession('fallback-token', userInfo)

    const start = FakeBroadcastChannel.instances.at(-1)!.posted.find(message => (
      typeof message === 'object'
      && message !== null
      && 'type' in message
      && message.type === 'refresh-start'
    )) as { operationId: string }
    expect(getRandomValues).toHaveBeenCalledTimes(2)
    expect(start.operationId).toMatch(
      /^00000001000000020000000300000004:\d+:00000001000000020000000300000004$/,
    )
  })

  it('keeps authentication local when secure randomness is unavailable', async () => {
    installBrowser()
    vi.stubGlobal('crypto', undefined)
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')

    session.installSessionCoordinator(runtime())
    expect(FakeBroadcastChannel.instances).toHaveLength(0)

    expect(() => session.publishAuthenticatedSession('local-token', userInfo)).not.toThrow()
    expect(useUserStore().token).toBe('local-token')
    expect(FakeBroadcastChannel.instances).toHaveLength(0)
  })

  it('swallows BroadcastChannel send failures after applying local authentication', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    session.installSessionCoordinator(runtime())
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    vi.spyOn(broadcast, 'postMessage').mockImplementation(() => {
      throw new Error('channel closed')
    })

    expect(() => session.publishAuthenticatedSession('local-token', userInfo)).not.toThrow()

    expect(useUserStore().token).toBe('local-token')
    expect(broadcast.postMessage).toHaveBeenCalledTimes(2)
  })

  it('caches a live challenge, forces a new challenge, and rejects malformed challenges', async () => {
    const session = await import('./sessionCoordinator')

    await expect(Promise.all([session.ensureCsrfToken(), session.ensureCsrfToken()]))
      .resolves.toEqual(['csrf-challenge', 'csrf-challenge'])
    authMocks.getCsrfChallenge.mockResolvedValueOnce({
      code: 200,
      msg: 'ok',
      data: { csrf_token: 'forced-csrf', expires_in: 300 },
    })
    await expect(session.ensureCsrfToken(true)).resolves.toBe('forced-csrf')
    authMocks.getCsrfChallenge.mockResolvedValueOnce({ code: 200, msg: 'ok', data: {} })
    await expect(session.ensureCsrfToken(true)).rejects.toMatchObject({ status: 503 })
    expect(authMocks.getCsrfChallenge).toHaveBeenCalledTimes(3)
  })

  it('retries a 409 exactly once with Retry-After and a fresh challenge', async () => {
    vi.useFakeTimers()
    authMocks.refreshToken
      .mockRejectedValueOnce(new httpMocks.HttpError('in progress', 409, undefined, undefined, 2))
      .mockResolvedValueOnce({
        code: 200,
        msg: 'ok',
        data: { access_token: 'after-conflict', expires_in: 3600, user_info: userInfo },
      })
    authMocks.getCsrfChallenge
      .mockResolvedValueOnce({ code: 200, msg: 'ok', data: { csrf_token: 'csrf-one', expires_in: 300 } })
      .mockResolvedValueOnce({ code: 200, msg: 'ok', data: { csrf_token: 'csrf-two', expires_in: 300 } })
    const session = await import('./sessionCoordinator')

    const refresh = session.refreshAccessToken()
    await vi.advanceTimersByTimeAsync(2_000)
    await expect(refresh).resolves.toBe('after-conflict')

    expect(authMocks.refreshToken).toHaveBeenNthCalledWith(1, 'csrf-one')
    expect(authMocks.refreshToken).toHaveBeenNthCalledWith(2, 'csrf-two')
    expect(authMocks.refreshToken).toHaveBeenCalledTimes(2)
  })

  it('uses a token broadcast by another tab instead of retrying a 409', async () => {
    vi.useFakeTimers()
    installBrowser()
    authMocks.refreshToken.mockRejectedValueOnce(
      new httpMocks.HttpError('in progress', 409, undefined, undefined, 1),
    )
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    session.installSessionCoordinator(runtime())

    const refresh = session.refreshAccessToken()
    await vi.advanceTimersByTimeAsync(500)
    useUserStore().token = 'other-tab-token'
    await vi.advanceTimersByTimeAsync(500)

    await expect(refresh).resolves.toBe('other-tab-token')
    expect(authMocks.refreshToken).toHaveBeenCalledOnce()
  })

  it('applies authenticated broadcasts, refreshes routes, and resolves a remote refresh waiter', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime()
    session.installSessionCoordinator(appRuntime)
    const broadcast = FakeBroadcastChannel.instances.at(-1)!

    const startedAt = Date.now()
    const operationId = 'another-tab:remote-success'
    broadcast.emit({ type: 'refresh-start', source: 'another-tab', operationId, startedAt })
    const refresh = session.refreshAccessToken()
    broadcast.emit({
      type: 'authenticated',
      source: 'another-tab',
      operationId,
      startedAt,
      accessToken: 'remote-token',
      userInfo,
    })

    await expect(refresh).resolves.toBe('remote-token')
    await vi.waitFor(() => expect(appRuntime.refreshAccessibleRoutes).toHaveBeenCalledOnce())
    expect(useUserStore().token).toBe('remote-token')
    expect(authMocks.refreshToken).not.toHaveBeenCalled()
  })

  it('falls back to local refresh after a remote failure broadcast', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    session.installSessionCoordinator(runtime())
    const broadcast = FakeBroadcastChannel.instances.at(-1)!

    const startedAt = Date.now()
    const operationId = 'another-tab:remote-failure'
    broadcast.emit({ type: 'refresh-start', source: 'another-tab', operationId, startedAt })
    const refresh = session.refreshAccessToken()
    broadcast.emit({
      type: 'refresh-failed',
      source: 'another-tab',
      operationId,
      startedAt,
      status: 503,
    })

    await expect(refresh).resolves.toBe('memory-token')
    expect(authMocks.refreshToken).toHaveBeenCalledOnce()
  })

  it('keeps the higher operation ID when remote refreshes share a timestamp', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    session.installSessionCoordinator(runtime())
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    const startedAt = Date.now()

    useUserStore().token = 'current-token'
    broadcast.emit({
      type: 'refresh-start',
      source: 'winning-tab',
      operationId: 'operation-z',
      startedAt,
    })
    const refresh = session.refreshAccessToken()
    broadcast.emit({
      type: 'refresh-start',
      source: 'losing-tab',
      operationId: 'operation-a',
      startedAt,
    })
    broadcast.emit({
      type: 'authenticated',
      source: 'losing-tab',
      operationId: 'operation-a',
      startedAt,
      accessToken: 'losing-token',
      userInfo,
    })
    await Promise.resolve()

    expect(useUserStore().token).toBe('current-token')

    broadcast.emit({
      type: 'authenticated',
      source: 'winning-tab',
      operationId: 'operation-z',
      startedAt,
      accessToken: 'winning-token',
      userInfo,
    })

    await expect(refresh).resolves.toBe('winning-token')
  })

  it('ignores a completion that arrives after its remote operation expires', async () => {
    vi.useFakeTimers()
    installBrowser()
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime()
    session.installSessionCoordinator(appRuntime)
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    const startedAt = Date.now()

    useUserStore().token = 'current-token'
    broadcast.emit({
      type: 'refresh-start',
      source: 'expired-tab',
      operationId: 'expired-operation',
      startedAt,
    })
    await vi.advanceTimersByTimeAsync(8_001)
    broadcast.emit({
      type: 'authenticated',
      source: 'expired-tab',
      operationId: 'expired-operation',
      startedAt,
      accessToken: 'expired-token',
      userInfo,
    })

    expect(useUserStore().token).toBe('current-token')
    expect(appRuntime.refreshAccessibleRoutes).not.toHaveBeenCalled()
  })

  it('takes over locally after a remote refresh waiter times out', async () => {
    vi.useFakeTimers()
    installBrowser()
    const session = await import('./sessionCoordinator')
    session.installSessionCoordinator(runtime())
    const broadcast = FakeBroadcastChannel.instances.at(-1)!

    broadcast.emit({
      type: 'refresh-start',
      source: 'silent-tab',
      operationId: 'silent-operation',
      startedAt: Date.now(),
    })
    const refresh = session.refreshAccessToken()
    await vi.advanceTimersByTimeAsync(8_000)

    await expect(refresh).resolves.toBe('memory-token')
    expect(authMocks.refreshToken).toHaveBeenCalledOnce()
  })

  it('ignores delayed authentication from an older operation after a newer refresh starts', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    session.installSessionCoordinator(runtime())
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    const oldStartedAt = Date.now()
    const newStartedAt = oldStartedAt + 1

    useUserStore().token = 'current-token'
    broadcast.emit({
      type: 'refresh-start',
      source: 'old-tab',
      operationId: 'old-tab:refresh',
      startedAt: oldStartedAt,
    })
    const refresh = session.refreshAccessToken()
    broadcast.emit({
      type: 'refresh-start',
      source: 'new-tab',
      operationId: 'new-tab:refresh',
      startedAt: newStartedAt,
    })
    broadcast.emit({
      type: 'authenticated',
      source: 'old-tab',
      operationId: 'old-tab:refresh',
      startedAt: oldStartedAt,
      accessToken: 'stale-token',
      userInfo,
    })
    await Promise.resolve()

    expect(useUserStore().token).toBe('current-token')
    expect(authMocks.refreshToken).not.toHaveBeenCalled()

    broadcast.emit({
      type: 'authenticated',
      source: 'new-tab',
      operationId: 'new-tab:refresh',
      startedAt: newStartedAt,
      accessToken: 'new-token',
      userInfo,
    })

    await expect(refresh).resolves.toBe('new-token')
    expect(useUserStore().token).toBe('new-token')
  })

  it('does not let a delayed failure from an older operation reject a newer refresh waiter', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    session.installSessionCoordinator(runtime())
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    const oldStartedAt = Date.now()
    const newStartedAt = oldStartedAt + 1

    broadcast.emit({
      type: 'refresh-start',
      source: 'old-tab',
      operationId: 'old-tab:refresh',
      startedAt: oldStartedAt,
    })
    const refresh = session.refreshAccessToken()
    broadcast.emit({
      type: 'refresh-start',
      source: 'new-tab',
      operationId: 'new-tab:refresh',
      startedAt: newStartedAt,
    })
    broadcast.emit({
      type: 'refresh-failed',
      source: 'old-tab',
      operationId: 'old-tab:refresh',
      startedAt: oldStartedAt,
      status: 503,
    })
    await Promise.resolve()

    expect(authMocks.refreshToken).not.toHaveBeenCalled()

    broadcast.emit({
      type: 'authenticated',
      source: 'new-tab',
      operationId: 'new-tab:refresh',
      startedAt: newStartedAt,
      accessToken: 'new-token',
      userInfo,
    })

    await expect(refresh).resolves.toBe('new-token')
  })

  it('does not let an older remote operation override a newer local refresh', async () => {
    installBrowser()
    let resolveRefresh!: (value: unknown) => void
    authMocks.refreshToken.mockReturnValueOnce(new Promise(resolve => { resolveRefresh = resolve }))
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime()
    session.installSessionCoordinator(appRuntime)
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    useUserStore().token = 'current-token'

    const refresh = session.refreshAccessToken()
    await vi.waitFor(() => expect(authMocks.refreshToken).toHaveBeenCalledOnce())
    const localStart = broadcast.posted.find(message => (
      typeof message === 'object'
      && message !== null
      && 'type' in message
      && message.type === 'refresh-start'
    )) as { startedAt: number }
    const oldStartedAt = localStart.startedAt - 1

    broadcast.emit({
      type: 'refresh-start',
      source: 'old-tab',
      operationId: 'old-tab:delayed-refresh',
      startedAt: oldStartedAt,
    })
    broadcast.emit({
      type: 'authenticated',
      source: 'old-tab',
      operationId: 'old-tab:delayed-refresh',
      startedAt: oldStartedAt,
      accessToken: 'stale-token',
      userInfo,
    })
    await Promise.resolve()

    expect(useUserStore().token).toBe('current-token')
    expect(appRuntime.refreshAccessibleRoutes).not.toHaveBeenCalled()

    resolveRefresh({
      code: 200,
      msg: 'ok',
      data: { access_token: 'local-token', expires_in: 3600, user_info: userInfo },
    })

    await expect(refresh).resolves.toBe('local-token')
    expect(useUserStore().token).toBe('local-token')
  })

  it('handles a remote logout once and redirects only when needed', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime('/private')
    session.installSessionCoordinator(appRuntime)
    useUserStore().token = 'memory-token'

    FakeBroadcastChannel.instances.at(-1)!.emit({
      type: 'logout',
      source: 'another-tab',
      at: Date.now(),
    })
    await vi.waitFor(() => expect(appRuntime.router.replace).toHaveBeenCalledWith('/login'))

    expect(useUserStore().sessionStatus).toBe('anonymous')
    expect(appRuntime.resetDynamicRoutes).toHaveBeenCalledOnce()
  })

  it('rejects malformed and schema-smuggling broadcasts without exposing their tokens', async () => {
    installBrowser()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime('/login')
    session.installSessionCoordinator(appRuntime)
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    session.publishAuthenticatedSession('published-token', userInfo)

    for (const message of [
      null,
      { type: 'unknown', source: 'another-tab' },
      { type: 'logout', source: 'another-tab' },
      { type: 'logout', source: 'another-tab', at: Date.now(), unexpected: true },
      {
        type: 'refresh-start',
        source: 'another-tab',
        operationId: 'another-tab:malformed',
        startedAt: 'now',
      },
      {
        type: 'authenticated',
        source: 'another-tab',
        operationId: 'another-tab:forged',
        startedAt: Date.now(),
        accessToken: 'forged-token',
        userInfo: { ...userInfo, perms: ['*:*:*', 1] },
      },
      {
        type: 'authenticated',
        source: 'another-tab',
        operationId: 'another-tab:smuggled',
        startedAt: Date.now(),
        accessToken: 'smuggled-token',
        userInfo,
        logout: true,
      },
    ]) {
      broadcast.emit(message)
    }
    await Promise.resolve()

    expect(useUserStore().token).toBe('published-token')
    expect(useUserStore().sessionStatus).toBe('authenticated')
    expect(appRuntime.resetDynamicRoutes).not.toHaveBeenCalled()
    expect(appRuntime.router.replace).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(consoleWarn).not.toHaveBeenCalled()
  })

  it('ignores self-originated broadcasts and accepts a valid remote logout', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    const appRuntime = runtime('/login')
    session.installSessionCoordinator(appRuntime)
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    session.publishAuthenticatedSession('published-token', userInfo)
    const ownMessage = broadcast.posted.find(message => (
      typeof message === 'object' && message !== null && 'source' in message
    )) as { source?: string } | undefined

    if (ownMessage?.source) {
      broadcast.emit({ type: 'logout', source: ownMessage.source, at: Date.now() })
    }
    broadcast.emit({ type: 'logout', source: 'another-tab', at: Date.now() })
    await vi.waitFor(() => expect(appRuntime.resetDynamicRoutes).toHaveBeenCalledOnce())

    expect(appRuntime.router.replace).not.toHaveBeenCalled()
  })

  it('does not let stale authentication, refresh, or logout messages override a newer logout', async () => {
    installBrowser()
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime('/login')
    session.installSessionCoordinator(appRuntime)
    const broadcast = FakeBroadcastChannel.instances.at(-1)!
    useUserStore().token = 'old-token'
    useUserStore().sessionStatus = 'authenticated'

    const logoutAt = Date.now()
    broadcast.emit({ type: 'logout', source: 'another-tab', at: logoutAt })
    await vi.waitFor(() => expect(appRuntime.resetDynamicRoutes).toHaveBeenCalledOnce())
    session.publishAuthenticatedSession('new-token', userInfo)

    broadcast.emit({
      type: 'authenticated',
      source: 'delayed-tab',
      operationId: 'delayed-tab:stale-operation',
      startedAt: logoutAt - 1,
      accessToken: 'stale-token',
      userInfo,
    })
    broadcast.emit({
      type: 'refresh-start',
      source: 'delayed-tab',
      operationId: 'delayed-tab:stale-operation',
      startedAt: logoutAt - 1,
    })
    broadcast.emit({ type: 'logout', source: 'delayed-tab', at: logoutAt })
    await Promise.resolve()

    expect(useUserStore().token).toBe('new-token')
    expect(useUserStore().sessionStatus).toBe('authenticated')
    expect(appRuntime.resetDynamicRoutes).toHaveBeenCalledOnce()

    await expect(session.refreshAccessToken()).resolves.toBe('memory-token')
    expect(authMocks.refreshToken).toHaveBeenCalledOnce()
  })

  it('marks a 503 unavailable but clears anonymous state for all other initialization failures', async () => {
    authMocks.refreshToken.mockRejectedValueOnce(new httpMocks.HttpError('redis unavailable', 503))
    let session = await import('./sessionCoordinator')
    let user = (await import('@/stores/user')).useUserStore()
    await session.initializeSession()
    expect(user.sessionStatus).toBe('unavailable')

    vi.resetModules()
    setActivePinia(createPinia())
    authMocks.refreshToken.mockRejectedValueOnce(new Error('network failure'))
    session = await import('./sessionCoordinator')
    user = (await import('@/stores/user')).useUserStore()
    await session.initializeSession()
    expect(user.sessionStatus).toBe('anonymous')
  })

  it('retries session initialization after a temporary 503', async () => {
    authMocks.refreshToken
      .mockRejectedValueOnce(new httpMocks.HttpError('redis unavailable', 503))
      .mockResolvedValueOnce({
        code: 200,
        msg: 'ok',
        data: { access_token: 'recovered-token', expires_in: 3600, user_info: userInfo },
      })
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime()
    session.installSessionCoordinator(appRuntime)

    await session.initializeSession()
    expect(useUserStore().sessionStatus).toBe('unavailable')
    await session.initializeSession()

    expect(useUserStore().sessionStatus).toBe('authenticated')
    expect(useUserStore().token).toBe('recovered-token')
    expect(authMocks.refreshToken).toHaveBeenCalledTimes(2)
  })

  it('treats route-loading 401 as refresh failure without recursive refresh', async () => {
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime()
    appRuntime.refreshAccessibleRoutes.mockRejectedValueOnce(
      new httpMocks.HttpError('menu session expired', 401),
    )
    session.installSessionCoordinator(appRuntime)

    await session.initializeSession()

    expect(authMocks.refreshToken).toHaveBeenCalledOnce()
    expect(appRuntime.refreshAccessibleRoutes).toHaveBeenCalledWith({ skipAuthRefresh: true })
    expect(useUserStore().sessionStatus).toBe('anonymous')
  })

  it('exposes refresh failure and error reporting policy through the HTTP adapter', async () => {
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime('/private')
    session.installSessionCoordinator(appRuntime)
    const adapter = httpMocks.configureHttpSession.mock.calls[0]![0]

    await adapter.handleRefreshFailure(new httpMocks.HttpError('unavailable', 503))
    expect(useUserStore().sessionStatus).toBe('unavailable')
    await adapter.handleRefreshFailure(new httpMocks.HttpError('expired', 401))
    expect(appRuntime.router.replace).toHaveBeenCalledWith('/login')

    for (const status of [401, 403, 404, 503, 500, undefined]) {
      adapter.reportError(new httpMocks.HttpError('reported', status))
    }
    expect(messageMocks.error).toHaveBeenCalledTimes(8)
  })

  it('rejects malformed refresh responses and broadcasts refresh failures without leaking tokens', async () => {
    installBrowser()
    authMocks.refreshToken.mockResolvedValueOnce({ code: 200, msg: 'ok', data: {} })
    const session = await import('./sessionCoordinator')
    session.installSessionCoordinator(runtime())

    await expect(session.refreshAccessToken()).rejects.toMatchObject({ status: 401 })
    const posted = FakeBroadcastChannel.instances.at(-1)!.posted
    expect(posted).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'refresh-start' }),
      expect.objectContaining({ type: 'refresh-failed', status: 401 }),
    ]))
  })

  it('always clears memory and redirects without leaking a logout failure', async () => {
    authMocks.logout.mockRejectedValueOnce(new Error('offline'))
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime('/private')
    session.installSessionCoordinator(appRuntime)
    useUserStore().token = 'memory-token'

    await expect(session.logoutSession()).resolves.toBeUndefined()
    expect(useUserStore().sessionStatus).toBe('anonymous')
    expect(appRuntime.router.replace).toHaveBeenCalledWith('/login')
    expect(messageMocks.warning).toHaveBeenCalledOnce()
  })

  it('does not let an in-flight refresh resurrect a local logout', async () => {
    installBrowser()
    let resolveRefresh!: (value: unknown) => void
    authMocks.refreshToken.mockReturnValueOnce(new Promise(resolve => { resolveRefresh = resolve }))
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime('/private')
    session.installSessionCoordinator(appRuntime)
    useUserStore().token = 'old-access-token'
    useUserStore().sessionStatus = 'authenticated'

    const refreshResult = session.refreshAccessToken().catch(error => error)
    await vi.waitFor(() => expect(authMocks.refreshToken).toHaveBeenCalledOnce())
    const logout = session.logoutSession()
    resolveRefresh({
      code: 200,
      msg: 'ok',
      data: { access_token: 'stale-token', expires_in: 3600, user_info: userInfo },
    })

    await expect(logout).resolves.toBeUndefined()
    await expect(refreshResult).resolves.toMatchObject({ status: 401 })
    expect(useUserStore().sessionStatus).toBe('anonymous')
    expect(useUserStore().token).toBe('')
    expect(appRuntime.refreshAccessibleRoutes).not.toHaveBeenCalled()
    expect(authMocks.logout).toHaveBeenCalledWith('csrf-challenge', 'old-access-token')
    expect(FakeBroadcastChannel.instances.at(-1)!.posted).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'authenticated', accessToken: 'stale-token' }),
    ]))
  })

  it('does not let an in-flight refresh resurrect a remote logout', async () => {
    installBrowser()
    let resolveRefresh!: (value: unknown) => void
    authMocks.refreshToken.mockReturnValueOnce(new Promise(resolve => { resolveRefresh = resolve }))
    const session = await import('./sessionCoordinator')
    const { useUserStore } = await import('@/stores/user')
    const appRuntime = runtime('/private')
    session.installSessionCoordinator(appRuntime)
    useUserStore().token = 'old-access-token'
    useUserStore().sessionStatus = 'authenticated'

    const refreshResult = session.refreshAccessToken().catch(error => error)
    await vi.waitFor(() => expect(authMocks.refreshToken).toHaveBeenCalledOnce())
    FakeBroadcastChannel.instances.at(-1)!.emit({
      type: 'logout',
      source: 'another-tab',
      at: Date.now(),
    })
    resolveRefresh({
      code: 200,
      msg: 'ok',
      data: { access_token: 'stale-token', expires_in: 3600, user_info: userInfo },
    })

    await expect(refreshResult).resolves.toMatchObject({ status: 401 })
    await vi.waitFor(() => expect(appRuntime.router.replace).toHaveBeenCalledWith('/login'))
    expect(useUserStore().sessionStatus).toBe('anonymous')
    expect(useUserStore().token).toBe('')
    expect(appRuntime.refreshAccessibleRoutes).not.toHaveBeenCalled()
  })
})
