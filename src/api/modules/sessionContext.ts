import type { ApiSchema, OperationData } from '@/api/contract'

/** 登录、刷新与 GET /auth/context 共用的原子会话授权快照。 */
export type SessionContext = OperationData<'get_auth_context'>
export type SessionUser = SessionContext['user']
export type SessionContextUserInfo = ApiSchema<'UserInfo'>
export type EffectiveSessionCapability = SessionContext['capabilities'][number]
export type TenantBusinessDataContext = SessionContext['business_data']
export type TenantBusinessState = TenantBusinessDataContext['state']

export function sessionContextUserInfo(context: SessionContext): SessionContextUserInfo {
  return {
    ...context.user,
    roles: [...context.roles],
    perms: [...context.permissions],
  }
}

const businessStates = new Set<TenantBusinessState>([
  'provisioning',
  'active',
  'maintenance',
  'failed',
])

/** 本地窄 DTO 的运行时边界；OpenAPI 生成前后都必须保持 fail-closed。 */
export function isSessionContext(value: unknown): value is SessionContext {
  if (!isRecord(value) || !isRecord(value.user)) return false
  if (Object.hasOwn(value.user, 'roles') || Object.hasOwn(value.user, 'perms')) return false
  if (!isIdentifier(value.user.id)
    || !isNonEmptyString(value.user.tenant_id)
    || !isNonEmptyString(value.user.username)) return false
  if (!isStringArray(value.roles) || !isStringArray(value.permissions)) return false
  if (!isDecimalString(value.authorization_epoch) || !isDecimalString(value.runtime_epoch)) {
    return false
  }
  if (!Array.isArray(value.capabilities) || !value.capabilities.every(isSessionCapability)) {
    return false
  }
  if (!isRecord(value.business_data)
    || !businessStates.has(value.business_data.state as TenantBusinessState)
    || !isDecimalString(value.business_data.placement_generation)) return false
  return Array.isArray(value.menus) && value.menus.every(isRecord)
}

function isSessionCapability(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.code)
    && isNonEmptyString(value.variant)
    && Number.isSafeInteger(value.schema_version)
    && Number(value.schema_version) >= 1
    && isRecord(value.client_config)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isIdentifier(value: unknown): boolean {
  return isDecimalString(value)
}

function isDecimalString(value: unknown): value is string {
  return typeof value === 'string' && /^(?:0|[1-9]\d*)$/u.test(value)
}
