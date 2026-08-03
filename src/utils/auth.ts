const TENANT_ID_KEY = 'ryframe_tenant_id'
const DEFAULT_TENANT_ID = 'system'

function storage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
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
