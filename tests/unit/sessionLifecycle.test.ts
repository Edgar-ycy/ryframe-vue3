import { mocks } from './sessionLifecycleFixtures'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isSessionContext } from '@/api/modules/sessionContext'
import { sessionContext } from './sessionContextFixtures'

let lifecycle: typeof import('@/app/session/lifecycle')
let HttpError: typeof import('@/shared/http/client').HttpError

beforeEach(async () => {
  vi.resetModules()
  mocks.runtime = true
  mocks.path = '/home'
  mocks.user = { token: 'access', sessionStatus: 'unknown' }
  mocks.resetUser.mockImplementation(() => {
    mocks.user.sessionStatus = 'anonymous'
  })
  mocks.refresh.mockResolvedValue('token')
  mocks.routeReady.mockResolvedValue(undefined)
  mocks.synchronize.mockResolvedValue(undefined)
  mocks.replace.mockResolvedValue(undefined)
  mocks.challenge.mockResolvedValue('challenge')
  mocks.logout.mockResolvedValue(undefined)
  mocks.start.mockReturnValue({ operationId: 'local', startedAt: 10 })
  lifecycle = await import('@/app/session/lifecycle')
  HttpError = (await import('@/shared/http/client')).HttpError
})

describe('会话生命周期', () => {
  it('HTTP 快照原子绑定 scope，缺失身份或凭据时不发送认证上下文', () => {
    lifecycle.installSessionCoordinator()
    const session = mocks.configureHttp.mock.calls[0]![0]
    expect(session.getSnapshot()).toBeUndefined()
    const scope = {
      tenantId: 't',
      subjectId: 'u',
      sessionEpoch: 7,
      signal: new AbortController().signal,
    }
    mocks.scope.mockReturnValue(scope)
    expect(session.getSnapshot()).toEqual({
      accessToken: 'access',
      tenantId: 't',
      sessionEpoch: 7,
      signal: scope.signal,
    })
    mocks.user.token = ''
    expect(session.getSnapshot()).toBeUndefined()
  })

  it('首次认证发布新 scope 并使旧 CSRF 失效', () => {
    const context = sessionContext(false)
    if (!isSessionContext(context)) throw new Error('fixture 无效')
    lifecycle.publishAuthenticatedSession('new', context)
    expect(mocks.apply).toHaveBeenCalledWith('new', context, { forceNewServerStateScope: true })
    expect(mocks.clearChallenge).toHaveBeenCalledOnce()
    expect(mocks.authenticated).toHaveBeenCalledWith(
      { operationId: 'local', startedAt: 10 },
      'new',
      context,
    )
  })

  it.each(['authenticated', 'anonymous'])('已确定状态 %s 不重复初始化', async (status) => {
    mocks.user.sessionStatus = status
    await lifecycle.initializeSession()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('合并并发初始化，在结束后释放 pending', async () => {
    const first = lifecycle.initializeSession()
    expect(lifecycle.initializeSession()).toBe(first)
    await first
    expect(mocks.refresh).toHaveBeenCalledOnce()
    await lifecycle.initializeSession()
    expect(mocks.refresh).toHaveBeenCalledTimes(2)
  })

  it.each([401, 403])('初始化被拒绝 %i 时清除旧身份', async (status) => {
    mocks.refresh.mockRejectedValue(new HttpError('denied', { status, kind: 'http' }))
    await lifecycle.initializeSession()
    expect(mocks.resetUser).toHaveBeenCalledOnce()
    expect(mocks.clearEpoch).toHaveBeenCalledBefore(mocks.resetTenant)
  })

  it('旧初始化刷新取消时不清除已经切换的新身份', async () => {
    mocks.refresh.mockRejectedValue(new HttpError('cancelled', { status: 401, kind: 'cancelled' }))
    await lifecycle.initializeSession()
    expect(mocks.resetUser).not.toHaveBeenCalled()
    expect(mocks.failClosed).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('跨标签授权同步取消不显示过期提示或终止新身份', async () => {
    lifecycle.installSessionCoordinator()
    mocks.routeReady.mockRejectedValue(
      new HttpError('cancelled', { status: 401, kind: 'cancelled' }),
    )
    mocks.installChannel.mock.calls[0]![0].onAuthenticated('new-token', sessionContext(false))
    await vi.waitFor(() => expect(mocks.routeReady).toHaveBeenCalled())
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.publishLogout).not.toHaveBeenCalled()
    expect(mocks.resetUser).not.toHaveBeenCalled()
  })

  it.each([new Error('network'), 'unavailable'])('初始化传输失败时关闭授权投影', async (error) => {
    mocks.refresh.mockRejectedValue(error)
    await lifecycle.initializeSession()
    expect(mocks.failClosed).toHaveBeenCalledOnce()
    expect(mocks.closeViews).toHaveBeenCalledOnce()
    expect(mocks.resetRoutes).toHaveBeenCalledOnce()
    expect(mocks.resetUser).not.toHaveBeenCalled()
    expect(mocks.user.sessionStatus).toBe('unavailable')
  })

  it('clear 合并并发操作，先失效旧代次再清理 Store 和路由', async () => {
    const first = lifecycle.clearSession()
    expect(lifecycle.clearSession()).toBe(first)
    expect(mocks.clearEpoch).toHaveBeenCalledOnce()
    expect(mocks.clearChannel).toHaveBeenCalledOnce()
    expect(mocks.resetUser).not.toHaveBeenCalled()
    expect(mocks.user.sessionStatus).toBe('unknown')
    await first
    for (const action of [
      mocks.clearObservation,
      mocks.resetTenant,
      mocks.resetUser,
      mocks.permissionReset,
      mocks.closeViews,
      mocks.clearChallenge,
      mocks.resetRoutes,
    ]) {
      expect(action).toHaveBeenCalledOnce()
    }
  })

  it.each(['/home', '/login'])('终止 %s 会话时广播退出并恢复终止标记', async (path) => {
    mocks.path = path
    await lifecycle.terminateSession()
    expect(mocks.publishLogout).toHaveBeenCalledOnce()
    expect(mocks.setTerminating.mock.calls).toEqual([[true], [false]])
    expect(mocks.replace).toHaveBeenCalledTimes(path === '/login' ? 0 : 1)
  })

  it('退出会等待在途刷新结束，并使用清理前捕获的 token', async () => {
    const order: string[] = []
    mocks.pendingRefresh.mockReturnValue(Promise.resolve().then(() => order.push('refresh')))
    mocks.logout.mockImplementation(async () => {
      order.push('logout')
    })
    await lifecycle.logoutSession()
    expect(order).toEqual(['refresh', 'logout'])
    expect(mocks.logout).toHaveBeenCalledWith('challenge', 'access')
    expect(mocks.challenge).toHaveBeenCalledWith(true)
  })

  it('远端退出失败仍清理本地身份，无 token 和无路由也能完成', async () => {
    mocks.runtime = false
    mocks.user.token = ''
    mocks.pendingRefresh.mockReturnValue(Promise.reject(new Error('refresh failed')))
    mocks.logout.mockRejectedValue(new Error('offline'))
    await lifecycle.logoutSession()
    expect(mocks.logout).toHaveBeenCalledWith('challenge', undefined)
    expect(mocks.warning).toHaveBeenCalledOnce()
    expect(mocks.setTerminating).toHaveBeenLastCalledWith(false)
  })

  it('跨标签认证按授权范围决定同步路线，远端退出不会再次广播', async () => {
    lifecycle.installSessionCoordinator()
    const handlers = mocks.installChannel.mock.calls[0]![0]
    handlers.onAuthenticated('token', sessionContext(false))
    expect(mocks.routeReady).toHaveBeenCalledWith(true)
    mocks.apply.mockReturnValue(true)
    handlers.onAuthenticated('token', sessionContext(false))
    expect(mocks.synchronize).toHaveBeenCalledWith({ skipAuthRefresh: true, refreshContext: false })
    handlers.onRefreshFailed()
    handlers.onLogout()
    await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'))
    expect(mocks.publishLogout).not.toHaveBeenCalled()
  })

  it.each([401, 503, undefined])('认证同步失败 %s 进入对应恢复状态', async (status) => {
    lifecycle.installSessionCoordinator()
    mocks.routeReady.mockRejectedValue(
      status ? new HttpError('failed', { status }) : new Error('failed'),
    )
    mocks.installChannel.mock.calls[0]![0].onAuthenticated('token', sessionContext(false))
    await vi.waitFor(() => expect(mocks.error).toHaveBeenCalledOnce())
    if (status === 401) expect(mocks.publishLogout).toHaveBeenCalledOnce()
    else expect(mocks.failClosed).toHaveBeenCalledOnce()
  })

  it.each([401, 403, 404, 423, 503, 500, undefined])('全局错误 %s 恰好显示一次', (status) => {
    lifecycle.installSessionCoordinator()
    const reporter = mocks.configureReporter.mock.calls[0]![0]
    reporter(new HttpError('', { status }))
    expect(mocks.error).toHaveBeenCalledOnce()
  })
})
