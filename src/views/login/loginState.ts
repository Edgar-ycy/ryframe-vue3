export interface LoginFormModel {
  tenant_id: string
  username: string
  password: string
  captcha_code: string
}

export function createInitialLoginForm(tenantId: string, isDevelopment: boolean): LoginFormModel {
  return {
    tenant_id: tenantId,
    username: isDevelopment ? 'admin' : '',
    password: isDevelopment ? '123456' : '',
    captcha_code: '',
  }
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
