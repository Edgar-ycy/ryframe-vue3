import { describe, expect, it, vi } from 'vitest'
import { translate } from '@/i18n'
import {
  createTenantIdFormRules,
  tenantIdFormValidationError,
} from './tenantIdFormRules'

type RuleValidator = (
  rule: unknown,
  value: unknown,
  callback: (error?: Error) => void,
) => void | Promise<void>

describe('tenant identifier form rules', () => {
  it('shares required and backend-aligned format rules across forms', () => {
    const first = createTenantIdFormRules()
    const second = createTenantIdFormRules()

    expect(first).not.toBe(second)
    expect(first[0]).toMatchObject({
      required: true,
      message: translate('shell.tenant.idRequired'),
      trigger: 'blur',
    })
    expect(first[1]?.validator).toBeTypeOf('function')
  })

  it('passes valid identifiers and returns the localized error for invalid ones', async () => {
    expect(tenantIdFormValidationError('tenant-a')).toBeUndefined()
    expect(tenantIdFormValidationError('tenant_*')?.message)
      .toBe(translate('shell.tenant.idInvalid'))

    const validator = createTenantIdFormRules()[1]?.validator as RuleValidator
    const validCallback = vi.fn()
    const invalidCallback = vi.fn()

    await validator({}, 'tenant-a', validCallback)
    await validator({}, 'tenant_*', invalidCallback)

    expect(validCallback).toHaveBeenCalledWith(undefined)
    expect(invalidCallback.mock.calls[0]?.[0]?.message).toBe(translate('shell.tenant.idInvalid'))
  })
})
