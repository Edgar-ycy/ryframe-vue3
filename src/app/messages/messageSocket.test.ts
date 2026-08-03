import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MessageSocket,
  buildMessageSocketUrl,
  parseMessageDelivery,
  parseMessageSocketError,
  reconnectDelay,
  type MessageSocketLike,
} from './messageSocket'

class FakeSocket implements MessageSocketLike {
  readyState = 0
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null
  readonly sent: string[] = []
  readonly closeCalls: Array<{ code?: number, reason?: string }> = []

  close(code?: number, reason?: string): void {
    this.closeCalls.push({ code, reason })
    this.readyState = 3
    this.onclose?.(new Event('close') as CloseEvent)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  open(): void {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }

  deliver(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent<unknown>)
  }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('消息 WebSocket 客户端', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('从 API 基地址推导同源 wss 地址且只把短票据放入查询串', () => {
    expect(buildMessageSocketUrl(
      'short-ticket',
      'https://api.example.com/api/v1',
      'https://console.example.com',
    )).toBe('wss://api.example.com/api/v1/ws?ticket=short-ticket')
    expect(buildMessageSocketUrl(
      '含 空格',
      '/api/v1/',
      'http://console.example.com',
    )).toBe('ws://console.example.com/api/v1/ws?ticket=%E5%90%AB+%E7%A9%BA%E6%A0%BC')
    expect(() => buildMessageSocketUrl('ticket')).toThrow('只能在浏览器环境中创建')
  })

  it('解析服务端 v1 消息投递帧并拒绝无效负载', () => {
    const delivery = parseMessageDelivery({
      v: 1,
      type: 'message',
      message: {
        id: '42',
        topic: 'system.notice',
        title: '维护通知',
        content: '今晚维护',
        severity: 'warning',
        published_at: '2026-07-26T12:00:00Z',
        acked_at: null,
        read_at: null,
      },
    })

    expect(delivery?.id).toBe('42')
    expect(delivery).toMatchObject({
      payload: null,
      expires_at: undefined,
      acked_at: null,
      read_at: null,
    })
    expect(parseMessageDelivery(null)).toBeUndefined()
    expect(parseMessageDelivery([])).toBeUndefined()
    expect(parseMessageDelivery({ v: 2, type: 'message' })).toBeUndefined()
    expect(parseMessageDelivery({ v: 1, type: 'hello' })).toBeUndefined()
    expect(parseMessageDelivery({ v: 1, type: 'message', message: {} })).toBeUndefined()
    expect(parseMessageDelivery({
      v: 1,
      type: 'message',
      message: {
        id: '43',
        topic: 'system.notice',
        title: '可选字段',
        content: '',
        severity: 'info',
        published_at: '2026-07-26T12:00:00Z',
        expires_at: 123,
        acked_at: '2026-07-26T12:01:00Z',
        read_at: undefined,
      },
    })).toMatchObject({
      id: '43',
      expires_at: null,
      acked_at: '2026-07-26T12:01:00Z',
      read_at: undefined,
    })
  })

  it('解析并转交服务端协议错误帧', async () => {
    expect(parseMessageSocketError({
      v: 1,
      type: 'error',
      code: 'invalid_frame',
      message: 'Invalid message frame',
    })).toEqual({ code: 'invalid_frame', message: 'Invalid message frame' })
    expect(parseMessageSocketError({ v: 1, type: 'error', code: 'invalid_frame' })).toBeUndefined()
    expect(parseMessageSocketError('invalid')).toBeUndefined()
    expect(parseMessageSocketError({ v: 2, type: 'error' })).toBeUndefined()

    const socket = new FakeSocket()
    const onProtocolError = vi.fn()
    const client = new MessageSocket({
      requestTicket: vi.fn(async () => 'ticket'),
      onDelivery: vi.fn(),
      onProtocolError,
      createSocket: () => socket,
      origin: 'https://console.example.com',
    })

    client.start()
    await flushPromises()
    socket.open()
    socket.deliver(JSON.stringify({
      v: 1,
      type: 'error',
      code: 'invalid_frame',
      message: 'Invalid message frame',
    }))

    expect(onProtocolError).toHaveBeenCalledWith({
      code: 'invalid_frame',
      message: 'Invalid message frame',
    })
  })

  it('只向当前连接转交合法消息并忽略损坏帧', async () => {
    const socket = new FakeSocket()
    const onDelivery = vi.fn()
    const client = new MessageSocket({
      requestTicket: vi.fn(async () => 'ticket'),
      onDelivery,
      createSocket: () => socket,
      origin: 'https://console.example.com',
    })

    client.start()
    client.start()
    await flushPromises()
    socket.open()
    socket.deliver('{invalid-json')
    socket.deliver({ v: 1, type: 'hello' })
    socket.deliver(JSON.stringify({
      v: 1,
      type: 'message',
      message: {
        id: '44',
        topic: 'system.notice',
        title: '实时消息',
        content: '正文',
        severity: 'info',
        published_at: '2026-07-26T12:00:00Z',
      },
    }))

    expect(onDelivery).toHaveBeenCalledTimes(1)
    expect(onDelivery).toHaveBeenCalledWith(expect.objectContaining({ id: '44' }))
  })

  it('对关闭连接按退避重新申请一次性票据', async () => {
    const sockets: FakeSocket[] = []
    const scheduled: Array<() => void> = []
    const requestTicket = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('ticket-one')
      .mockResolvedValueOnce('ticket-two')
    const client = new MessageSocket({
      requestTicket,
      onDelivery: vi.fn(),
      createSocket: () => {
        const socket = new FakeSocket()
        sockets.push(socket)
        return socket
      },
      schedule: (callback) => {
        scheduled.push(callback)
        return 1 as unknown as ReturnType<typeof setTimeout>
      },
      clearSchedule: vi.fn(),
      random: () => 0.5,
      origin: 'https://console.example.com',
    })

    client.start()
    await flushPromises()
    expect(requestTicket).toHaveBeenCalledTimes(1)
    sockets[0]?.open()
    sockets[0]?.close()
    expect(scheduled).toHaveLength(1)

    scheduled[0]?.()
    await flushPromises()
    expect(requestTicket).toHaveBeenCalledTimes(2)
    expect(sockets).toHaveLength(2)
  })

  it('停止后不会继续重连，并使用有限的抖动退避', async () => {
    const scheduled: Array<() => void> = []
    const socket = new FakeSocket()
    const client = new MessageSocket({
      requestTicket: vi.fn(async () => 'ticket'),
      onDelivery: vi.fn(),
      createSocket: () => socket,
      schedule: (callback) => {
        scheduled.push(callback)
        return 1 as unknown as ReturnType<typeof setTimeout>
      },
      clearSchedule: vi.fn(),
      origin: 'https://console.example.com',
    })

    client.start()
    await flushPromises()
    socket.open()
    socket.close()
    client.stop()
    scheduled[0]?.()
    await flushPromises()

    expect(reconnectDelay(0, () => 0)).toBe(400)
    expect(reconnectDelay(100, () => 1)).toBeLessThanOrEqual(42_000)
  })

  it('票据失败和套接字错误都会进入单一重连计时器', async () => {
    const scheduled: Array<() => void> = []
    const states: string[] = []
    const requestTicket = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('ticket unavailable'))
      .mockResolvedValueOnce('ticket-two')
    const socket = new FakeSocket()
    const client = new MessageSocket({
      requestTicket,
      onDelivery: vi.fn(),
      onStateChange: state => states.push(state),
      createSocket: () => socket,
      schedule: (callback) => {
        scheduled.push(callback)
        return 1 as unknown as ReturnType<typeof setTimeout>
      },
      origin: 'https://console.example.com',
    })

    client.start()
    await flushPromises()
    expect(states).toEqual(['connecting', 'retrying'])
    expect(scheduled).toHaveLength(1)
    scheduled[0]?.()
    await flushPromises()
    socket.readyState = 3
    socket.onerror?.(new Event('error'))

    expect(requestTicket).toHaveBeenCalledTimes(2)
    expect(scheduled).toHaveLength(2)
  })

  it('打开连接后发送心跳，并在停止时主动正常关闭', async () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const clearSchedule = vi.fn()
    const client = new MessageSocket({
      requestTicket: vi.fn(async () => 'ticket'),
      onDelivery: vi.fn(),
      createSocket: () => socket,
      clearSchedule,
      origin: 'https://console.example.com',
    })

    client.start()
    await flushPromises()
    socket.open()
    await vi.advanceTimersByTimeAsync(25_000)
    expect(socket.sent).toEqual([JSON.stringify({ v: 1, type: 'ping' })])

    client.stop()
    expect(socket.closeCalls).toContainEqual({ code: 1000, reason: '消息中心已停止' })
    expect(clearSchedule).not.toHaveBeenCalled()
  })

  it('创建期间失效的套接字立即关闭且不会成为当前连接', async () => {
    const socket = new FakeSocket()
    const client = new MessageSocket({
      requestTicket: vi.fn(async () => 'ticket'),
      onDelivery: vi.fn(),
      createSocket: () => {
        client.stop()
        return socket
      },
      origin: 'https://console.example.com',
    })

    client.start()
    await flushPromises()

    expect(socket.closeCalls).toContainEqual({ code: 1000, reason: '已失效的消息连接' })
  })
})
