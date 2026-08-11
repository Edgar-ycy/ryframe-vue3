import { HttpError } from './client'

/** 生成一次用户意图对应的幂等键；网络结果未知时由调用方保留并重用。 */
export function createIdempotencyKey(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 无响应、未知响应或服务端错误都可能发生在事务提交之后，需要重用原幂等键。 */
export function shouldReuseIdempotencyKey(error: unknown): boolean {
  return !(error instanceof HttpError) || error.status === undefined || error.status >= 500
}
