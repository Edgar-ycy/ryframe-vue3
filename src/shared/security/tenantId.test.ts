import { describe, expect, it } from 'vitest'
import {
  isValidTenantId,
  TENANT_ID_VALIDATION_MESSAGE,
  tenantIdValidationMessage,
} from './tenantId'

describe('tenant identifier policy', () => {
  it.each([
    'a1',
    'system',
    'tenant-a',
    'tenant_a',
    `a${'_'.repeat(62)}z`,
  ])('accepts %s', (tenantId) => {
    expect(isValidTenantId(tenantId)).toBe(true)
    expect(tenantIdValidationMessage(tenantId)).toBeNull()
  })

  it.each([
    '',
    'a',
    '_tenant',
    'tenant_',
    '-tenant',
    'tenant-',
    ' tenant-a',
    'tenant-a ',
    'tenant.*',
    '租户一',
    `a${'_'.repeat(63)}z`,
  ])('rejects %s', (tenantId) => {
    expect(isValidTenantId(tenantId)).toBe(false)
    expect(tenantIdValidationMessage(tenantId)).toBe(TENANT_ID_VALIDATION_MESSAGE)
  })
})
