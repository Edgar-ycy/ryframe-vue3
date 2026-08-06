import { defineStore } from 'pinia'
import { getMessageWebSocketTicket } from '@/api/modules/messages'
import {
  cancelMessageState,
  executeMessageAcknowledgement,
  receiveMessageDelivery,
  synchronizeMessageState,
} from '@/app/messages/messageQueries'
import { removeCachedMessages } from '@/app/messages/messageCache'
import {
  MessageSocket,
  type MessageSocketProtocolError,
  type MessageSocketState,
} from '@/app/messages/messageSocket'
import { HttpError } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from './user'

const POLL_INTERVAL_MS = 60_000
const ACK_DEBOUNCE_MS = 500
const ACK_RETRY_BASE_DELAY_MS = 1_000
const ACK_RETRY_MAX_DELAY_MS = 30_000
const ACK_RETRY_AFTER_MAX_DELAY_MS = 60_000
const MAX_PENDING_ACKS = 500
const MAX_DEFERRED_ACKS = 2_000
const MAX_DELETED_MESSAGE_TOMBSTONES = 2_000

type ConnectionStatus = Exclude<MessageSocketState, 'idle' | 'stopped'> | 'disconnected'

interface MessageConnectionState {
  connectionStatus: ConnectionStatus
  socketError?: string
}

interface MessageIdentity {
  tenantId: string
  userId: string
  sessionKey: string
}

interface MessageRuntime {
  sessionKey?: string
  tenantId?: string
  userId?: string
  generation: number
  socket?: MessageSocket
  pollTimer?: ReturnType<typeof setInterval>
  ackTimer?: ReturnType<typeof setTimeout>
  ackInFlight: boolean
  ackRetryAttempt: number
  ackFailureReported: boolean
  pendingAckIds: Set<string>
  deferredAckIds: Set<string>
  deletedMessageIds: Set<string>
  unsubscribe?: () => void
}

// Pinia action 内部的 this 可能在原始 Store 与代理 Store 之间切换，运行时资源不能以 this 作为 WeakMap 键。
// 消息 Store 在单页应用中是单例，因此连接、计时器与队列也由模块级单例统一持有。
const messageRuntime: MessageRuntime = {
  generation: 0,
  ackInFlight: false,
  ackRetryAttempt: 0,
  ackFailureReported: false,
  pendingAckIds: new Set(),
  deferredAckIds: new Set(),
  deletedMessageIds: new Set(),
}

function getRuntime(): MessageRuntime {
  return messageRuntime
}

function currentIdentity(): MessageIdentity | undefined {
  const user = useUserStore()
  if (
    user.sessionStatus !== 'authenticated'
    || !user.token
    || !user.tenantId
    || !user.userId
  ) {
    return undefined
  }
  const userId = String(user.userId)
  return {
    tenantId: user.tenantId,
    userId,
    sessionKey: [user.tenantId, userId].join('\u0000'),
  }
}

function promoteDeferredAcknowledgements(runtime: MessageRuntime): void {
  while (
    runtime.pendingAckIds.size < MAX_PENDING_ACKS
    && runtime.deferredAckIds.size > 0
  ) {
    const next = runtime.deferredAckIds.values().next()
    if (next.done) break
    runtime.deferredAckIds.delete(next.value)
    runtime.pendingAckIds.add(next.value)
  }
}

function rememberDeletedMessages(runtime: MessageRuntime, ids: readonly string[]): string[] {
  const unique = [...new Set(ids.filter(Boolean))]
  for (const id of unique) {
    if (runtime.deletedMessageIds.has(id)) continue
    runtime.deletedMessageIds.add(id)
    if (runtime.deletedMessageIds.size > MAX_DELETED_MESSAGE_TOMBSTONES) {
      const oldest = runtime.deletedMessageIds.values().next().value
      if (oldest) runtime.deletedMessageIds.delete(oldest)
    }
  }
  return unique
}

function shouldRetryAcknowledgement(error: unknown): boolean {
  if (!(error instanceof HttpError)) return true
  if (error.kind === 'cancelled') return false
  if (error.status === undefined) return true
  return error.status === 429 || error.status >= 500
}

function acknowledgementRetryDelay(error: unknown, attempt: number): number {
  const exponential = Math.min(
    ACK_RETRY_BASE_DELAY_MS * 2 ** attempt,
    ACK_RETRY_MAX_DELAY_MS,
  )
  const retryAfter = error instanceof HttpError && error.retryAfterSeconds !== undefined
    ? Math.min(error.retryAfterSeconds * 1_000, ACK_RETRY_AFTER_MAX_DELAY_MS)
    : 0
  return Math.max(exponential, retryAfter)
}

/** 消息连接 Store 只保存 WebSocket 状态，服务端消息数据统一由 QueryClient 管理。 */
export const useMessageStore = defineStore('message', {
  state: (): MessageConnectionState => ({
    connectionStatus: 'disconnected',
    socketError: undefined,
  }),

  actions: {
    /** 订阅认证身份变化，并为当前身份维持唯一实时连接。 */
    bindSession(): void {
      const runtime = getRuntime()
      if (runtime.unsubscribe) return
      let previousKey = currentIdentity()?.sessionKey
      runtime.unsubscribe = useUserStore().$subscribe(() => {
        const nextKey = currentIdentity()?.sessionKey
        if (nextKey === previousKey) return
        previousKey = nextKey
        this.connectCurrentSession()
      }, { flush: 'sync', detached: true })
      this.connectCurrentSession()
    },

    /** 解除身份订阅并关闭连接；服务端缓存由会话协调器统一清理。 */
    unbindSession(): void {
      const runtime = getRuntime()
      runtime.unsubscribe?.()
      runtime.unsubscribe = undefined
      this.disconnect()
    },

    /** 在语言等连接上下文变化后重新申请短票据并建立连接。 */
    restartConnection(): void {
      const runtime = getRuntime()
      runtime.sessionKey = undefined
      this.connectCurrentSession()
    },

    connectCurrentSession(): void {
      const runtime = getRuntime()
      const identity = currentIdentity()
      if (!identity) {
        this.disconnect()
        return
      }
      if (runtime.sessionKey === identity.sessionKey && runtime.socket) return

      this.stopTransport(runtime)
      runtime.sessionKey = identity.sessionKey
      runtime.tenantId = identity.tenantId
      runtime.userId = identity.userId
      const generation = runtime.generation
      this.connectionStatus = 'connecting'
      this.socketError = undefined

      const socket = new MessageSocket({
        requestTicket: async () => {
          const response = await getMessageWebSocketTicket()
          const ticket = response.data?.ticket
          if (!ticket) throw new Error('WebSocket 票据响应缺少 ticket')
          return ticket
        },
        onDelivery: (message) => {
          if (!this.isCurrentSession(runtime, identity.sessionKey, generation)) return
          if (runtime.deletedMessageIds.has(message.id)) return
          receiveMessageDelivery(identity.tenantId, identity.userId, message)
          if (!message.acked_at) this.queueAcknowledgement([message.id])
        },
        onProtocolError: (error: MessageSocketProtocolError) => {
          if (this.isCurrentSession(runtime, identity.sessionKey, generation)) {
            this.socketError = error.message
          }
        },
        onStateChange: (state) => {
          if (this.isCurrentSession(runtime, identity.sessionKey, generation)) {
            this.connectionStatus = state === 'stopped' || state === 'idle'
              ? 'disconnected'
              : state
            if (state === 'connected') {
              void this.pullFor(identity, generation).catch(() => undefined)
            }
          }
        },
      })
      runtime.socket = socket
      socket.start()
      if (typeof window !== 'undefined') {
        runtime.pollTimer = setInterval(() => {
          void this.pullFor(identity, generation).catch(() => undefined)
        }, POLL_INTERVAL_MS)
      }
    },

    disconnect(): void {
      const runtime = getRuntime()
      this.stopTransport(runtime)
      runtime.sessionKey = undefined
      runtime.tenantId = undefined
      runtime.userId = undefined
      this.connectionStatus = 'disconnected'
      this.socketError = undefined
    },

    clearSocketError(): void {
      this.socketError = undefined
    },

    stopTransport(runtime: MessageRuntime): void {
      runtime.generation += 1
      if (runtime.tenantId && runtime.userId) {
        void cancelMessageState(queryClient, runtime.tenantId, runtime.userId)
      }
      if (runtime.pollTimer !== undefined) {
        clearInterval(runtime.pollTimer)
        runtime.pollTimer = undefined
      }
      if (runtime.ackTimer !== undefined) {
        clearTimeout(runtime.ackTimer)
        runtime.ackTimer = undefined
      }
      runtime.pendingAckIds.clear()
      runtime.deferredAckIds.clear()
      runtime.deletedMessageIds.clear()
      runtime.ackInFlight = false
      runtime.ackRetryAttempt = 0
      runtime.ackFailureReported = false
      runtime.socket?.stop()
      runtime.socket = undefined
    },

    async pullFor(identity: MessageIdentity, generation: number): Promise<void> {
      const runtime = getRuntime()
      if (!this.isCurrentSession(runtime, identity.sessionKey, generation)) return
      const page = await synchronizeMessageState(
        queryClient,
        identity.tenantId,
        identity.userId,
        { limit: 100, unread_only: false },
      )
      if (!this.isCurrentSession(runtime, identity.sessionKey, generation)) return
      this.queueAcknowledgement(
        page.records
          .filter(message => !message.acked_at && !runtime.deletedMessageIds.has(message.id))
          .map(message => message.id),
      )
    },

    /** 把短时间内到达的确认合并成有界批次，避免实时高峰产生逐条请求。 */
    queueAcknowledgement(ids: readonly string[]): void {
      const runtime = getRuntime()
      const identity = currentIdentity()
      if (!identity || runtime.sessionKey !== identity.sessionKey) return
      for (const id of new Set(ids.filter(Boolean))) {
        if (runtime.deletedMessageIds.has(id)) continue
        if (runtime.pendingAckIds.has(id) || runtime.deferredAckIds.has(id)) continue
        if (runtime.pendingAckIds.size < MAX_PENDING_ACKS) {
          runtime.pendingAckIds.add(id)
        } else if (runtime.deferredAckIds.size < MAX_DEFERRED_ACKS) {
          // 有界保留溢出确认；超过上限的消息会由下一次收件箱补拉重新进入队列。
          runtime.deferredAckIds.add(id)
        }
      }
      if (
        runtime.pendingAckIds.size === 0
        || runtime.ackTimer !== undefined
        || runtime.ackInFlight
      ) return
      const sessionKey = runtime.sessionKey
      const generation = runtime.generation
      this.scheduleAcknowledgement(runtime, sessionKey, generation, ACK_DEBOUNCE_MS)
    },

    /** 删除成功后丢弃本会话中已排队的送达确认，并阻止在途实时帧重新写回缓存。 */
    markMessagesDeleted(ids: readonly string[]): void {
      const runtime = getRuntime()
      const identity = currentIdentity()
      if (!identity || runtime.sessionKey !== identity.sessionKey) return
      const deletedIds = rememberDeletedMessages(runtime, ids)
      if (deletedIds.length === 0) return
      for (const id of deletedIds) {
        runtime.pendingAckIds.delete(id)
        runtime.deferredAckIds.delete(id)
      }
    },

    /** 清除可能被已在途收件箱响应重新写入缓存的删除消息。 */
    pruneDeletedMessages(visibleIds: readonly string[]): void {
      const runtime = getRuntime()
      const identity = currentIdentity()
      if (!identity || runtime.sessionKey !== identity.sessionKey) return
      if (runtime.deletedMessageIds.size === 0) return
      const deletedIds = visibleIds.filter(id => runtime.deletedMessageIds.has(id))
      if (deletedIds.length === 0) return
      removeCachedMessages(queryClient, {
        tenantId: identity.tenantId,
        userId: identity.userId,
        ids: deletedIds,
      })
    },

    scheduleAcknowledgement(
      runtime: MessageRuntime,
      sessionKey: string | undefined,
      generation: number,
      delay: number,
    ): void {
      if (runtime.ackTimer !== undefined) return
      runtime.ackTimer = setTimeout(() => {
        runtime.ackTimer = undefined
        void this.flushAcknowledgements(sessionKey, generation)
      }, delay)
    },

    async flushAcknowledgements(
      sessionKey: string | undefined,
      generation: number,
    ): Promise<void> {
      const runtime = getRuntime()
      const identity = currentIdentity()
      if (
        !sessionKey
        || !identity
        || identity.sessionKey !== sessionKey
        || !this.isCurrentSession(runtime, sessionKey, generation)
      ) {
        return
      }
      if (runtime.ackInFlight) return
      const ids = [...runtime.pendingAckIds].slice(0, 100)
      if (ids.length === 0) return
      runtime.ackInFlight = true
      try {
        await executeMessageAcknowledgement(
          queryClient,
          identity.tenantId,
          identity.userId,
          ids,
        )
        // 旧会话的在途响应不能修改新身份复用的确认队列。
        if (!this.isCurrentSession(runtime, sessionKey, generation)) return
        runtime.ackInFlight = false
        for (const id of ids) runtime.pendingAckIds.delete(id)
        promoteDeferredAcknowledgements(runtime)
        runtime.ackRetryAttempt = 0
        runtime.ackFailureReported = false
        if (runtime.pendingAckIds.size > 0) {
          this.scheduleAcknowledgement(runtime, sessionKey, generation, 0)
        }
      }
      catch (error) {
        if (!this.isCurrentSession(runtime, sessionKey, generation)) return
        runtime.ackInFlight = false
        if (!runtime.ackFailureReported && import.meta.env.DEV) {
          runtime.ackFailureReported = true
          const context = error instanceof HttpError
            ? {
                kind: error.kind,
                status: error.status,
                code: error.code,
                errorKey: error.errorKey,
              }
            : { kind: 'unknown' }
          console.warn('[RyFrame] 消息送达确认暂时失败，将自动重试', context)
        }
        if (!shouldRetryAcknowledgement(error)) {
          for (const id of ids) runtime.pendingAckIds.delete(id)
          promoteDeferredAcknowledgements(runtime)
          runtime.ackRetryAttempt = 0
          if (runtime.pendingAckIds.size > 0) {
            this.scheduleAcknowledgement(runtime, sessionKey, generation, 0)
          }
          return
        }
        const delay = acknowledgementRetryDelay(error, runtime.ackRetryAttempt)
        runtime.ackRetryAttempt += 1
        this.scheduleAcknowledgement(runtime, sessionKey, generation, delay)
      }
    },

    isCurrentSession(runtime: MessageRuntime, sessionKey: string, generation: number): boolean {
      return runtime.sessionKey === sessionKey && runtime.generation === generation
    },
  },
})
