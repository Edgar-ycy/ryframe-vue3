import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { MessageRecord } from '@/api/modules/messages'
import type { MessageSocketOptions } from '@/app/messages/messageSocket'

const api = vi.hoisted(() => ({
  getMessageWebSocketTicket: vi.fn(),
}))
const queryCache = vi.hoisted(() => ({
  cancelMessageState: vi.fn(),
  executeMessageAcknowledgement: vi.fn(),
  receiveMessageDelivery: vi.fn(),
  synchronizeMessageState: vi.fn(),
}))
const socketHarness = vi.hoisted(() => ({
  instances: [] as Array<{
    options: MessageSocketOptions
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock('@/api/modules/messages', () => api)
vi.mock('@/app/messages/messageQueries', () => queryCache)
vi.mock('@/app/messages/messageSocket', () => ({
  MessageSocket: class {
    readonly start = vi.fn()
    readonly stop = vi.fn()

    constructor(readonly options: MessageSocketOptions) {
      socketHarness.instances.push(this)
    }
  },
}))

import { useMessageStore } from './message'
import { useUserStore } from './user'

const message: MessageRecord = {
  id: '42',
  topic: 'system.notice',
  title: '维护通知',
  content: '今晚维护',
  severity: 'warning',
  published_at: '2026-07-26T12:00:00Z',
  acked_at: null,
  read_at: null,
}

function authenticate(): void {
  const user = useUserStore()
  user.token = 'access-token'
  user.sessionStatus = 'authenticated'
  user.tenantId = 'tenant-a'
  user.userId = '7'
}

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
}

describe('消息中心连接状态', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    socketHarness.instances = []
    api.getMessageWebSocketTicket.mockResolvedValue({
      code: 200,
      message: 'ok',
      data: { ticket: 'ticket', expires_in: 60 },
      request_id: 'test',
    })
    queryCache.synchronizeMessageState.mockResolvedValue({ records: [message], next_cursor: null })
    queryCache.executeMessageAcknowledgement.mockResolvedValue(undefined)
  })

  afterEach(() => {
    useMessageStore().unbindSession()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('Pinia 只保存连接状态，投递直接写入 QueryClient 边界', () => {
    authenticate()
    const store = useMessageStore()
    store.bindSession()

    expect('messages' in store).toBe(false)
    expect('unreadCount' in store).toBe(false)
    expect('loading' in store).toBe(false)
    expect(socketHarness.instances).toHaveLength(1)

    socketHarness.instances[0]?.options.onDelivery(message)
    expect(queryCache.receiveMessageDelivery).toHaveBeenCalledWith('tenant-a', '7', message)
  })

  it('身份切换时关闭旧连接并建立新连接，退出后释放资源', async () => {
    authenticate()
    const user = useUserStore()
    const store = useMessageStore()
    store.bindSession()

    user.tenantId = 'tenant-b'
    await flushPromises()
    expect(queryCache.cancelMessageState).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-a',
      '7',
    )
    expect(socketHarness.instances[0]?.stop).toHaveBeenCalledTimes(1)
    expect(socketHarness.instances).toHaveLength(2)
    expect(socketHarness.instances[1]?.start).toHaveBeenCalledTimes(1)

    user.resetState()
    await flushPromises()
    expect(socketHarness.instances[1]?.stop).toHaveBeenCalledTimes(1)
    expect(store.connectionStatus).toBe('disconnected')
  })

  it('刷新访问令牌不重建连接，显式重启会申请新连接', async () => {
    authenticate()
    const user = useUserStore()
    const store = useMessageStore()
    store.bindSession()

    user.token = 'refreshed-access-token'
    await flushPromises()
    expect(socketHarness.instances).toHaveLength(1)
    expect(socketHarness.instances[0]?.stop).not.toHaveBeenCalled()

    store.restartConnection()
    expect(socketHarness.instances[0]?.stop).toHaveBeenCalledTimes(1)
    expect(socketHarness.instances).toHaveLength(2)
  })

  it('协议错误只更新轻量连接状态并可被清除', () => {
    authenticate()
    const store = useMessageStore()
    store.bindSession()

    socketHarness.instances[0]?.options.onProtocolError?.({
      code: 'invalid_frame',
      message: '消息帧无效',
    })
    expect(store.socketError).toBe('消息帧无效')
    store.clearSocketError()
    expect(store.socketError).toBeUndefined()
  })

  it('每次连接成功和每 60 秒补拉，并批量确认未确认消息', async () => {
    vi.stubGlobal('window', {})
    authenticate()
    const store = useMessageStore()
    store.bindSession()

    socketHarness.instances[0]?.options.onStateChange?.('connected')
    await flushPromises()
    expect(queryCache.synchronizeMessageState).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(500)
    expect(queryCache.executeMessageAcknowledgement).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-a',
      '7',
      ['42'],
    )

    socketHarness.instances[0]?.options.onStateChange?.('retrying')
    socketHarness.instances[0]?.options.onStateChange?.('connected')
    await flushPromises()
    expect(queryCache.synchronizeMessageState).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(59_500)
    await flushPromises()
    expect(queryCache.synchronizeMessageState).toHaveBeenCalledTimes(3)
  })

  it('WebSocket 投递确认失败后按指数退避重试', async () => {
    queryCache.executeMessageAcknowledgement
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined)
    authenticate()
    const store = useMessageStore()
    store.bindSession()
    socketHarness.instances[0]?.options.onDelivery(message)

    await vi.advanceTimersByTimeAsync(500)
    expect(queryCache.executeMessageAcknowledgement).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(queryCache.executeMessageAcknowledgement).toHaveBeenCalledTimes(2)
  })
})
