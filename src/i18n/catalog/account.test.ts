import { describe, expect, it } from 'vitest'
import { accountMessages } from './account'

function flattenKeys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof entry === 'object' && entry !== null
      ? flattenKeys(entry as Record<string, unknown>, path)
      : [path]
  })
}

describe('账户与入口国际化目录', () => {
  it('中英文目录具有完全一致的键集', () => {
    expect(flattenKeys(accountMessages['en-US'])).toEqual(flattenKeys(accountMessages['zh-CN']))
  })

  it('为动态配额和密码规则提供所需参数', () => {
    expect(accountMessages['en-US'].account.tenantQuota).toContain('{users}')
    expect(accountMessages['en-US'].account.passwordTooShort).toContain('{min}')
    expect(accountMessages['zh-CN'].account.passwordTooLong).toContain('{max}')
  })
})
