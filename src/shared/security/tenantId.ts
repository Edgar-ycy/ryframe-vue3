/** Keep browser-side tenant identifiers aligned with the backend boundary. */
export const TENANT_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,62}[A-Za-z0-9])$/

export const TENANT_ID_VALIDATION_MESSAGE =
  '租户标识必须为 2–64 位 ASCII 字母、数字、下划线或连字符，且首尾必须是字母或数字'

export function isValidTenantId(value: string): boolean {
  return TENANT_ID_PATTERN.test(value)
}

export function tenantIdValidationMessage(value: string): string | null {
  return isValidTenantId(value) ? null : TENANT_ID_VALIDATION_MESSAGE
}
