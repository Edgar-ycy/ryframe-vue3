const TOKEN_KEY = 'ryframe_token'
const REFRESH_TOKEN_KEY = 'ryframe_refresh_token'
const TENANT_ID_KEY = 'ryframe_tenant_id'
const DEFAULT_TENANT_ID = 'system'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function getTenantId(): string {
  return localStorage.getItem(TENANT_ID_KEY) || DEFAULT_TENANT_ID
}

export function setTenantId(tenantId: string): void {
  localStorage.setItem(TENANT_ID_KEY, tenantId || DEFAULT_TENANT_ID)
}

export function removeTenantId(): void {
  localStorage.removeItem(TENANT_ID_KEY)
}
