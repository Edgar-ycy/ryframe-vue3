const LEGACY_TOKEN_KEYS = ['ryframe_token', 'ryframe_refresh_token'] as const
const TENANT_ID_KEY = 'ryframe_tenant_id'
const DEFAULT_TENANT_ID = 'system'

function storage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

/**
 * v0.5 no longer persists credentials in browser storage. Keep this migration
 * idempotent so users upgrading from v0.4 do not retain stale bearer tokens.
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
