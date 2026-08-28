import { isSessionContext } from '@/api/modules/sessionContext'
import type { SessionContext } from '@/shared/session/contracts'

export type SessionMessage =
  | { type: 'refresh-start'; source: string; operationId: string; startedAt: number }
  | {
      type: 'authenticated'
      source: string
      operationId: string
      startedAt: number
      accessToken: string
      sessionContext: SessionContext
    }
  | {
      type: 'refresh-failed'
      source: string
      operationId: string
      startedAt: number
      status?: number
    }
  | { type: 'logout'; source: string; at: number }

export type SessionOutboundMessage =
  | { type: 'refresh-start'; operationId: string; startedAt: number }
  | {
      type: 'authenticated'
      operationId: string
      startedAt: number
      accessToken: string
      sessionContext: SessionContext
    }
  | { type: 'refresh-failed'; operationId: string; startedAt: number; status?: number }
  | { type: 'logout'; at: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional])
  const keys = Reflect.ownKeys(value)
  return (
    keys.every((key) => typeof key === 'string' && allowed.has(key)) &&
    required.every((key) => Object.hasOwn(value, key))
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isOperationId(value: unknown): value is string {
  return isNonEmptyString(value) && value.length <= 256 && !/\s/u.test(value)
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isOptionalHttpStatus(value: unknown): value is number | undefined {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value >= 100 && value <= 599)
  )
}

export function isSessionMessage(value: unknown): value is SessionMessage {
  if (!isRecord(value) || !isNonEmptyString(value.source)) return false

  switch (value.type) {
    case 'refresh-start':
      return (
        hasExactKeys(value, ['type', 'source', 'operationId', 'startedAt']) &&
        isOperationId(value.operationId) &&
        isTimestamp(value.startedAt)
      )
    case 'authenticated':
      return (
        hasExactKeys(value, [
          'type',
          'source',
          'operationId',
          'startedAt',
          'accessToken',
          'sessionContext',
        ]) &&
        isOperationId(value.operationId) &&
        isTimestamp(value.startedAt) &&
        isNonEmptyString(value.accessToken) &&
        isSessionContext(value.sessionContext)
      )
    case 'refresh-failed':
      return (
        hasExactKeys(value, ['type', 'source', 'operationId', 'startedAt'], ['status']) &&
        isOperationId(value.operationId) &&
        isTimestamp(value.startedAt) &&
        isOptionalHttpStatus(value.status)
      )
    case 'logout':
      return hasExactKeys(value, ['type', 'source', 'at']) && isTimestamp(value.at)
    default:
      return false
  }
}
