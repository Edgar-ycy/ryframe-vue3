import { defineStore } from 'pinia'
import {
  acknowledgeMessages,
  getMessageWebSocketTicket,
  getUnreadMessageCount,
  listMessages,
  markAllMessagesRead,
  markMessageRead,
  type MessageRecord,
} from '@/api/modules/messages'
import {
  MessageSocket,
  type MessageSocketProtocolError,
  type MessageSocketState,
} from '@/app/messages/messageSocket'
import { useUserStore } from './user'

const POLL_INTERVAL_MS = 60_000
const INBOX_LIMIT = 100
const MAX_CACHED_MESSAGES = 200
const ACK_DEBOUNCE_MS = 500
const ACK_RETRY_BASE_DELAY_MS = 1_000
const ACK_RETRY_MAX_DELAY_MS = 30_000

type ConnectionStatus = Exclude<MessageSocketState, 'idle' | 'stopped'> | 'disconnected'

interface MessageState {
  messages: MessageRecord[]
  unreadCount: number
  loading: boolean
  connectionStatus: ConnectionStatus
  socketError?: string
}

interface MessageRuntime {
  sessionKey?: string
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

function currentSessionKey(): string | undefined {
  const user = useUserStore()
  if (
    user.sessionStatus !== 'authenticated'
    || !user.token
    || !user.tenantId
    || !user.userId
  ) {
    return undefined
  }
  return [user.tenantId, user.userId].join('\u0000')
}

function sortMessages(left: MessageRecord, right: MessageRecord): number {
  const rightTime = Date.parse(right.published_at) || 0
  const leftTime = Date.parse(left.published_at) || 0
  if (rightTime !== leftTime) return rightTime - leftTime
  return right.id.localeCompare(left.id)
}

function mergeMessages(current: MessageRecord[], incoming: MessageRecord[]): MessageRecord[] {
  const records = new Map(current.map(message => [message.id, message]))
  for (const message of incoming) {
    const previous = records.get(message.id)
    records.set(message.id, {
      ...previous,
      ...message,
      read_at: message.read_at === undefined ? previous?.read_at : message.read_at,
      acked_at: message.acked_at === undefined ? previous?.acked_at : message.acked_at,
    })
  }
  return [...records.values()].sort(sortMessages).slice(0, MAX_CACHED_MESSAGES)
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

/** 管理消息中心的收件箱、短票据连接与会话边界。 */
export const useMessageStore = defineStore('message', {
  state: (): MessageState => ({
    messages: [],
    unreadCount: 0,
    loading: false,
    connectionStatus: 'disconnected',
    socketError: undefined,
  }),

  getters: {
    unreadMessages: state => state.messages.filter(message => !message.read_at),
  },

  actions: {
    /** 绑定当前用户会话；重复调用不会建立重复订阅或连接。 */
    bindSession(): void {
      const runtime = getRuntime(this as unknown as object)
      if (runtime.unsubscribe) return
      let previousKey = currentSessionKey()
      runtime.unsubscribe = useUserStore().$subscribe(() => {
        const nextKey = currentSessionKey()
        if (nextKey === previousKey) return
        previousKey = nextKey
        void this.syncSession()
      }, { flush: 'sync', detached: true })
      void this.syncSession()
    },

    /** 在布局卸载时解除会话订阅并销毁网络资源。 */
    unbindSession(): void {
      const runtime = getRuntime(this as unknown as object)
      runtime.unsubscribe?.()
      runtime.unsubscribe = undefined
      this.reset()
    },

    /** 根据登录用户、租户和访问令牌重新建立消息会话。 */
    async syncSession(): Promise<void> {
      const runtime = getRuntime(this as unknown as object)
      const sessionKey = currentSessionKey()
      if (!sessionKey) {
        this.reset()
        return
      }
      if (runtime.sessionKey === sessionKey && runtime.socket) return

      const generation = runtime.generation + 1
      runtime.generation = generation
      this.stopTransport(runtime)
      runtime.sessionKey = sessionKey
      this.messages = []
      this.unreadCount = 0
      this.connectionStatus = 'connecting'

      this.loading = true
      try {
        await this.pullFor(sessionKey, generation)
      }
      catch {
        // 连接建立后仍会补拉，首次网络失败不应阻止实时通道启动。
      }
      finally {
        if (this.isCurrentSession(runtime, sessionKey, generation)) this.loading = false
      }

      if (!this.isCurrentSession(runtime, sessionKey, generation)) return
      const socket = new MessageSocket({
        requestTicket: async () => {
          const response = await getMessageWebSocketTicket()
          const ticket = response.data?.ticket
          if (!ticket) throw new Error('WebSocket 票据响应缺少 ticket')
          return ticket
        },
        onDelivery: (message) => {
          if (this.isCurrentSession(runtime, sessionKey, generation)) this.receive(message)
        },
        onProtocolError: (error: MessageSocketProtocolError) => {
          if (this.isCurrentSession(runtime, sessionKey, generation)) {
            this.socketError = error.message
          }
        },
        onStateChange: (state) => {
          if (this.isCurrentSession(runtime, sessionKey, generation)) {
            this.connectionStatus = state === 'stopped' || state === 'idle' ? 'disconnected' : state
          }
        },
      })
      runtime.socket = socket
      socket.start()
      if (typeof window !== 'undefined') {
        runtime.pollTimer = setInterval(() => {
          void this.pullFor(sessionKey, generation).catch(() => undefined)
        }, POLL_INTERVAL_MS)
      }
    },

    /** 立即从 REST 收件箱补拉，适合抽屉打开或用户手动刷新。 */
    async refresh(): Promise<void> {
      const sessionKey = currentSessionKey()
      if (!sessionKey) return
      const runtime = getRuntime(this as unknown as object)
      const generation = runtime.generation
      this.loading = true
      try {
        await this.pullFor(sessionKey, generation)
      }
      finally {
        if (this.isCurrentSession(runtime, sessionKey, generation)) this.loading = false
      }
    },

    /** 合并 WebSocket 或 REST 到达的消息，并以消息 ID 去重。 */
    receive(message: MessageRecord): void {
      const previous = this.messages.find(item => item.id === message.id)
      this.messages = mergeMessages(this.messages, [message])
      const current = this.messages.find(item => item.id === message.id)
      if (!previous && current && !current.read_at) this.unreadCount += 1
      if (previous && current && !previous.read_at && current.read_at) {
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      }
      if (previous?.read_at && current && !current.read_at) this.unreadCount += 1
      if (!message.acked_at) this.queueAcknowledgement([message.id])
    },

    /** 批量确认消息已经送达；服务端每次最多接受 100 条。 */
    async acknowledge(ids: readonly string[]): Promise<void> {
      const unique = uniqueIds(ids)
      if (unique.length === 0) return
      const runtime = getRuntime(this as unknown as object)
      let requiresReconciliation = false
      for (const batch of chunks(unique, 100)) {
        const response = await acknowledgeMessages(batch)
        for (const id of batch) runtime.pendingAckIds.delete(id)
        if (response.data !== batch.length) {
          requiresReconciliation = true
          continue
        }
        const acknowledgedAt = new Date().toISOString()
        this.messages = this.messages.map(message => (
          batch.includes(message.id) ? { ...message, acked_at: acknowledgedAt } : message
        ))
      }
      if (requiresReconciliation) await this.refresh()
    },

    /** 标记单条消息已读，并在成功后同步本地未读计数。 */
    async markRead(id: string): Promise<void> {
      const message = this.messages.find(item => item.id === id)
      if (!message || message.read_at) return
      await markMessageRead(id)
      const readAt = new Date().toISOString()
      this.messages = this.messages.map(item => (
        item.id === id
          ? { ...item, read_at: item.read_at ?? readAt, acked_at: item.acked_at ?? readAt }
          : item
      ))
      this.unreadCount = Math.max(0, this.unreadCount - 1)
    },

    /** 标记全部已读，并以服务端操作成功作为本地状态变更的前提。 */
    async markAllRead(): Promise<void> {
      if (this.unreadCount === 0) return
      const expectedAffected = this.unreadCount
      const response = await markAllMessagesRead()
      if (response.data !== expectedAffected) {
        await this.refresh()
        return
      }
      const readAt = new Date().toISOString()
      this.messages = this.messages.map(message => (
        message.read_at
          ? message
          : { ...message, read_at: readAt, acked_at: message.acked_at ?? readAt }
      ))
      this.unreadCount = 0
    },

    /** 清除收件箱并关闭实时通道；会话订阅本身保留以支持下一次登录。 */
    reset(): void {
      const runtime = getRuntime(this as unknown as object)
      this.stopTransport(runtime)
      runtime.generation += 1
      runtime.sessionKey = undefined
      this.messages = []
      this.unreadCount = 0
      this.loading = false
      this.connectionStatus = 'disconnected'
      this.socketError = undefined
    },

    clearSocketError(): void {
      this.socketError = undefined
    },

    async pullFor(sessionKey: string, generation: number): Promise<void> {
      const runtime = getRuntime(this as unknown as object)
      if (!this.isCurrentSession(runtime, sessionKey, generation)) return
      const [inbox, unread] = await Promise.all([
        listMessages({ limit: INBOX_LIMIT, unread_only: false }),
        getUnreadMessageCount(),
      ])
      if (!this.isCurrentSession(runtime, sessionKey, generation)) return
      this.messages = mergeMessages(this.messages, inbox.data?.records ?? [])
      this.unreadCount = Math.max(0, unread.data ?? 0)
      this.queueAcknowledgement(
        (inbox.data?.records ?? [])
          .filter(message => !message.acked_at)
          .map(message => message.id),
      )
    },

    stopTransport(runtime: MessageRuntime): void {
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

    /** 将投递确认合并到短时间窗口，减少实时高峰下的确认请求数量。 */
    queueAcknowledgement(ids: readonly string[]): void {
      const runtime = getRuntime(this as unknown as object)
      for (const id of uniqueIds(ids)) runtime.pendingAckIds.add(id)
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

    scheduleAcknowledgementRetry(
      runtime: MessageRuntime,
      sessionKey: string,
      generation: number,
    ): void {
      const delay = Math.min(
        ACK_RETRY_BASE_DELAY_MS * 2 ** runtime.ackRetryAttempt,
        ACK_RETRY_MAX_DELAY_MS,
      )
      runtime.ackRetryAttempt += 1
      this.scheduleAcknowledgement(runtime, sessionKey, generation, delay)
    },

    /** 仅为当前会话提交待确认消息，避免租户或登录切换后的误确认。 */
    async flushAcknowledgements(sessionKey: string | undefined, generation: number): Promise<void> {
      const runtime = getRuntime(this as unknown as object)
      if (!sessionKey || !this.isCurrentSession(runtime, sessionKey, generation)) return
      const ids = [...runtime.pendingAckIds]
      runtime.pendingAckIds.clear()
      try {
        await this.acknowledge(ids)
        runtime.ackRetryAttempt = 0
      }
      catch {
        if (this.isCurrentSession(runtime, sessionKey, generation)) {
          for (const id of ids) runtime.pendingAckIds.add(id)
          this.scheduleAcknowledgementRetry(runtime, sessionKey, generation)
        }
      }
    },

    isCurrentSession(runtime: MessageRuntime, sessionKey: string, generation: number): boolean {
      return runtime.sessionKey === sessionKey && runtime.generation === generation
    },
  },
})
