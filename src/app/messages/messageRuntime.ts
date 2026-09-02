import type { MessageSocket } from '@/app/messages/socket/lifecycle'
import type { MessageIdentity } from '@/app/messages/messageCache/queryKeys'
import { getServerStateScope, isServerStateScopeCurrent } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

export const POLL_INTERVAL_MS = 60_000

export interface MessageSessionIdentity extends MessageIdentity {
  sessionKey: string
}

export interface MessageRuntime {
  sessionKey?: string
  scope?: MessageIdentity
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

export function currentIdentity(): MessageSessionIdentity | undefined {
  const user = useUserStore()
  const scope = getServerStateScope()
  if (user.sessionStatus !== 'authenticated' || !user.token || !user.tenantId || !user.userId) {
    return undefined
  }
  const subjectId = String(user.userId)
  if (!scope || scope.tenantId !== user.tenantId || scope.subjectId !== subjectId) return undefined
  return {
    tenantId: scope.tenantId,
    subjectId: scope.subjectId,
    sessionEpoch: scope.sessionEpoch,
    sessionKey: [scope.tenantId, scope.subjectId, scope.sessionEpoch].join('\u0000'),
  }
}

export function messageServerStateScope(identity: MessageSessionIdentity): MessageIdentity {
  return {
    tenantId: identity.tenantId,
    subjectId: identity.subjectId,
    sessionEpoch: identity.sessionEpoch,
  }
}

export function isCurrentSession(
  runtime: MessageRuntime,
  sessionKey: string,
  generation: number,
): boolean {
  return (
    runtime.sessionKey === sessionKey &&
    runtime.generation === generation &&
    runtime.scope !== undefined &&
    isServerStateScopeCurrent(runtime.scope)
  )
}
