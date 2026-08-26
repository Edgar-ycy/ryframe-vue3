import { HttpError } from '@/shared/http/client'
import type { MessageRuntime } from './messageRuntime'

export const ACK_DEBOUNCE_MS = 500

const ACK_RETRY_BASE_DELAY_MS = 1_000
const ACK_RETRY_MAX_DELAY_MS = 30_000
const ACK_RETRY_AFTER_MAX_DELAY_MS = 60_000
const MAX_PENDING_ACKS = 500
const MAX_DEFERRED_ACKS = 2_000

export function enqueueAcknowledgements(runtime: MessageRuntime, ids: readonly string[]): boolean {
  for (const id of new Set(ids.filter(Boolean))) {
    if (runtime.deletedMessageIds.has(id)) continue
    if (runtime.pendingAckIds.has(id) || runtime.deferredAckIds.has(id)) continue
    if (runtime.pendingAckIds.size < MAX_PENDING_ACKS) {
      runtime.pendingAckIds.add(id)
    }
    else if (runtime.deferredAckIds.size < MAX_DEFERRED_ACKS) {
      // 有界保留溢出确认；超过上限的消息会由下一次收件箱补拉重新进入队列。
      runtime.deferredAckIds.add(id)
    }
  }
  return runtime.pendingAckIds.size > 0
}

export function promoteDeferredAcknowledgements(runtime: MessageRuntime): void {
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

export function scheduleAcknowledgement(
  runtime: MessageRuntime,
  delay: number,
  callback: () => void,
): void {
  if (runtime.ackTimer !== undefined) return
  runtime.ackTimer = setTimeout(() => {
    runtime.ackTimer = undefined
    callback()
  }, delay)
}

export function clearAcknowledgements(runtime: MessageRuntime): void {
  if (runtime.ackTimer !== undefined) {
    clearTimeout(runtime.ackTimer)
    runtime.ackTimer = undefined
  }
  runtime.pendingAckIds.clear()
  runtime.deferredAckIds.clear()
  runtime.ackInFlight = false
  runtime.ackRetryAttempt = 0
  runtime.ackFailureReported = false
}

export function shouldRetryAcknowledgement(error: unknown): boolean {
  if (!(error instanceof HttpError)) return true
  if (error.kind === 'cancelled') return false
  if (error.status === undefined) return true
  return error.status === 429 || error.status >= 500
}

export function acknowledgementRetryDelay(error: unknown, attempt: number): number {
  const exponential = Math.min(
    ACK_RETRY_BASE_DELAY_MS * 2 ** attempt,
    ACK_RETRY_MAX_DELAY_MS,
  )
  const retryAfter = error instanceof HttpError && error.retryAfterSeconds !== undefined
    ? Math.min(error.retryAfterSeconds * 1_000, ACK_RETRY_AFTER_MAX_DELAY_MS)
    : 0
  return Math.max(exponential, retryAfter)
}
