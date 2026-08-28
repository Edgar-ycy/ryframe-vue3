import { getMessageWebSocketTicket } from '@/api/modules/messages'
import {
  cancelMessageState,
  executeMessageAcknowledgement,
  synchronizeMessageState,
} from '@/app/messages/messageSync'
import { receiveMessageDelivery, removeCachedMessages } from '@/app/messages/messageCache/mutations'
import type { MessageSocketProtocolError } from '@/app/messages/socket/frameCodec'
import { MessageSocket } from '@/app/messages/socket/lifecycle'
import { notifyTenantContextChanged } from '@/app/tenant-context/contextRefresh'
import { HttpError } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import {
  ACK_DEBOUNCE_MS,
  acknowledgementRetryDelay,
  clearAcknowledgements,
  enqueueAcknowledgements,
  promoteDeferredAcknowledgements,
  scheduleAcknowledgement,
  shouldRetryAcknowledgement,
} from './acknowledgements'
import {
  POLL_INTERVAL_MS,
  currentIdentity,
  getRuntime,
  isCurrentSession,
  type MessageIdentity,
  type MessageRuntime,
} from './messageRuntime'
import { forgetDeletedAcknowledgements, rememberDeletedMessages } from './tombstones'

/** 协调认证身份、实时连接、补拉和确认队列；Store 只保存可展示状态。 */
class MessageController {
  /** 订阅认证身份变化，并为当前身份维持唯一实时连接。 */
  bindSession(): void {
    const runtime = getRuntime()
    if (runtime.unsubscribe) return
    let previousKey = currentIdentity()?.sessionKey
    runtime.unsubscribe = useUserStore().$subscribe(
      () => {
        const nextKey = currentIdentity()?.sessionKey
        if (nextKey === previousKey) return
        previousKey = nextKey
        this.connectCurrentSession()
      },
      { flush: 'sync', detached: true },
    )
    this.connectCurrentSession()
  }

  /** 解除身份订阅并关闭连接；服务端缓存由会话协调器统一清理。 */
  unbindSession(): void {
    const runtime = getRuntime()
    runtime.unsubscribe?.()
    runtime.unsubscribe = undefined
    this.disconnect()
  }

  /** 在语言等连接上下文变化后重新申请短票据并建立连接。 */
  restartConnection(): void {
    const runtime = getRuntime()
    runtime.sessionKey = undefined
    this.connectCurrentSession()
  }

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
    const state = useMessageStore()
    state.setConnectionStatus('connecting')
    state.setSocketError(undefined)

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
      onTenantContextChanged: (frame) => {
        if (!this.isCurrentSession(runtime, identity.sessionKey, generation)) return
        void notifyTenantContextChanged(frame).catch(() => undefined)
      },
      onProtocolError: (error: MessageSocketProtocolError) => {
        if (this.isCurrentSession(runtime, identity.sessionKey, generation)) {
          useMessageStore().setSocketError(error.message)
        }
      },
      onStateChange: (state) => {
        if (this.isCurrentSession(runtime, identity.sessionKey, generation)) {
          const connectionStatus = state === 'stopped' || state === 'idle' ? 'disconnected' : state
          useMessageStore().setConnectionStatus(connectionStatus)
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
  }

  disconnect(): void {
    const runtime = getRuntime()
    this.stopTransport(runtime)
    runtime.sessionKey = undefined
    runtime.tenantId = undefined
    runtime.userId = undefined
    useMessageStore().resetConnectionState()
  }

  private stopTransport(runtime: MessageRuntime): void {
    runtime.generation += 1
    if (runtime.tenantId && runtime.userId) {
      void cancelMessageState(queryClient, runtime.tenantId, runtime.userId)
    }
    if (runtime.pollTimer !== undefined) {
      clearInterval(runtime.pollTimer)
      runtime.pollTimer = undefined
    }
    clearAcknowledgements(runtime)
    runtime.deletedMessageIds.clear()
    runtime.socket?.stop()
    runtime.socket = undefined
  }

  private async pullFor(identity: MessageIdentity, generation: number): Promise<void> {
    const runtime = getRuntime()
    if (!this.isCurrentSession(runtime, identity.sessionKey, generation)) return
    const page = await synchronizeMessageState(queryClient, identity.tenantId, identity.userId, {
      limit: 100,
      unread_only: false,
    })
    if (!this.isCurrentSession(runtime, identity.sessionKey, generation)) return
    this.queueAcknowledgement(
      page.records
        .filter((message) => !message.acked_at && !runtime.deletedMessageIds.has(message.id))
        .map((message) => message.id),
    )
  }

  /** 把短时间内到达的确认合并成有界批次，避免实时高峰产生逐条请求。 */
  queueAcknowledgement(ids: readonly string[]): void {
    const runtime = getRuntime()
    const identity = currentIdentity()
    if (!identity || runtime.sessionKey !== identity.sessionKey) return
    enqueueAcknowledgements(runtime, ids)
    if (runtime.pendingAckIds.size === 0 || runtime.ackTimer !== undefined || runtime.ackInFlight)
      return
    const sessionKey = runtime.sessionKey
    const generation = runtime.generation
    this.scheduleAcknowledgement(runtime, sessionKey, generation, ACK_DEBOUNCE_MS)
  }

  /** 删除成功后丢弃本会话中已排队的送达确认，并阻止在途实时帧重新写回缓存。 */
  markMessagesDeleted(ids: readonly string[]): void {
    const runtime = getRuntime()
    const identity = currentIdentity()
    if (!identity || runtime.sessionKey !== identity.sessionKey) return
    const deletedIds = rememberDeletedMessages(runtime, ids)
    if (deletedIds.length === 0) return
    forgetDeletedAcknowledgements(runtime, deletedIds)
  }

  /** 清除可能被已在途收件箱响应重新写入缓存的删除消息。 */
  pruneDeletedMessages(visibleIds: readonly string[]): void {
    const runtime = getRuntime()
    const identity = currentIdentity()
    if (!identity || runtime.sessionKey !== identity.sessionKey) return
    if (runtime.deletedMessageIds.size === 0) return
    const deletedIds = visibleIds.filter((id) => runtime.deletedMessageIds.has(id))
    if (deletedIds.length === 0) return
    removeCachedMessages(queryClient, {
      tenantId: identity.tenantId,
      userId: identity.userId,
      ids: deletedIds,
    })
  }

  private scheduleAcknowledgement(
    runtime: MessageRuntime,
    sessionKey: string | undefined,
    generation: number,
    delay: number,
  ): void {
    scheduleAcknowledgement(runtime, delay, () => {
      void this.flushAcknowledgements(sessionKey, generation)
    })
  }

  private async flushAcknowledgements(
    sessionKey: string | undefined,
    generation: number,
  ): Promise<void> {
    const runtime = getRuntime()
    const identity = currentIdentity()
    if (
      !sessionKey ||
      !identity ||
      identity.sessionKey !== sessionKey ||
      !this.isCurrentSession(runtime, sessionKey, generation)
    ) {
      return
    }
    if (runtime.ackInFlight) return
    const ids = [...runtime.pendingAckIds].slice(0, 100)
    if (ids.length === 0) return
    runtime.ackInFlight = true
    try {
      await executeMessageAcknowledgement(queryClient, identity.tenantId, identity.userId, ids)
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
    } catch (error) {
      if (!this.isCurrentSession(runtime, sessionKey, generation)) return
      runtime.ackInFlight = false
      if (!runtime.ackFailureReported && import.meta.env.DEV) {
        runtime.ackFailureReported = true
        const context =
          error instanceof HttpError
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
  }

  private isCurrentSession(
    runtime: MessageRuntime,
    sessionKey: string,
    generation: number,
  ): boolean {
    return isCurrentSession(runtime, sessionKey, generation)
  }
}

export const messageController = new MessageController()
