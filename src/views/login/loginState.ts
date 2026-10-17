export interface LoginFormModel {
  tenant_id: string
  username: string
  password: string
  captcha_code: string
}

export interface LoginTenantCapabilities {
  loaded: boolean
  multiTenancyEnabled: boolean
}

export function createInitialLoginForm(tenantId: string): LoginFormModel {
  return {
    tenant_id: tenantId,
    username: '',
    password: '',
    captcha_code: '',
  }
}

export function showLoginTenantSelector(capabilities: LoginTenantCapabilities): boolean {
  return capabilities.loaded && capabilities.multiTenancyEnabled
}

export function resolveLoginTenantId(
  selectedTenantId: string,
  capabilities: LoginTenantCapabilities,
  defaultTenantId: string,
): string {
  if (!capabilities.loaded) return ''
  return capabilities.multiTenancyEnabled ? selectedTenantId.trim() : defaultTenantId
}

export function resolveLoginRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/index'
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    [...value].some((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127
    }) ||
    value === '/login'
  )
    return '/index'
  return value
}
