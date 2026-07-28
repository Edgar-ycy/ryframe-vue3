import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({
  acknowledgeMessages: vi.fn(),
  getMessageWebSocketTicket: vi.fn(),
  getUnreadMessageCount: vi.fn(),
  listMessages: vi.fn(),
  markAllMessagesRead: vi.fn(),
  markMessageRead: vi.fn(),
}))
const socketHarness = vi.hoisted(() => ({
  instances: [] as Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }>,
}))

vi.mock('@/api/modules/messages', () => api)
vi.mock('@/app/messages/messageSocket', () => ({
  MessageSocket: class {
    readonly start = vi.fn()
    readonly stop = vi.fn()

    constructor() {
      socketHarness.instances.push(this)
    }
  },
}))

import { useMessageStore } from './message'
import { useUserStore } from './user'

const message = {
  id: '42',
  topic: 'system.notice',
  title: '维护通知',
  content: '今晚维护',
  severity: 'warning',
  published_at: '2026-07-26T12:00:00Z',
  acked_at: null,
  read_at: null,
}

async function authenticateMessageStore() {
  const user = useUserStore()
  user.token = 'access-token'
  user.sessionStatus = 'authenticated'
  user.tenantId = 'tenant-a'
  user.userId = '7'
  const store = useMessageStore()
  await store.syncSession()
  return store
}

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
}

describe('消息中心状态', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    socketHarness.instances = []
    api.listMessages.mockResolvedValue({ code: 200, msg: 'ok', data: { records: [message] } })
    api.getUnreadMessageCount.mockResolvedValue({ code: 200, msg: 'ok', data: 1 })
    api.getMessageWebSocketTicket.mockResolvedValue({ code: 200, msg: 'ok', data: { ticket: 'ticket', expires_in: 60 } })
    api.acknowledgeMessages.mockResolvedValue({ code: 200, msg: 'ok', data: 1 })
    api.markMessageRead.mockResolvedValue({ code: 200, msg: 'ok' })
    api.markAllMessagesRead.mockResolvedValue({ code: 200, msg: 'ok', data: 1 })
  })

  afterEach(() => {
    useMessageStore().unbindSession()
    vi.useRealTimers()
  })

  it('按消息 ID 合并投递，并把确认合并为批量请求', async () => {
    const store = await authenticateMessageStore()
    store.receive(message)
    store.receive({ ...message, title: '更新后的维护通知' })

    expect(store.messages).toHaveLength(1)
    expect(store.messages[0]?.title).toBe('更新后的维护通知')
    expect(store.unreadCount).toBe(1)

    await vi.advanceTimersByTimeAsync(500)
    expect(api.acknowledgeMessages).toHaveBeenCalledWith(['42'])
    expect(store.messages[0]?.acked_at).toBeTruthy()
  })

  it('仅在服务端成功后同步已读状态和未读数量', async () => {
    const store = await authenticateMessageStore()
    store.receive(message)
    await store.markRead('42')

    expect(api.markMessageRead).toHaveBeenCalledWith('42')
    expect(store.messages[0]?.read_at).toBeTruthy()
    expect(store.unreadCount).toBe(0)

    store.receive({ ...message, id: '43', title: '第二条消息' })
    await store.markAllRead()
    expect(api.markAllMessagesRead).toHaveBeenCalledTimes(1)
    expect(store.unreadCount).toBe(0)
  })

  it('登录后启动补拉和实时通道，退出后安全关闭资源', async () => {
    const user = useUserStore()
    const store = await authenticateMessageStore()
    store.bindSession()

    expect(api.listMessages).toHaveBeenCalledWith({ limit: 100, unread_only: false })
    expect(api.getUnreadMessageCount).toHaveBeenCalledTimes(1)
    expect(socketHarness.instances).toHaveLength(1)
    expect(socketHarness.instances[0]?.start).toHaveBeenCalledTimes(1)

    user.tenantId = 'tenant-b'
    await flushPromises()
    expect(socketHarness.instances[0]?.stop).toHaveBeenCalledTimes(1)
    expect(socketHarness.instances).toHaveLength(2)
    expect(socketHarness.instances[1]?.start).toHaveBeenCalledTimes(1)

    user.resetState()
    await flushPromises()
    expect(socketHarness.instances[0]?.stop).toHaveBeenCalled()
    expect(store.messages).toEqual([])
    expect(store.connectionStatus).toBe('disconnected')
  })

  it('静默刷新访问令牌时保留当前消息会话和连接', async () => {
    const user = useUserStore()
    const store = await authenticateMessageStore()
    store.bindSession()

    user.token = 'refreshed-access-token'
    await flushPromises()

    expect(socketHarness.instances).toHaveLength(1)
    expect(socketHarness.instances[0]?.stop).not.toHaveBeenCalled()
  })

  it('确认消息失败后按退避时间自动重试', async () => {
    api.acknowledgeMessages
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ code: 200, msg: 'ok', data: 1 })
    const store = await authenticateMessageStore()
    store.receive(message)

    await vi.advanceTimersByTimeAsync(500)
    expect(api.acknowledgeMessages).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(api.acknowledgeMessages).toHaveBeenCalledTimes(2)
    expect(store.messages[0]?.acked_at).toBeTruthy()
  })

  it('受影响行数不一致时以收件箱刷新结果为准', async () => {
    const store = await authenticateMessageStore()
    api.acknowledgeMessages.mockResolvedValueOnce({ code: 200, msg: 'ok', data: 0 })

    await store.acknowledge(['42'])

    expect(api.acknowledgeMessages).toHaveBeenCalledWith(['42'])
    expect(api.listMessages).toHaveBeenCalledTimes(2)
    expect(store.messages[0]?.acked_at).toBeNull()

    api.markAllMessagesRead.mockResolvedValueOnce({ code: 200, msg: 'ok', data: 0 })
    await store.markAllRead()

    expect(api.markAllMessagesRead).toHaveBeenCalledTimes(1)
    expect(api.listMessages).toHaveBeenCalledTimes(3)
    expect(store.messages[0]?.read_at).toBeNull()
    expect(store.unreadCount).toBe(1)
  })
})
