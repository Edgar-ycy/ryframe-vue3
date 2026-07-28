import type { UserInfo } from '@/api/modules/auth'

export type SessionMessage =
  | { type: 'refresh-start'; source: string; operationId: string; startedAt: number }
  | {
    type: 'authenticated'
    source: string
    operationId: string
    startedAt: number
    accessToken: string
    userInfo: UserInfo
  }
  | { type: 'refresh-failed'; source: string; operationId: string; startedAt: number; status?: number }
  | { type: 'logout'; source: string; at: number }

export type SessionOutboundMessage =
  | { type: 'refresh-start'; operationId: string; startedAt: number }
  | {
    type: 'authenticated'
    operationId: string
    startedAt: number
    accessToken: string
    userInfo: UserInfo
  }
  | { type: 'refresh-failed'; operationId: string; startedAt: number; status?: number }
  | { type: 'logout'; at: number }

const userInfoKeys = new Set([
  'avatar',
  'dept_name',
  'email',
  'id',
  'nickname',
  'perms',
  'phone',
  'preferred_locale',
  'roles',
  'tenant_id',
  'tenant_name',
  'username',
])

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
  return keys.every(key => typeof key === 'string' && allowed.has(key))
    && required.every(key => Object.hasOwn(value, key))
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isOperationId(value: unknown): value is string {
  return isNonEmptyString(value) && value.length <= 256 && !/\s/u.test(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString)
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isOptionalHttpStatus(value: unknown): value is number | undefined {
  return value === undefined
    || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 100 && value <= 599)
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string'
}

function isOptionalLocale(value: unknown): boolean {
  return value === undefined || value === null || value === 'zh-CN' || value === 'en-US'
}

function isUserInfo(value: unknown): value is UserInfo {
  if (!isRecord(value)) return false
  const keys = Reflect.ownKeys(value)
  if (!keys.every(key => typeof key === 'string' && userInfoKeys.has(key))) return false
  if (![
    'email',
    'id',
    'nickname',
    'perms',
    'phone',
    'roles',
    'tenant_id',
    'tenant_name',
    'username',
  ].every(key => Object.hasOwn(value, key))) return false

  return isNonEmptyString(value.id)
    && isNonEmptyString(value.tenant_id)
    && isNonEmptyString(value.username)
    && isString(value.tenant_name)
    && isString(value.nickname)
    && isString(value.email)
    && isString(value.phone)
    && isStringArray(value.roles)
    && isStringArray(value.perms)
    && isOptionalString(value.avatar)
    && isOptionalString(value.dept_name)
    && isOptionalLocale(value.preferred_locale)
}

export function isSessionMessage(value: unknown): value is SessionMessage {
  if (!isRecord(value) || !isNonEmptyString(value.source)) return false

  switch (value.type) {
    case 'refresh-start':
      return hasExactKeys(value, ['type', 'source', 'operationId', 'startedAt'])
        && isOperationId(value.operationId)
        && isTimestamp(value.startedAt)
    case 'authenticated':
      return hasExactKeys(
        value,
        ['type', 'source', 'operationId', 'startedAt', 'accessToken', 'userInfo'],
      )
        && isOperationId(value.operationId)
        && isTimestamp(value.startedAt)
        && isNonEmptyString(value.accessToken)
        && isUserInfo(value.userInfo)
    case 'refresh-failed':
      return hasExactKeys(value, ['type', 'source', 'operationId', 'startedAt'], ['status'])
        && isOperationId(value.operationId)
        && isTimestamp(value.startedAt)
        && isOptionalHttpStatus(value.status)
    case 'logout':
      return hasExactKeys(value, ['type', 'source', 'at'])
        && isTimestamp(value.at)
    default:
      return false
  }
}
