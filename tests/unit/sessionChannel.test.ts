import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isSessionContext } from '@/api/modules/sessionContext'
import { sessionContext } from './sessionContextFixtures'

vi.mock('@/i18n', () => ({ translate: (key: string) => key }))

class TestChannel {
  static current: TestChannel
  sent: unknown[] = []
  listener?: (event: { data: unknown }) => void

  constructor() {
    TestChannel.current = this
  }

  addEventListener(_event: string, listener: (event: { data: unknown }) => void) {
    this.listener = listener
  }

  postMessage(message: unknown) {
    this.sent.push(message)
  }

  emit(data: unknown) {
    this.listener?.({ data })
  }
}

const handlers = {
  isTerminating: vi.fn(() => false),
  onAuthenticated: vi.fn(),
  onRefreshFailed: vi.fn(),
  onLogout: vi.fn(),
}
let channel: typeof import('@/app/session/channel')
const operation = (operationId = 'remote-1', startedAt = 1_000, source = 'tab-b') => ({
  source,
  operationId,
  startedAt,
})
const emit = (message: unknown) => TestChannel.current.emit(message)
const start = (value = operation()) => emit({ type: 'refresh-start', ...value })
const authenticated = (value = operation()) =>
  emit({
    type: 'authenticated',
    ...value,
    accessToken: 'new-token',
    sessionContext: sessionContext(false),
  })

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(1_000)
  vi.stubGlobal('crypto', { randomUUID: () => 'tab-a' })
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    location: { origin: 'http://localhost' },
  })
  vi.stubGlobal('BroadcastChannel', TestChannel)
  handlers.isTerminating.mockReturnValue(false)
  channel = await import('@/app/session/channel')
  channel.installSessionChannel(handlers)
})

afterEach(() => {
  channel.invalidateSessionChannelOperations()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('跨标签刷新协调', () => {
  it('只接受当前远端操作，成功响应只应用一次并结清全部等待者', async () => {
    start()
    const current = channel.getRemoteRefreshOperation()!
    const first = channel.waitForRemoteRefresh(current)
    const second = channel.waitForRemoteRefresh(current)
    authenticated(operation('wrong'))
    authenticated(operation('remote-1', 999))
    authenticated(operation('remote-1', 1_000, 'tab-c'))
    expect(handlers.onAuthenticated).not.toHaveBeenCalled()
    authenticated()
    authenticated()
    await expect(first).resolves.toBe('new-token')
    await expect(second).resolves.toBe('new-token')
    expect(handlers.onAuthenticated).toHaveBeenCalledOnce()
    expect(current.pending).toBe(false)
    await expect(channel.waitForRemoteRefresh(current)).rejects.toMatchObject({ status: 409 })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('更新远端操作会转移等待者，旧完成不会写回', async () => {
    start()
    const pending = channel.waitForRemoteRefresh(channel.getRemoteRefreshOperation()!)
    start(operation('remote-2', 1_001))
    authenticated()
    expect(handlers.onAuthenticated).not.toHaveBeenCalled()
    authenticated(operation('remote-2', 1_001))
    await expect(pending).resolves.toBe('new-token')
  })

  it('相同时间按操作编号确定顺序，较早操作和本标签消息无效', () => {
    start(operation('b'))
    start(operation('a'))
    start(operation('c', 999))
    start(operation('c', 1_000, 'tab-a'))
    expect(channel.getRemoteRefreshOperation()?.operationId).toBe('b')
    start(operation('c'))
    expect(channel.getRemoteRefreshOperation()?.operationId).toBe('c')
    emit({ type: 'unknown' })
    expect(handlers.onAuthenticated).not.toHaveBeenCalled()
  })

  it('失败响应传递状态并清理等待者，错操作的失败被忽略', async () => {
    start()
    const pending = channel.waitForRemoteRefresh(channel.getRemoteRefreshOperation()!)
    const rejection = expect(pending).rejects.toMatchObject({ status: 503, kind: 'http' })
    emit({ type: 'refresh-failed', ...operation('other'), status: 401 })
    emit({ type: 'refresh-failed', ...operation(), status: 503 })
    await rejection
    expect(handlers.onRefreshFailed).toHaveBeenCalledExactlyOnceWith(503)
  })

  it('远端超时明确失败，过期成功不会再应用', async () => {
    start()
    const current = channel.getRemoteRefreshOperation()!
    const pending = channel.waitForRemoteRefresh(current)
    const rejection = expect(pending).rejects.toMatchObject({ kind: 'timeout' })
    await vi.advanceTimersByTimeAsync(8_000)
    await rejection
    authenticated()
    expect(current.pending).toBe(false)
    expect(handlers.onAuthenticated).not.toHaveBeenCalled()
  })

  it('没有等待者时，超时结果仍然不能被应用', async () => {
    start()
    const current = channel.getRemoteRefreshOperation()!
    vi.setSystemTime(9_000)
    authenticated()
    expect(current.pending).toBe(false)
    await expect(channel.waitForRemoteRefresh({ ...current, pending: true })).rejects.toMatchObject(
      { status: 409 },
    )
    expect(handlers.onAuthenticated).not.toHaveBeenCalled()
  })

  it('终止状态、退出和本地新操作都会阻止远端结果写回', async () => {
    start()
    const pending = channel.waitForRemoteRefresh(channel.getRemoteRefreshOperation()!)
    const rejection = expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    handlers.isTerminating.mockReturnValue(true)
    authenticated()
    handlers.isTerminating.mockReturnValue(false)
    channel.startLocalRefreshOperation()
    authenticated()
    start(operation('z', 1_001))
    expect(channel.getRemoteRefreshOperation()?.pending).toBe(false)
    channel.invalidateSessionChannelOperations()
    await rejection
    expect(handlers.onAuthenticated).not.toHaveBeenCalled()
    start(operation('stale', 999))
    expect(channel.getRemoteRefreshOperation()).toBeUndefined()
  })

  it('退出消息去重，退出之前的认证不能恢复会话', () => {
    start()
    emit({ type: 'logout', source: 'tab-b', at: 1_001 })
    emit({ type: 'logout', source: 'tab-b', at: 1_001 })
    authenticated()
    expect(handlers.onLogout).toHaveBeenCalledOnce()
    expect(handlers.onAuthenticated).not.toHaveBeenCalled()
  })

  it('本地操作时间单调，广播错误不影响已成功的认证操作', () => {
    const original = TestChannel.current
    channel.installSessionChannel(handlers)
    expect(TestChannel.current).toBe(original)
    const first = channel.startLocalRefreshOperation()
    const second = channel.startLocalRefreshOperation()
    expect(second.startedAt).toBeGreaterThan(first.startedAt)
    const context = sessionContext(false)
    if (!isSessionContext(context)) throw new Error('会话 fixture 无效')
    channel.broadcastAuthenticated(second, 'token', context)
    channel.broadcastRefreshFailed(second, 503)
    channel.broadcastLogout()
    expect(original.sent).toHaveLength(5)
    vi.spyOn(original, 'postMessage').mockImplementation(() => {
      throw new Error('channel closed')
    })
    expect(() => channel.broadcastLogout()).not.toThrow()
  })

  it('缺少随机标识时只进行本地刷新', async () => {
    vi.resetModules()
    vi.stubGlobal('crypto', undefined)
    channel = await import('@/app/session/channel')
    channel.installSessionChannel(handlers)
    const value = channel.startLocalRefreshOperation()
    expect(value.operationId).toMatch(/^local:/)
    expect(TestChannel.current.sent).toHaveLength(0)
  })

  it('没有 randomUUID 时使用加密随机数，非浏览器环境不创建频道', async () => {
    vi.resetModules()
    vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => values.fill(42) })
    vi.stubGlobal('window', undefined)
    channel = await import('@/app/session/channel')
    channel.installSessionChannel(handlers)
    expect(channel.startLocalRefreshOperation().operationId).toContain('0000002a')
    expect(TestChannel.current.sent).toHaveLength(0)
  })
})
