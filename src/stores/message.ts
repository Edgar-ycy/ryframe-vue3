import { defineStore } from 'pinia'
import { getMessageWebSocketTicket } from '@/api/modules/messages'
import {
  cancelMessageState,
  executeMessageAcknowledgement,
  receiveMessageDelivery,
  synchronizeMessageState,
} from '@/app/messages/messageQueries'
import {
  MessageSocket,
  type MessageSocketProtocolError,
  type MessageSocketState,
} from '@/app/messages/messageSocket'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from './user'

const POLL_INTERVAL_MS = 60_000
const ACK_DEBOUNCE_MS = 500
const ACK_RETRY_BASE_DELAY_MS = 1_000
const ACK_RETRY_MAX_DELAY_MS = 30_000
const MAX_PENDING_ACKS = 500

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
  ackRetryAttempt: number
  pendingAckIds: Set<string>
  unsubscribe?: () => void
}

const runtimes = new WeakMap<object, MessageRuntime>()

function getRuntime(store: object): MessageRuntime {
  let runtime = runtimes.get(store)
  if (!runtime) {
    runtime = { generation: 0, ackRetryAttempt: 0, pendingAckIds: new Set() }
    runtimes.set(store, runtime)
  }
  return runtime
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

/** 消息连接 Store 只保存 WebSocket 状态，服务端消息数据统一由 QueryClient 管理。 */
export const useMessageStore = defineStore('message', {
  state: (): MessageConnectionState => ({
    connectionStatus: 'disconnected',
    socketError: undefined,
  }),

  actions: {
    /** 订阅认证身份变化，并为当前身份维持唯一实时连接。 */
    bindSession(): void {
      const runtime = getRuntime(this as unknown as object)
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
      const runtime = getRuntime(this as unknown as object)
      runtime.unsubscribe?.()
      runtime.unsubscribe = undefined
      this.disconnect()
    },

    /** 在语言等连接上下文变化后重新申请短票据并建立连接。 */
    restartConnection(): void {
      const runtime = getRuntime(this as unknown as object)
      runtime.sessionKey = undefined
      this.connectCurrentSession()
    },

    connectCurrentSession(): void {
      const runtime = getRuntime(this as unknown as object)
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
      const runtime = getRuntime(this as unknown as object)
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
      runtime.ackRetryAttempt = 0
      runtime.socket?.stop()
      runtime.socket = undefined
    },

    async pullFor(identity: MessageIdentity, generation: number): Promise<void> {
      const runtime = getRuntime(this as unknown as object)
      if (!this.isCurrentSession(runtime, identity.sessionKey, generation)) return
      const page = await synchronizeMessageState(
        queryClient,
        identity.tenantId,
        identity.userId,
        { limit: 100, unread_only: false },
      )
      if (!this.isCurrentSession(runtime, identity.sessionKey, generation)) return
      this.queueAcknowledgement(
        page.records.filter(message => !message.acked_at).map(message => message.id),
      )
    },

    /** 把短时间内到达的确认合并成有界批次，避免实时高峰产生逐条请求。 */
    queueAcknowledgement(ids: readonly string[]): void {
      const runtime = getRuntime(this as unknown as object)
      for (const id of new Set(ids.filter(Boolean))) {
        if (runtime.pendingAckIds.size >= MAX_PENDING_ACKS) break
        runtime.pendingAckIds.add(id)
      }
      if (runtime.pendingAckIds.size === 0 || runtime.ackTimer !== undefined) return
      const sessionKey = runtime.sessionKey
      const generation = runtime.generation
      this.scheduleAcknowledgement(runtime, sessionKey, generation, ACK_DEBOUNCE_MS)
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
      const runtime = getRuntime(this as unknown as object)
      const identity = currentIdentity()
      if (
        !sessionKey
        || !identity
        || identity.sessionKey !== sessionKey
        || !this.isCurrentSession(runtime, sessionKey, generation)
      ) {
        return
      }
      const ids = [...runtime.pendingAckIds].slice(0, 100)
      if (ids.length === 0) return
      try {
        await executeMessageAcknowledgement(
          queryClient,
          identity.tenantId,
          identity.userId,
          ids,
        )
        for (const id of ids) runtime.pendingAckIds.delete(id)
        runtime.ackRetryAttempt = 0
        if (runtime.pendingAckIds.size > 0) {
          this.scheduleAcknowledgement(runtime, sessionKey, generation, 0)
        }
      }
      catch {
        if (!this.isCurrentSession(runtime, sessionKey, generation)) return
        const delay = Math.min(
          ACK_RETRY_BASE_DELAY_MS * 2 ** runtime.ackRetryAttempt,
          ACK_RETRY_MAX_DELAY_MS,
        )
        runtime.ackRetryAttempt += 1
        this.scheduleAcknowledgement(runtime, sessionKey, generation, delay)
      }
    },

    isCurrentSession(runtime: MessageRuntime, sessionKey: string, generation: number): boolean {
      return runtime.sessionKey === sessionKey && runtime.generation === generation
    },
  },
})
