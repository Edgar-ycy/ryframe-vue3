import type { CreateTenantPayload, UpdateTenantPayload } from '@/api/modules/tenant'
import { PASSWORD_POLICY } from '@/shared/security/passwordPolicy'

export type TenantFormModel = {
  tenant_id: string
  name: string
  domain: string
  expire_at: string
  max_users: number
  max_roles: number
  max_storage_mb: number
  max_requests_per_min: number
  admin_username: string
  admin_password: string
  plan_version_id: string
  data_target_key: string
}

type Translate = (key: string, values?: Record<string, unknown>) => string

export function createDefaultTenantForm(): TenantFormModel {
  return {
    tenant_id: '',
    name: '',
    domain: '',
    expire_at: '',
    max_users: 100,
    max_roles: 20,
    max_storage_mb: 1024,
    max_requests_per_min: 1000,
    admin_username: '',
    admin_password: '',
    plan_version_id: '',
    data_target_key: '',
  }
}

export function buildCreateTenantPayload(form: TenantFormModel): CreateTenantPayload {
  return {
    tenant_id: form.tenant_id.trim(),
    name: form.name.trim(),
    domain: form.domain.trim() || undefined,
    expire_at: form.expire_at || undefined,
    max_users: form.max_users,
    max_roles: form.max_roles,
    max_storage_mb: form.max_storage_mb,
    max_requests_per_min: form.max_requests_per_min,
    admin_username: form.admin_username.trim(),
    admin_password: form.admin_password,
    plan_version_id: form.plan_version_id,
    data_target_key: form.data_target_key,
  }
}

export function buildUpdateTenantPayload(form: TenantFormModel): UpdateTenantPayload {
  return {
    name: form.name.trim(),
    domain: form.domain.trim() || undefined,
    expire_at: form.expire_at || undefined,
    max_users: form.max_users,
    max_roles: form.max_roles,
    max_storage_mb: form.max_storage_mb,
    max_requests_per_min: form.max_requests_per_min,
  }
}

export function tenantPasswordValidationMessage(
  password: string,
  t: Translate,
): string | undefined {
  if (password.length < PASSWORD_POLICY.min_length)
    return t('tenantCapacity.passwordTooShort', { min: PASSWORD_POLICY.min_length })
  if (password.length > PASSWORD_POLICY.max_length)
    return t('tenantCapacity.passwordTooLong', { max: PASSWORD_POLICY.max_length })
  if (!/^[!-~]+$/.test(password)) return t('tenantCapacity.passwordVisibleAscii')
  if (PASSWORD_POLICY.required_classes.includes('uppercase') && !/[A-Z]/.test(password))
    return t('tenantCapacity.passwordNeedsUppercase')
  if (PASSWORD_POLICY.required_classes.includes('lowercase') && !/[a-z]/.test(password))
    return t('tenantCapacity.passwordNeedsLowercase')
  if (PASSWORD_POLICY.required_classes.includes('digit') && !/[0-9]/.test(password))
    return t('tenantCapacity.passwordNeedsDigit')
  if (PASSWORD_POLICY.required_classes.includes('special') && !/[^A-Za-z0-9]/.test(password))
    return t('tenantCapacity.passwordNeedsSpecial')
  return undefined
}
