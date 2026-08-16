import { runtimeConfig } from '@/shared/config/runtimeConfig'
import type { MessageRecord } from '@/api/modules/messages'
import { HttpError } from '@/shared/http/client'

const SOCKET_CONNECTING = 0
const SOCKET_OPEN = 1
const BASE_RECONNECT_DELAY_MS = 500
const MAX_RECONNECT_DELAY_MS = 30_000
const MAX_RETRY_AFTER_DELAY_MS = 60_000
const HEARTBEAT_INTERVAL_MS = 25_000

export type MessageSocketState = 'idle' | 'connecting' | 'connected' | 'retrying' | 'degraded' | 'stopped'

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
  onAuthorizationChanged?: (authorizationEpoch: number) => void
  onProtocolError?: (error: MessageSocketProtocolError) => void
  onStateChange?: (state: MessageSocketState) => void
  createSocket?: (url: string) => MessageSocketLike
  apiBaseUrl?: string
  origin?: string
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearSchedule?: (timer: ReturnType<typeof setTimeout>) => void
  random?: () => number
}

type SocketFrame = {
  v?: unknown
  type?: unknown
  message?: unknown
  code?: unknown
  authorization_epoch?: unknown
}

export interface MessageSocketProtocolError {
  code: string
  message: string
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

/** 计算带抖动的指数退避间隔，避免多个标签页同时重连。 */
export function reconnectDelay(attempt: number, random = Math.random): number {
  const exponent = Math.max(0, Math.min(attempt, 16))
  const base = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** exponent, MAX_RECONNECT_DELAY_MS)
  const jitter = 0.8 + random() * 0.4
  return Math.round(base * jitter)
}

/** 对票据接口的 429/503 等响应遵守 Retry-After，同时保留本地指数退避下限。 */
export function reconnectDelayForError(
  attempt: number,
  error: unknown,
  random = Math.random,
): number {
  const exponential = reconnectDelay(attempt, random)
  if (typeof error !== 'object' || error === null || !('retryAfterSeconds' in error)) {
    return exponential
  }
  const retryAfterSeconds = Number(error.retryAfterSeconds)
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds < 0) return exponential
  return Math.max(
    exponential,
    Math.min(retryAfterSeconds * 1_000, MAX_RETRY_AFTER_DELAY_MS),
  )
}

/**
 * 仅服务端通过专用响应头声明的实时服务不可用才进入低频健康重试。
 * 旧版服务端在同一语义下仅返回 service_unavailable 与 Retry-After 时也兼容降级。
 */
export function isRealtimeServiceUnavailable(error: unknown): boolean {
  if (!(error instanceof HttpError) || error.status !== 503) return false
  return error.realtimeStatus === 'unavailable'
    || (error.errorKey === 'service_unavailable' && error.retryAfterSeconds !== undefined)
}

/** 解析服务端 v1 消息投递帧。 */
export function parseMessageDelivery(raw: unknown): MessageRecord | undefined {
  if (!isRecord(raw)) return undefined
  const frame = raw as SocketFrame
  if (frame.v !== 1 || frame.type !== 'message') return undefined
  return normalizeMessage(frame.message)
}

/** 解析服务端授权纪元变化帧；权限明细由认证接口重新读取。 */
export function parseAuthorizationChanged(raw: unknown): number | undefined {
  if (!isRecord(raw)) return undefined
  const frame = raw as SocketFrame
  if (frame.v !== 1 || frame.type !== 'authorization_changed') return undefined
  const epoch = frame.authorization_epoch
  return typeof epoch === 'number' && Number.isSafeInteger(epoch) && epoch > 0
    ? epoch
    : undefined
}

/** 解析服务端返回的协议错误帧，避免忽略可展示的本地化错误信息。 */
export function parseMessageSocketError(raw: unknown): MessageSocketProtocolError | undefined {
  if (!isRecord(raw)) return undefined
  const frame = raw as SocketFrame
  if (frame.v !== 1 || frame.type !== 'error') return undefined
  if (typeof frame.code !== 'string' || typeof frame.message !== 'string') return undefined
  return { code: frame.code, message: frame.message }
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
      this.socket = socket
      socket.onopen = () => {
        if (!this.isCurrent(socket, generation)) return
        this.reconnectAttempt = 0
        this.setState('connected')
        this.startHeartbeat(socket)
      }
      socket.onmessage = (event) => {
        if (!this.isCurrent(socket, generation)) return
        const frame = parseFrame(event.data)
        const delivery = parseMessageDelivery(frame)
        if (delivery) this.options.onDelivery(delivery)
        else {
          const authorizationEpoch = parseAuthorizationChanged(frame)
          if (authorizationEpoch !== undefined) {
            this.options.onAuthorizationChanged?.(authorizationEpoch)
          }
          else {
            const protocolError = parseMessageSocketError(frame)
            if (protocolError) this.options.onProtocolError?.(protocolError)
          }
        }
      }
      socket.onerror = () => {
        if (!this.isCurrent(socket, generation)) return
        if (socket.readyState === SOCKET_OPEN || socket.readyState === SOCKET_CONNECTING) {
          socket.close()
        }
        else {
          this.scheduleReconnect()
        }
      }
      socket.onclose = () => {
        if (!this.isCurrent(socket, generation)) return
        this.socket = undefined
        this.clearHeartbeatTimer()
        this.scheduleReconnect()
      }
    }
    catch (error) {
      if (this.active && generation === this.generation) this.scheduleReconnect(error)
    }
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
      // 服务端的 Retry-After 是实时服务的健康探测节奏，不能退化为短周期重连。
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
      // 受控降级期间保持明确状态，只有普通网络故障才显示短周期重连中。
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
  if (typeof window === 'undefined') {
    throw new Error('消息 WebSocket 只能在浏览器环境中创建')
  }
  return window.location.origin
}

function createBrowserSocket(url: string): MessageSocketLike {
  if (typeof WebSocket === 'undefined') {
    throw new Error('当前浏览器不支持 WebSocket')
  }
  return new WebSocket(url)
}

function parseFrame(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw) as unknown
  }
  catch {
    return undefined
  }
}

function normalizeMessage(value: unknown): MessageRecord | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id : undefined
  const topic = typeof value.topic === 'string' ? value.topic : undefined
  const title = typeof value.title === 'string' ? value.title : undefined
  const content = typeof value.content === 'string' ? value.content : undefined
  const severity = typeof value.severity === 'string' ? value.severity : undefined
  const publishedAt = typeof value.published_at === 'string' ? value.published_at : undefined
  if (!id || !topic || !title || content === undefined || !severity || !publishedAt) return undefined
  return {
    id,
    topic,
    title,
    content,
    severity,
    payload: value.payload ?? null,
    published_at: publishedAt,
    expires_at: stringOrNull(value.expires_at),
    acked_at: stringOrNull(value.acked_at),
    read_at: stringOrNull(value.read_at),
  }
}

function stringOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  return typeof value === 'string' ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
