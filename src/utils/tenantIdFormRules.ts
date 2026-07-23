import type { FormItemRule } from 'element-plus'
import { tenantIdValidationMessage } from '@/shared/security/tenantId'

export function tenantIdFormValidationError(value: unknown): Error | undefined {
  const message = tenantIdValidationMessage(String(value ?? ''))
  return message ? new Error(message) : undefined
}

const validateTenantId: FormItemRule['validator'] = (_rule, value, callback) => {
  callback(tenantIdFormValidationError(value))
}

/** Return fresh rule objects so Element Plus forms cannot share mutable state. */
export function createTenantIdFormRules(): FormItemRule[] {
  return [
    { required: true, message: '请输入租户标识', trigger: 'blur' },
    { validator: validateTenantId, trigger: 'blur' },
  ]
}
