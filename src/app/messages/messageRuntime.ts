import type { MessageSocket } from '@/app/messages/socket/lifecycle'
import { useUserStore } from '@/stores/user'

export const POLL_INTERVAL_MS = 60_000

export interface MessageIdentity {
  tenantId: string
  userId: string
  sessionKey: string
}

export interface MessageRuntime {
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

export function getRuntime(): MessageRuntime {
  return messageRuntime
}

export function currentIdentity(): MessageIdentity | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.token || !user.tenantId || !user.userId) {
    return undefined
  }
  const userId = String(user.userId)
  return {
    tenantId: user.tenantId,
    userId,
    sessionKey: [user.tenantId, userId].join('\u0000'),
  }
}

export function isCurrentSession(
  runtime: MessageRuntime,
  sessionKey: string,
  generation: number,
): boolean {
  return runtime.sessionKey === sessionKey && runtime.generation === generation
}
