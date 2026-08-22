import { afterEach, describe, expect, it } from 'vitest'
import {
  formatLocalizedDate,
  formatOptionalLocalizedDate,
  getApplicationLocale,
  setApplicationLocale,
} from '@/i18n'

const originalLocale = getApplicationLocale()

afterEach(() => setApplicationLocale(originalLocale))

describe('日期国际化显示', () => {
  it.each(['zh-CN', 'en-US'] as const)('按应用语言格式化 RFC3339 时间：%s', (locale) => {
    setApplicationLocale(locale)
    const value = '2026-08-21T09:53:38Z'
    const expected = new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(Date.parse(value))

    expect(formatLocalizedDate(value)).toBe(expected)
  })

  it('保留非法日期并统一显示空值占位符', () => {
    expect(formatLocalizedDate('invalid')).toBe('invalid')
    expect(formatOptionalLocalizedDate(null)).toBe('—')
    expect(formatOptionalLocalizedDate(undefined)).toBe('—')
  })
})
