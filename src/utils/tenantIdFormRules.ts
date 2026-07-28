import type { FormItemRule } from 'element-plus'
import { translate } from '@/i18n'
import { tenantIdValidationMessage } from '@/shared/security/tenantId'

export function tenantIdFormValidationError(value: unknown): Error | undefined {
  const message = tenantIdValidationMessage(
    String(value ?? ''),
    translate('shell.tenant.idInvalid'),
  )
  return message ? new Error(message) : undefined
}

const validateTenantId: FormItemRule['validator'] = (_rule, value, callback) => {
  callback(tenantIdFormValidationError(value))
}

/** 返回新的规则对象，避免 Element Plus 表单共享可变状态。 */
export function createTenantIdFormRules(): FormItemRule[] {
  return [
    { required: true, message: translate('shell.tenant.idRequired'), trigger: 'blur' },
    { validator: validateTenantId, trigger: 'blur' },
  ]
}
