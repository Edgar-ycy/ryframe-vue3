import { afterEach, describe, expect, it } from 'vitest'
import {
  getApplicationLocale,
  normalizeLocale,
  setApplicationLocale,
  translate,
  translateNavigationTitle,
} from './index'

describe('application internationalization', () => {
  afterEach(() => {
    setApplicationLocale('zh-CN')
  })

  it('normalizes supported locale aliases only', () => {
    expect(normalizeLocale('zh')).toBe('zh-CN')
    expect(normalizeLocale('zh-Hans')).toBe('zh-CN')
    expect(normalizeLocale('en_us')).toBe('en-US')
    expect(normalizeLocale('en-GB')).toBe('en-US')
    expect(normalizeLocale('fr-FR')).toBeUndefined()
    expect(normalizeLocale(null)).toBeUndefined()
  })

  it('switches translations and known navigation labels together', () => {
    setApplicationLocale('en-US')

    expect(getApplicationLocale()).toBe('en-US')
    expect(translate('settings.title')).toBe('Layout settings')
    expect(translateNavigationTitle('系统管理')).toBe('System')
    expect(translateNavigationTitle('Custom item')).toBe('Custom item')
  })

  it('provides localized accessible names for keyboard controls', () => {
    expect(translate('navbar.toggleSidebar')).toBe('展开或收起侧边栏')
    expect(translate('settings.selectThemeColor', { color: '#6366F1' }))
      .toBe('选择主题颜色 #6366F1')
    expect(translate('account.refreshCaptcha')).toBe('刷新验证码')
    expect(translate('shell.tags.close', { title: '首页' })).toBe('关闭标签 首页')

    setApplicationLocale('en-US')

    expect(translate('navbar.toggleSidebar')).toBe('Toggle sidebar')
    expect(translate('settings.selectThemeColor', { color: '#6366F1' }))
      .toBe('Select theme color #6366F1')
    expect(translate('account.refreshCaptcha')).toBe('Refresh verification code')
    expect(translate('shell.tags.close', { title: 'Dashboard' })).toBe('Close tab Dashboard')
  })
})
