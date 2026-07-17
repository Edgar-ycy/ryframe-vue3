export interface LoginFormModel {
  tenant_id: string
  username: string
  password: string
  captcha_code: string
}

export function createInitialLoginForm(
  tenantId: string,
  isDevelopment: boolean,
): LoginFormModel {
  return {
    tenant_id: tenantId,
    username: isDevelopment ? 'admin' : '',
    password: isDevelopment ? '123456' : '',
    captcha_code: '',
  }
}

export function resolveLoginRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value === '/login') return '/'
  return value
}
