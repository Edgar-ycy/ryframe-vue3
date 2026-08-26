import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

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
    expect(decodeMessageSocketFrame({ type: 'message' })).toEqual({ type: 'message' })
    expect(parseMessageDelivery(null)).toBeUndefined()
    expect(parseMessageDelivery({ ...deliveryFrame(), v: 2 })).toBeUndefined()
    expect(parseMessageDelivery({ ...deliveryFrame(), type: 'error' })).toBeUndefined()
    expect(parseMessageDelivery({ ...deliveryFrame(), message: [] })).toBeUndefined()
    expect(
      parseMessageDelivery({
        ...deliveryFrame(),
        message: { ...deliveryFrame().message, title: '' },
      }),
    ).toBeUndefined()
    expect(
      parseTenantContextChanged({
        v: 1,
        type: 'tenant_context_changed',
        authorization_epoch: -1,
      }),
    ).toBeUndefined()
    expect(parseTenantContextChanged([])).toBeUndefined()
    expect(parseTenantContextChanged({ v: 2, type: 'tenant_context_changed' })).toBeUndefined()
    expect(
      parseTenantContextChanged({
        v: 1,
        type: 'tenant_context_changed',
        authorization_epoch: 1.5,
        runtime_epoch: '01',
        placement_generation: '-1',
        business_data_state: 'unknown',
      }),
    ).toBeUndefined()
    expect(parseMessageSocketError(null)).toBeUndefined()
    expect(parseMessageSocketError({ v: 2, type: 'error' })).toBeUndefined()
    expect(parseMessageSocketError({ v: 1, type: 'message' })).toBeUndefined()
    expect(parseMessageSocketError({ v: 1, type: 'error', code: 1, message: '' })).toBeUndefined()
  })

  it('规范化可选消息字段并保留合法业务状态', () => {
    expect(
      parseMessageDelivery({
        ...deliveryFrame(),
        message: {
          ...deliveryFrame().message,
          payload: { action: 'open' },
          expires_at: 10,
          acked_at: '2026-08-26T01:00:00Z',
        },
      }),
    ).toMatchObject({
      payload: { action: 'open' },
      expires_at: null,
      acked_at: '2026-08-26T01:00:00Z',
    })

    for (const state of ['provisioning', 'active', 'maintenance', 'failed']) {
      expect(
        parseTenantContextChanged({
          v: 1,
          type: 'tenant_context_changed',
          authorization_epoch: 0,
          runtime_epoch: '0',
          placement_generation: '0',
          business_data_state: state,
        }),
      ).toMatchObject({ business_data_state: state })
    }
  })
})

describe('消息重试策略', () => {
  it('指数退避具有上限并遵守服务端 Retry-After', () => {
    expect(reconnectDelay(0, () => 0.5)).toBe(500)
    expect(reconnectDelay(-1, () => 0)).toBe(400)
    expect(reconnectDelay(20, () => 0.5)).toBe(30_000)
    expect(reconnectDelayForError(0, { retryAfterSeconds: 10 }, () => 0.5)).toBe(10_000)
    expect(reconnectDelayForError(0, { retryAfterSeconds: 120 }, () => 0.5)).toBe(60_000)
    expect(reconnectDelayForError(0, null, () => 0.5)).toBe(500)
    expect(reconnectDelayForError(0, {}, () => 0.5)).toBe(500)
    expect(reconnectDelayForError(0, { retryAfterSeconds: -1 }, () => 0.5)).toBe(500)
    expect(reconnectDelayForError(0, { retryAfterSeconds: 'invalid' }, () => 0.5)).toBe(500)
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
    expect(
      isRealtimeServiceUnavailable(
        new HttpError('不可用', {
          status: 503,
          errorKey: 'service_unavailable',
          retryAfterSeconds: 1,
        }),
      ),
    ).toBe(true)
    expect(isRealtimeServiceUnavailable(new HttpError('普通故障', { status: 503 }))).toBe(false)
    expect(isRealtimeServiceUnavailable(new Error('普通故障'))).toBe(false)
  })
})

function createSocket(readyState = 0): MessageSocketLike & {
  close: ReturnType<typeof vi.fn<(code?: number, reason?: string) => void>>
} {
  return {
    readyState,
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    close: vi.fn(),
    send: vi.fn(),
  }
}

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
    expect(buildMessageSocketUrl('secure', 'https://api.test/', 'http://fallback.test')).toBe(
      'wss://api.test/ws?ticket=secure',
    )
  })

  it('打开连接后发送心跳并分发上下文和协议错误', async () => {
    vi.useFakeTimers()
    const socket = createSocket(1)
    const contextChanged = vi.fn()
    const protocolError = vi.fn()
    const connection = new MessageSocket({
      requestTicket: async () => 'ticket',
      createSocket: () => socket,
      apiBaseUrl: '/api',
      origin: 'https://example.test',
      onDelivery: vi.fn(),
      onTenantContextChanged: contextChanged,
      onProtocolError: protocolError,
    })

    connection.start()
    await vi.waitFor(() => expect(socket.onopen).toBeTypeOf('function'))
    socket.onopen?.(new Event('open'))
    await vi.advanceTimersByTimeAsync(25_000)
    expect(socket.send).toHaveBeenCalledWith('{"v":1,"type":"ping"}')

    socket.onmessage?.({
      data: JSON.stringify({
        v: 1,
        type: 'tenant_context_changed',
        authorization_epoch: 1,
        runtime_epoch: '2',
        placement_generation: '3',
        business_data_state: 'active',
      }),
    } as MessageEvent)
    socket.onmessage?.({
      data: JSON.stringify({ v: 1, type: 'error', code: 'expired', message: '已过期' }),
    } as MessageEvent)
    socket.onmessage?.({ data: '{}' } as MessageEvent)

    expect(contextChanged).toHaveBeenCalledOnce()
    expect(protocolError).toHaveBeenCalledWith({ code: 'expired', message: '已过期' })
    connection.stop()
  })

  it('票据失败会按普通和降级策略调度重连', async () => {
    const callbacks: Array<() => void> = []
    const delays: number[] = []
    const states: string[] = []
    const requestTicket = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(
        new HttpError('不可用', {
          status: 503,
          realtimeStatus: 'unavailable',
          retryAfterSeconds: 2,
        }),
      )
    const connection = new MessageSocket({
      requestTicket,
      onDelivery: vi.fn(),
      onStateChange: (state) => states.push(state),
      random: () => 0.5,
      schedule: (callback, delay) => {
        callbacks.push(callback)
        delays.push(delay)
        return callbacks.length as unknown as ReturnType<typeof setTimeout>
      },
    })

    connection.start()
    await vi.waitFor(() => expect(callbacks).toHaveLength(1))
    expect(delays[0]).toBe(500)
    expect(states).toContain('retrying')

    callbacks.shift()?.()
    await vi.waitFor(() => expect(callbacks).toHaveLength(1))
    expect(delays[1]).toBe(2_000)
    expect(states).toContain('degraded')
    connection.stop()
  })

  it('连接错误、关闭与停止都会保持单一重连计划', async () => {
    const socket = createSocket(1)
    const schedule = vi.fn(() => 7 as unknown as ReturnType<typeof setTimeout>)
    const clearSchedule = vi.fn()
    const connection = new MessageSocket({
      requestTicket: async () => 'ticket',
      createSocket: () => socket,
      apiBaseUrl: '/api',
      origin: 'https://example.test',
      onDelivery: vi.fn(),
      schedule,
      clearSchedule,
    })

    connection.start()
    await vi.waitFor(() => expect(socket.onerror).toBeTypeOf('function'))
    socket.onerror?.(new Event('error'))
    expect(socket.close).toHaveBeenCalledOnce()
    socket.onclose?.({} as CloseEvent)
    socket.onclose?.({} as CloseEvent)
    expect(schedule).toHaveBeenCalledOnce()

    connection.stop()
    expect(clearSchedule).toHaveBeenCalledWith(7)
  })

  it('已关闭连接的错误回调直接调度且不会重复安排', async () => {
    const socket = createSocket(2)
    const schedule = vi.fn(() => 8 as unknown as ReturnType<typeof setTimeout>)
    const connection = new MessageSocket({
      requestTicket: async () => 'ticket',
      createSocket: () => socket,
      apiBaseUrl: '/api',
      origin: 'https://example.test',
      onDelivery: vi.fn(),
      schedule,
    })

    connection.start()
    await vi.waitFor(() => expect(socket.onerror).toBeTypeOf('function'))
    socket.onerror?.(new Event('error'))
    socket.onerror?.(new Event('error'))
    expect(socket.close).not.toHaveBeenCalled()
    expect(schedule).toHaveBeenCalledOnce()
    connection.stop()
  })

  it('创建连接期间停止会立即关闭已失效的连接', async () => {
    const socket = createSocket()
    const connection = new MessageSocket({
      requestTicket: async () => 'ticket',
      createSocket: () => {
        connection.stop()
        return socket
      },
      apiBaseUrl: '/api',
      origin: 'https://example.test',
      onDelivery: vi.fn(),
    })

    connection.start()
    await vi.waitFor(() => expect(socket.close).toHaveBeenCalledWith(1000, '已失效的消息连接'))
  })

  it('停止后丢弃尚未返回的票据且不创建连接', async () => {
    let resolveTicket: ((ticket: string) => void) | undefined
    const socketFactory = vi.fn(() => createSocket())
    const connection = new MessageSocket({
      requestTicket: () =>
        new Promise((resolve) => {
          resolveTicket = resolve
        }),
      createSocket: socketFactory,
      onDelivery: vi.fn(),
    })

    connection.start()
    connection.start()
    connection.stop()
    resolveTicket?.('late-ticket')
    await Promise.resolve()
    expect(socketFactory).not.toHaveBeenCalled()
  })

  it('无浏览器环境时拒绝使用默认来源', () => {
    expect(() => buildMessageSocketUrl('ticket', '/api')).toThrow(
      '消息 WebSocket 只能在浏览器环境中创建',
    )
  })

  it('默认浏览器适配器使用当前来源创建原生连接', async () => {
    const socket = createSocket()
    const WebSocketConstructor = vi.fn(function () {
      return socket
    })
    vi.stubGlobal('window', { location: { origin: 'https://browser.test' } })
    vi.stubGlobal('WebSocket', WebSocketConstructor)
    const connection = new MessageSocket({
      requestTicket: async () => 'ticket',
      apiBaseUrl: '/api',
      onDelivery: vi.fn(),
    })

    connection.start()
    await vi.waitFor(() =>
      expect(WebSocketConstructor).toHaveBeenCalledWith('wss://browser.test/api/ws?ticket=ticket'),
    )
    connection.stop()
  })

  it('浏览器不支持 WebSocket 时进入重试状态', async () => {
    const schedule = vi.fn(() => 9 as unknown as ReturnType<typeof setTimeout>)
    vi.stubGlobal('window', { location: { origin: 'https://browser.test' } })
    vi.stubGlobal('WebSocket', undefined)
    const connection = new MessageSocket({
      requestTicket: async () => 'ticket',
      apiBaseUrl: '/api',
      onDelivery: vi.fn(),
      schedule,
    })

    connection.start()
    await vi.waitFor(() => expect(schedule).toHaveBeenCalledOnce())
    connection.stop()
  })
})
