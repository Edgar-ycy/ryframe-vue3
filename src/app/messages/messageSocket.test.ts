import { describe, expect, it, vi } from 'vitest'
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

  close(): void {
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
  it('从 API 基地址推导同源 wss 地址且只把短票据放入查询串', () => {
    expect(buildMessageSocketUrl(
      'short-ticket',
      'https://api.example.com/api/v1',
      'https://console.example.com',
    )).toBe('wss://api.example.com/api/v1/ws?ticket=short-ticket')
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
    expect(parseMessageDelivery({ v: 2, type: 'message' })).toBeUndefined()
    expect(parseMessageDelivery({ v: 1, type: 'hello' })).toBeUndefined()
  })

  it('解析并转交服务端协议错误帧', async () => {
    expect(parseMessageSocketError({
      v: 1,
      type: 'error',
      code: 'invalid_frame',
      message: 'Invalid message frame',
    })).toEqual({ code: 'invalid_frame', message: 'Invalid message frame' })
    expect(parseMessageSocketError({ v: 1, type: 'error', code: 'invalid_frame' })).toBeUndefined()

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
})
