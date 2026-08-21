import { afterEach, describe, expect, it } from 'vitest'
import { menuRouteCatalog } from '@/api/generated/menuRoutes'
import {
  getApplicationLocale,
  setApplicationLocale,
  translateNavigationTitle,
} from '@/i18n'
import { messages } from '@/i18n/messages'

const originalLocale = getApplicationLocale()

afterEach(() => setApplicationLocale(originalLocale))

describe('菜单国际化目录', () => {
  it('中文翻译与后端访问目录默认名称完全一致', () => {
    const navigation = messages['zh-CN'].navigation as Record<string, string>
    for (const menu of menuRouteCatalog) {
      expect(navigation[menu.titleKey], menu.routeKey).toBe(menu.defaultName)
    }
  })

  it('所有菜单 route key 在中英文环境下都能显示友好名称', () => {
    for (const locale of ['zh-CN', 'en-US'] as const) {
      setApplicationLocale(locale)
      for (const menu of menuRouteCatalog) {
        const title = translateNavigationTitle(menu.routeKey)
        expect(title, `${locale}:${menu.routeKey}`).not.toBe(menu.routeKey)
        expect(title.trim(), `${locale}:${menu.routeKey}`).not.toBe('')
      }
    }
  })

  it('保留未知自定义菜单名称', () => {
    expect(translateNavigationTitle('业务自定义入口')).toBe('业务自定义入口')
  })
})
