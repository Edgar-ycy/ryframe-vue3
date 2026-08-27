import { afterEach, describe, expect, it } from 'vitest'
import { menuRouteCatalog } from '@/api/generated/menuRoutes'
import {
  getApplicationLocale,
  setApplicationLocale,
  translate,
  translateNavigationTitle,
} from '@/i18n'
import { getMenuPage } from '@/features/pageRegistry'
import { ensureRouteMessageCatalogs } from '@/i18n/lazyCatalog'
import { initialMessageCatalogs, messages } from '@/i18n/messages'

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

  it('首屏只同步安装 core、shell 与全局导出中心目录', () => {
    const initialZhCN = messages['zh-CN'] as Record<string, unknown>
    expect(initialMessageCatalogs).toHaveLength(3)
    expect(initialZhCN.common).toBeDefined()
    expect(initialZhCN.shell).toBeDefined()
    expect(initialZhCN.exportCenter).toBeDefined()
    expect(initialZhCN.account).toBeUndefined()
    expect(initialZhCN.system).toBeUndefined()
    expect(initialZhCN.monitor).toBeUndefined()
  })

  it('页面加载器按 route namespace 自动安装领域文案目录', async () => {
    await getMenuPage('system.role')?.component?.()
    await getMenuPage('monitor.jobs')?.component?.()
    await getMenuPage('system.service-accounts')?.component?.()
    await getMenuPage('platform.data-targets')?.component?.()
    setApplicationLocale('zh-CN')
    expect(translate('system.common.search')).toBe('搜索')
    expect(translate('monitor.jobs.title')).toBe('后台任务')
    expect(translate('serviceAccounts.title')).toBe('服务账号')
    setApplicationLocale('en-US')
    expect(translate('tenantData.targetsTitle')).toBe('Data targets')
  })

  it('异步目录同时安装两种语言，切换语言无需再次加载', async () => {
    await ensureRouteMessageCatalogs('account.login')
    setApplicationLocale('zh-CN')
    expect(translate('account.signIn')).toBe('登录')
    setApplicationLocale('en-US')
    expect(translate('account.signIn')).toBe('Sign in')
  })
})
