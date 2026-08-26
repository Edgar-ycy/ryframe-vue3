import type { MessageRecord } from '@/api/modules/messages'
import type { TenantContextChangedFrame } from '@/app/tenant-context/contextRefresh'
import { runtimeConfig } from '@/shared/config/runtimeConfig'
import type { MessageSocketState } from '@/shared/messages/connection'
import {
  decodeMessageSocketFrame,
  parseMessageDelivery,
  parseMessageSocketError,
  parseTenantContextChanged,
  type MessageSocketProtocolError,
} from './frameCodec'
import {
  isRealtimeServiceUnavailable,
  reconnectDelayForError,
} from './retryPolicy'

const SOCKET_CONNECTING = 0
const SOCKET_OPEN = 1
const HEARTBEAT_INTERVAL_MS = 25_000

export type { MessageSocketState } from '@/shared/messages/connection'

export interface MessageSocketLike {
  readonly readyState: number
  onopen: ((event: Event) => void) | null
  onclose: ((event: CloseEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  close(code?: number, reason?: string): void
  send(data: string): void
}

export interface MessageSocketOptions {
  requestTicket: () => Promise<string>
  onDelivery: (message: MessageRecord) => void
  onTenantContextChanged?: (frame: TenantContextChangedFrame) => void
  onProtocolError?: (error: MessageSocketProtocolError) => void
  onStateChange?: (state: MessageSocketState) => void
  createSocket?: (url: string) => MessageSocketLike
  apiBaseUrl?: string
  origin?: string
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearSchedule?: (timer: ReturnType<typeof setTimeout>) => void
  random?: () => number
}

/** 根据 API 基地址构造同源的 WebSocket 地址，访问令牌不会出现在 URL 中。 */
export function buildMessageSocketUrl(
  ticket: string,
  apiBaseUrl = runtimeConfig.apiBaseUrl,
  origin = browserOrigin(),
): string {
  const url = new URL(apiBaseUrl, origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/ws`
  url.search = ''
  url.searchParams.set('ticket', ticket)
  return url.toString()
}

/** 管理短票据 WebSocket 的连接、心跳与重连生命周期。 */
export class MessageSocket {
  private active = false
  private reconnectAttempt = 0
  private socket: MessageSocketLike | undefined
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined
  private generation = 0

  constructor(private readonly options: MessageSocketOptions) {}

  start(): void {
    if (this.active) return
    this.active = true
    this.reconnectAttempt = 0
    this.setState('connecting')
    void this.connect()
  }

  stop(): void {
    this.active = false
    this.generation += 1
    this.clearReconnectTimer()
    this.clearHeartbeatTimer()
    const socket = this.socket
    this.socket = undefined
    if (socket && (socket.readyState === SOCKET_CONNECTING || socket.readyState === SOCKET_OPEN)) {
      socket.onopen = null
      socket.onclose = null
      socket.onerror = null
      socket.onmessage = null
      socket.close(1000, '消息中心已停止')
    }
    this.setState('stopped')
  }

  private async connect(): Promise<void> {
    if (!this.active || this.socket) return
    const generation = ++this.generation
    try {
      const ticket = await this.options.requestTicket()
      if (!this.active || generation !== this.generation) return
      const socket = (this.options.createSocket ?? createBrowserSocket)(buildMessageSocketUrl(
        ticket,
        this.options.apiBaseUrl,
        this.options.origin,
      ))
      if (!this.active || generation !== this.generation) {
        socket.close(1000, '已失效的消息连接')
        return
      }
      this.attachSocket(socket, generation)
    }
    catch (error) {
      if (this.active && generation === this.generation) this.scheduleReconnect(error)
    }
  }

  private attachSocket(socket: MessageSocketLike, generation: number): void {
    this.socket = socket
    socket.onopen = () => {
      if (!this.isCurrent(socket, generation)) return
      this.reconnectAttempt = 0
      this.setState('connected')
      this.startHeartbeat(socket)
    }
    socket.onmessage = (event) => this.handleMessage(socket, generation, event.data)
    socket.onerror = () => {
      if (!this.isCurrent(socket, generation)) return
      if (socket.readyState === SOCKET_OPEN || socket.readyState === SOCKET_CONNECTING) socket.close()
      else this.scheduleReconnect()
    }
    socket.onclose = () => {
      if (!this.isCurrent(socket, generation)) return
      this.socket = undefined
      this.clearHeartbeatTimer()
      this.scheduleReconnect()
    }
  }

  private handleMessage(socket: MessageSocketLike, generation: number, raw: unknown): void {
    if (!this.isCurrent(socket, generation)) return
    const frame = decodeMessageSocketFrame(raw)
    const delivery = parseMessageDelivery(frame)
    if (delivery) {
      this.options.onDelivery(delivery)
      return
    }
    const contextChange = parseTenantContextChanged(frame)
    if (contextChange) {
      this.options.onTenantContextChanged?.(contextChange)
      return
    }
    const protocolError = parseMessageSocketError(frame)
    if (protocolError) this.options.onProtocolError?.(protocolError)
  }

  private isCurrent(socket: MessageSocketLike, generation: number): boolean {
    return this.active && this.socket === socket && this.generation === generation
  }

  private scheduleReconnect(error?: unknown): void {
    if (!this.active || this.reconnectTimer !== undefined) return
    const degraded = isRealtimeServiceUnavailable(error)
    const delay = reconnectDelayForError(
      degraded ? 0 : this.reconnectAttempt,
      error,
      this.options.random,
    )
    if (degraded) {
      this.reconnectAttempt = 0
      this.setState('degraded')
    }
    else {
      this.reconnectAttempt += 1
      this.setState('retrying')
    }
    const schedule = this.options.schedule ?? ((callback, timeout) => setTimeout(callback, timeout))
    this.reconnectTimer = schedule(() => {
      this.reconnectTimer = undefined
      if (!degraded) this.setState('connecting')
      void this.connect()
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === undefined) return
    const clear = this.options.clearSchedule ?? clearTimeout
    clear(this.reconnectTimer)
    this.reconnectTimer = undefined
  }

  private startHeartbeat(socket: MessageSocketLike): void {
    this.clearHeartbeatTimer()
    this.heartbeatTimer = setInterval(() => {
      if (!this.isCurrent(socket, this.generation) || socket.readyState !== SOCKET_OPEN) return
      socket.send(JSON.stringify({ v: 1, type: 'ping' }))
    }, HEARTBEAT_INTERVAL_MS)
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer === undefined) return
    clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = undefined
  }

  private setState(state: MessageSocketState): void {
    this.options.onStateChange?.(state)
  }
}

function browserOrigin(): string {
  if (typeof window === 'undefined') throw new Error('消息 WebSocket 只能在浏览器环境中创建')
  return window.location.origin
}

function createBrowserSocket(url: string): MessageSocketLike {
  if (typeof WebSocket === 'undefined') throw new Error('当前浏览器不支持 WebSocket')
  return new WebSocket(url)
}
