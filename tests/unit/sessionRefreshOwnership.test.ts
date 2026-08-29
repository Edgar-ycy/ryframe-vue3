import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureHttpSession, HttpError } from '@/shared/http/client'
import { refreshSession } from '@/shared/http/session'

const mocks = vi.hoisted(() => ({
  applyAuthenticatedSession: vi.fn(),
  assertSessionEpoch: vi.fn(),
  broadcastAuthenticated: vi.fn(),
  broadcastRefreshFailed: vi.fn(),
  ensureCsrfToken: vi.fn(),
  ensureRoutesAfterAuthentication: vi.fn(),
  epoch: 1,
  getRemoteRefreshOperation: vi.fn(),
  invalidateCsrfToken: vi.fn(),
  isSessionContext: vi.fn(),
  refreshToken: vi.fn(),
  startLocalRefreshOperation: vi.fn(),
  synchronizeTenantContextUi: vi.fn(),
  tenantContext: { user: { id: '42', tenant_id: 'tenant-a' } },
  terminating: false,
  user: { token: 'token-a' },
  waitForRemoteRefresh: vi.fn(),
}))

vi.mock('@/api/modules/auth', () => ({ refreshToken: mocks.refreshToken }))
vi.mock('@/api/modules/sessionContext', () => ({ isSessionContext: mocks.isSessionContext }))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/stores/tenantContext', () => ({
  useTenantContextStore: () => ({ context: mocks.tenantContext }),
}))
vi.mock('@/app/tenant-context/contextRefresh', () => ({
  synchronizeTenantContextUi: mocks.synchronizeTenantContextUi,
}))
vi.mock('@/app/session/channel', () => ({
  broadcastAuthenticated: mocks.broadcastAuthenticated,
  broadcastRefreshFailed: mocks.broadcastRefreshFailed,
  getRemoteRefreshOperation: mocks.getRemoteRefreshOperation,
  startLocalRefreshOperation: mocks.startLocalRefreshOperation,
  waitForRemoteRefresh: mocks.waitForRemoteRefresh,
}))
vi.mock('@/app/session/csrf', () => ({
  ensureCsrfToken: mocks.ensureCsrfToken,
  invalidateCsrfToken: mocks.invalidateCsrfToken,
}))
vi.mock('@/app/session/state', () => ({
  applyAuthenticatedSession: mocks.applyAuthenticatedSession,
  assertSessionEpoch: mocks.assertSessionEpoch,
  ensureRoutesAfterAuthentication: mocks.ensureRoutesAfterAuthentication,
  getSessionEpoch: () => mocks.epoch,
  isSessionTerminating: () => mocks.terminating,
}))

import { refreshAccessToken } from '@/app/session/refresh'

function prepareLocalRefresh(): void {
  mocks.applyAuthenticatedSession.mockImplementation((accessToken: string) => {
    mocks.user.token = accessToken
    return false
  })
  mocks.ensureCsrfToken.mockResolvedValue('csrf-token')
  mocks.ensureRoutesAfterAuthentication.mockResolvedValue(undefined)
  mocks.getRemoteRefreshOperation.mockReturnValue(undefined)
  mocks.isSessionContext.mockReturnValue(true)
  mocks.startLocalRefreshOperation.mockReturnValue({ id: 'local-refresh' })
  mocks.synchronizeTenantContextUi.mockResolvedValue(undefined)
}

beforeEach(() => {
  mocks.epoch = 1
  mocks.terminating = false
  mocks.user.token = 'token-a'
  prepareLocalRefresh()
})

afterEach(() => {
  vi.unstubAllGlobals()
  configureHttpSession({
    getSnapshot: () => undefined,
    observeTenantContext: () => undefined,
    refreshAccessToken: async () => '',
    handleRefreshFailure: async () => undefined,
  })
})

describe('应用刷新 token 所有权', () => {
  it('仅在本地认证投影应用后立即报告新 token', async () => {
    mocks.refreshToken.mockResolvedValue({
      data: { access_token: 'token-b', session_context: mocks.tenantContext },
    })
    const onAccessTokenApplied = vi.fn()

    await expect(refreshAccessToken(onAccessTokenApplied)).resolves.toBe('token-b')

    expect(mocks.applyAuthenticatedSession).toHaveBeenCalledOnce()
    expect(onAccessTokenApplied).toHaveBeenCalledExactlyOnceWith('token-b')
    expect(mocks.applyAuthenticatedSession.mock.invocationCallOrder[0]).toBeLessThan(
      onAccessTokenApplied.mock.invocationCallOrder[0],
    )
  })

  it('等待其他标签页刷新成功时不报告本地所有权', async () => {
    vi.stubGlobal('window', {})
    mocks.getRemoteRefreshOperation.mockReturnValue({
      expiresAt: Date.now() + 10_000,
      pending: true,
    })
    mocks.waitForRemoteRefresh.mockResolvedValue('token-remote')
    const onAccessTokenApplied = vi.fn()

    await expect(refreshAccessToken(onAccessTokenApplied)).resolves.toBe('token-remote')

    expect(onAccessTokenApplied).not.toHaveBeenCalled()
    expect(mocks.refreshToken).not.toHaveBeenCalled()
    expect(mocks.applyAuthenticatedSession).not.toHaveBeenCalled()
  })

  it('409 后发现其他标签页 token 时不报告本地所有权', async () => {
    mocks.refreshToken.mockImplementation(async () => {
      mocks.user.token = 'token-other-tab'
      throw new HttpError('刷新冲突', { status: 409, retryAfterSeconds: 0 })
    })
    const onAccessTokenApplied = vi.fn()

    await expect(refreshAccessToken(onAccessTokenApplied)).resolves.toBe('token-other-tab')

    expect(onAccessTokenApplied).not.toHaveBeenCalled()
    expect(mocks.refreshToken).toHaveBeenCalledOnce()
    expect(mocks.applyAuthenticatedSession).not.toHaveBeenCalled()
  })

  it('直接刷新已应用 token 后，晚加入的 shared 刷新仍拥有该本地 token', async () => {
    mocks.refreshToken.mockResolvedValue({
      data: { access_token: 'token-b', session_context: mocks.tenantContext },
    })
    let routeStartedResolve!: () => void
    const routeStarted = new Promise<void>((resolve) => {
      routeStartedResolve = resolve
    })
    let rejectRoute!: (error: HttpError) => void
    const routeResult = new Promise<void>((_resolve, reject) => {
      rejectRoute = reject
    })
    mocks.ensureRoutesAfterAuthentication.mockImplementation(() => {
      routeStartedResolve()
      return routeResult
    })

    const directPending = refreshAccessToken()
    const directOutcome = directPending.catch((error: unknown) => error)
    await routeStarted
    expect(mocks.user.token).toBe('token-b')

    let snapshotToken = 'token-a'
    const signal = new AbortController().signal
    const handleRefreshFailure = vi.fn(async (_error: HttpError) => undefined)
    configureHttpSession({
      getSnapshot: () => ({
        accessToken: snapshotToken,
        tenantId: 'tenant-a',
        sessionEpoch: 1,
        signal,
      }),
      observeTenantContext: vi.fn(),
      refreshAccessToken,
      handleRefreshFailure,
    })

    const sharedPending = refreshSession(1)
    const sharedOutcome = sharedPending.catch((error: unknown) => error)
    snapshotToken = 'token-b'
    const routeFailure = new HttpError('路由同步失败', { status: 503, kind: 'http' })
    rejectRoute(routeFailure)

    expect(await directOutcome).toBe(routeFailure)
    expect(await sharedOutcome).toBe(routeFailure)
    expect(handleRefreshFailure).toHaveBeenCalledExactlyOnceWith(routeFailure)
  })
})
