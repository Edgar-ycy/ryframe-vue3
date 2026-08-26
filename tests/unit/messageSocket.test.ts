import { describe, expect, it, vi } from 'vitest'
import {
  decodeMessageSocketFrame,
  parseMessageDelivery,
  parseMessageSocketError,
  parseTenantContextChanged,
} from '@/app/messages/socket/frameCodec'
import {
  buildMessageSocketUrl,
  MessageSocket,
  type MessageSocketLike,
} from '@/app/messages/socket/lifecycle'
import {
  isRealtimeServiceUnavailable,
  reconnectDelay,
  reconnectDelayForError,
} from '@/app/messages/socket/retryPolicy'
import { HttpError } from '@/shared/http/client'

function deliveryFrame() {
  return {
    v: 1,
    type: 'message',
    message: {
      id: '10',
      topic: 'system',
      title: '标题',
      content: '内容',
      severity: 'info',
      payload: null,
      published_at: '2026-08-26T00:00:00Z',
      expires_at: null,
      acked_at: null,
      read_at: null,
    },
  }
}

describe('消息帧编解码', () => {
  it('只接受完整的 v1 投递、上下文和错误帧', () => {
    expect(parseMessageDelivery(deliveryFrame())?.id).toBe('10')
    expect(
      parseTenantContextChanged({
        v: 1,
        type: 'tenant_context_changed',
        authorization_epoch: 12,
        runtime_epoch: '7',
        placement_generation: '3',
        business_data_state: 'active',
      }),
    ).toMatchObject({ authorization_epoch: 12, runtime_epoch: '7' })
    expect(
      parseMessageSocketError({
        v: 1,
        type: 'error',
        code: 'invalid_ticket',
        message: '票据无效',
      }),
    ).toEqual({ code: 'invalid_ticket', message: '票据无效' })
  })

  it('畸形 JSON 与缺字段帧不会进入业务回调', () => {
    expect(decodeMessageSocketFrame('{')).toBeUndefined()
    expect(parseMessageDelivery({ ...deliveryFrame(), v: 2 })).toBeUndefined()
    expect(
      parseTenantContextChanged({
        v: 1,
        type: 'tenant_context_changed',
        authorization_epoch: -1,
      }),
    ).toBeUndefined()
  })
})

describe('消息重试策略', () => {
  it('指数退避具有上限并遵守服务端 Retry-After', () => {
    expect(reconnectDelay(0, () => 0.5)).toBe(500)
    expect(reconnectDelay(20, () => 0.5)).toBe(30_000)
    expect(reconnectDelayForError(0, { retryAfterSeconds: 10 }, () => 0.5)).toBe(10_000)
    expect(reconnectDelayForError(0, { retryAfterSeconds: 120 }, () => 0.5)).toBe(60_000)
  })

  it('只把服务端明确声明的 503 识别为实时降级', () => {
    expect(
      isRealtimeServiceUnavailable(
        new HttpError('不可用', {
          status: 503,
          realtimeStatus: 'unavailable',
        }),
      ),
    ).toBe(true)
    expect(isRealtimeServiceUnavailable(new HttpError('普通故障', { status: 503 }))).toBe(false)
  })
})

describe('消息连接生命周期', () => {
  it('连接后分发投递帧，停止时解除回调并关闭连接', async () => {
    const deliveries: string[] = []
    const states: string[] = []
    let closed: [number | undefined, string | undefined] | undefined
    const socket: MessageSocketLike = {
      readyState: 0,
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
      close: (code, reason) => {
        closed = [code, reason]
      },
      send: vi.fn(),
    }
    const connection = new MessageSocket({
      requestTicket: async () => 'ticket-value',
      apiBaseUrl: '/api',
      origin: 'https://example.test',
      createSocket: (url) => {
        expect(url).toBe('wss://example.test/api/ws?ticket=ticket-value')
        return socket
      },
      onDelivery: (message) => deliveries.push(message.id),
      onStateChange: (state) => states.push(state),
    })

    connection.start()
    await vi.waitFor(() => expect(socket.onmessage).toBeTypeOf('function'))
    socket.onmessage?.({ data: JSON.stringify(deliveryFrame()) } as MessageEvent)
    expect(deliveries).toEqual(['10'])
    expect(states[0]).toBe('connecting')

    connection.stop()
    expect(socket.onmessage).toBeNull()
    expect(closed).toEqual([1000, '消息中心已停止'])
    expect(states.at(-1)).toBe('stopped')
  })

  it('地址构造会清理原查询参数并对票据编码', () => {
    expect(buildMessageSocketUrl('a b', 'http://api.test/base?old=1', 'http://fallback.test')).toBe(
      'ws://api.test/base/ws?ticket=a+b',
    )
  })
})
