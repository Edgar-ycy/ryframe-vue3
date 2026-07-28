const LEGACY_TOKEN_KEYS = ['ryframe_token', 'ryframe_refresh_token'] as const
const TENANT_ID_KEY = 'ryframe_tenant_id'
const DEFAULT_TENANT_ID = 'system'

function storage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

/**
 * v0.5 不再将凭据持久化到浏览器存储。此迁移必须保持幂等，
 * 以免从 v0.4 升级的用户保留过期的 Bearer 令牌。
 */
export function clearLegacyAuthStorage(): void {
  const local = storage()
  if (!local) return
  for (const key of LEGACY_TOKEN_KEYS) local.removeItem(key)
}

export function getTenantId(): string {
  return storage()?.getItem(TENANT_ID_KEY) || DEFAULT_TENANT_ID
}

export function setTenantId(tenantId: string): void {
  storage()?.setItem(TENANT_ID_KEY, tenantId || DEFAULT_TENANT_ID)
}

export function removeTenantId(): void {
  storage()?.removeItem(TENANT_ID_KEY)
}

clearLegacyAuthStorage()
