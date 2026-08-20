import { isPermissionCode } from '@/api/generated/permissions'
import type { ApiSchema, OperationData } from '@/api/contract'

type GeneratedSessionContext = OperationData<'get_auth_context'>

/** 登录、刷新与 GET /auth/context 共用的原子会话授权快照。 */
export type SessionContext = GeneratedSessionContext & { is_super_admin: boolean }
export type SessionUser = SessionContext['user']
export type SessionContextUserInfo = ApiSchema<'UserInfo'>
export type EffectiveSessionCapability = SessionContext['capabilities'][number]
export type TenantBusinessDataContext = SessionContext['business_data']
export type TenantBusinessState = TenantBusinessDataContext['state']

const sessionContextKeys = [
  'authorization_epoch',
  'business_data',
  'capabilities',
  'is_super_admin',
  'menus',
  'permissions',
  'roles',
  'runtime_epoch',
  'user',
] as const

const sessionUserKeys = new Set([
  'avatar',
  'dept_name',
  'email',
  'id',
  'nickname',
  'phone',
  'preferred_locale',
  'tenant_id',
  'tenant_name',
  'username',
])

const businessStates = new Set<TenantBusinessState>([
  'provisioning',
  'active',
  'maintenance',
  'failed',
])

export function sessionContextUserInfo(context: SessionContext): SessionContextUserInfo {
  return {
    ...context.user,
    roles: [...context.roles],
    perms: [...context.permissions],
  }
}

/** 所有会话入口共用同一个严格运行时边界；字段缺失或类型错误时必须失败关闭。 */
export function isSessionContext(value: unknown): value is SessionContext {
  if (!isRecord(value) || !hasExactKeys(value, sessionContextKeys)) return false
  return isSessionUser(value.user)
    && typeof value.is_super_admin === 'boolean'
    && isStringArray(value.roles)
    && isStringArray(value.permissions)
    && isDecimalString(value.authorization_epoch)
    && isDecimalString(value.runtime_epoch)
    && Array.isArray(value.capabilities)
    && value.capabilities.every(isSessionCapability)
    && isBusinessData(value.business_data)
    && Array.isArray(value.menus)
    && value.menus.every(isMenuNode)
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!isRecord(value)) return false
  const keys = Reflect.ownKeys(value)
  if (!keys.every(key => typeof key === 'string' && sessionUserKeys.has(key))) return false
  if (![
    'email',
    'id',
    'nickname',
    'phone',
    'tenant_id',
    'tenant_name',
    'username',
  ].every(key => Object.hasOwn(value, key))) return false

  return isIdentifier(value.id)
    && isNonEmptyString(value.tenant_id)
    && isNonEmptyString(value.username)
    && isString(value.tenant_name)
    && isString(value.nickname)
    && isString(value.email)
    && isString(value.phone)
    && isOptionalString(value.avatar)
    && isOptionalString(value.dept_name)
    && isOptionalLocale(value.preferred_locale)
}

function isSessionCapability(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, [
    'client_config',
    'code',
    'schema_version',
    'variant',
  ])) return false
  return isNonEmptyString(value.code)
    && isNonEmptyString(value.variant)
    && Number.isSafeInteger(value.schema_version)
    && Number(value.schema_version) >= 1
    && isRecord(value.client_config)
}

function isBusinessData(value: unknown): value is TenantBusinessDataContext {
  if (!isRecord(value) || !hasExactKeys(value, ['placement_generation', 'state'])) return false
  return businessStates.has(value.state as TenantBusinessState)
    && isDecimalString(value.placement_generation)
}

function isMenuNode(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(
    value,
    ['children', 'id', 'menu_type', 'name', 'sort', 'status', 'visible'],
    ['icon', 'parent_id', 'perm_code', 'perm_id', 'route_key'],
  )) return false
  if (!isIdentifier(value.id)
    || !['M', 'C', 'F'].includes(String(value.menu_type))
    || !isNonEmptyString(value.name)
    || !Number.isSafeInteger(value.sort)
    || !isString(value.status)
    || typeof value.visible !== 'boolean'
    || !isOptionalString(value.icon)
    || !isOptionalIdentifier(value.parent_id)
    || !isOptionalIdentifier(value.perm_id)
    || !isOptionalString(value.route_key)) return false
  if (value.perm_code !== undefined
    && value.perm_code !== null
    && (!isNonEmptyString(value.perm_code) || !isPermissionCode(value.perm_code))) return false
  return Array.isArray(value.children) && value.children.every(isMenuNode)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString)
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || isString(value)
}

function isOptionalLocale(value: unknown): boolean {
  return value === undefined || value === null || value === 'zh-CN' || value === 'en-US'
}

function isIdentifier(value: unknown): boolean {
  return isDecimalString(value)
}

function isOptionalIdentifier(value: unknown): boolean {
  return value === undefined || value === null || isIdentifier(value)
}

function isDecimalString(value: unknown): value is string {
  return typeof value === 'string' && /^(?:0|[1-9]\d*)$/u.test(value)
}
