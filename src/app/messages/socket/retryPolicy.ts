import { HttpError } from '@/shared/http/client'

const BASE_RECONNECT_DELAY_MS = 500
const MAX_RECONNECT_DELAY_MS = 30_000
const MAX_RETRY_AFTER_DELAY_MS = 60_000

/** 计算带抖动的指数退避间隔，避免多个标签页同时重连。 */
export function reconnectDelay(attempt: number, random = Math.random): number {
  const exponent = Math.max(0, Math.min(attempt, 16))
  const base = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** exponent, MAX_RECONNECT_DELAY_MS)
  const jitter = 0.8 + random() * 0.4
  return Math.round(base * jitter)
}

/** 对票据接口的限流或不可用响应遵守 Retry-After。 */
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
  return Math.max(exponential, Math.min(retryAfterSeconds * 1_000, MAX_RETRY_AFTER_DELAY_MS))
}

/** 仅服务端明确声明实时服务不可用时进入低频健康重试。 */
export function isRealtimeServiceUnavailable(error: unknown): boolean {
  if (!(error instanceof HttpError) || error.status !== 503) return false
  return (
    error.realtimeStatus === 'unavailable' ||
    (error.errorKey === 'service_unavailable' && error.retryAfterSeconds !== undefined)
  )
}
