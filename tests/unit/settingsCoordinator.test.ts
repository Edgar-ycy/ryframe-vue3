import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyServerSettings,
  initializeSettings,
  resetSettings,
  setComponentSize,
  setLocale,
  setTheme,
  setThemeColor,
  toggleSidebarLogo,
  toggleTagsView,
} from '@/app/settings/coordinator'
import { setApplicationLocale } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import { createDefaultSettings, DEFAULT_THEME_COLOR } from '@/stores/settings/model'
import { installSettingsEnvironment, settingsWriteCount } from './settingsCoordinatorFixtures'

describe('设置协调器', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setApplicationLocale('zh-CN', { persist: false })
  })

  afterEach(() => {
    setApplicationLocale('zh-CN', { persist: false })
    vi.unstubAllGlobals()
  })

  it('初始化时读取持久化值并发布全部投影，但不写回存储', () => {
    const environment = installSettingsEnvironment(
      JSON.stringify({
        schema_version: 1,
        settings: {
          componentSize: 'small',
          locale: 'en-US',
          sidebarLogo: false,
          tagsView: false,
          theme: 'dark',
          themeColor: '#22c55e',
        },
      }),
    )

    initializeSettings()

    expect(useSettingsStore().$state).toEqual({
      componentSize: 'small',
      locale: 'en-US',
      sidebarLogo: false,
      tagsView: false,
      theme: 'dark',
      themeColor: '#22C55E',
    })
    expect(environment.classToggle).toHaveBeenCalledWith('dark', true)
    expect(environment.attributes.get('data-theme')).toBe('dark')
    expect(environment.attributes.get('data-size')).toBe('small')
    expect(environment.properties.get('--el-color-primary')).toBe('#22C55E')
    expect(document.documentElement.lang).toBe('en-US')
    expect(environment.setItem).not.toHaveBeenCalled()
  })

  it('设置命令按内存、运行时副作用和持久化顺序更新投影', () => {
    const environment = installSettingsEnvironment()
    initializeSettings()
    environment.setItem.mockClear()

    setTheme('dark')
    setThemeColor('#22c55e')
    setComponentSize('large')
    setLocale('en-US')
    toggleTagsView()
    toggleSidebarLogo()

    expect(useSettingsStore().$state).toEqual({
      componentSize: 'large',
      locale: 'en-US',
      sidebarLogo: false,
      tagsView: false,
      theme: 'dark',
      themeColor: '#22C55E',
    })
    expect(environment.attributes.get('data-theme')).toBe('dark')
    expect(environment.attributes.get('data-size')).toBe('large')
    expect(environment.properties.get('--el-color-primary')).toBe('#22C55E')
    expect(environment.values.get('ryframe_locale')).toBe('en-US')
    expect(settingsWriteCount(environment.setItem)).toBe(6)

    const writesBeforeInvalidColor = settingsWriteCount(environment.setItem)
    setThemeColor('#fff')
    expect(useSettingsStore().themeColor).toBe('#22C55E')
    expect(settingsWriteCount(environment.setItem)).toBe(writesBeforeInvalidColor)
  })

  it('复位使用初始化时捕获的默认值', () => {
    const environment = installSettingsEnvironment()
    initializeSettings()
    setTheme('dark')
    setLocale('en-US')
    setThemeColor('#22C55E')
    setComponentSize('small')
    toggleTagsView()
    toggleSidebarLogo()
    environment.setItem.mockClear()

    resetSettings()

    expect(useSettingsStore().$state).toEqual(createDefaultSettings('zh-CN'))
    expect(useSettingsStore().themeColor).toBe(DEFAULT_THEME_COLOR)
    expect(environment.attributes.get('data-theme')).toBe('light')
    expect(environment.values.get('ryframe_locale')).toBe('zh-CN')
    expect(settingsWriteCount(environment.setItem)).toBe(1)
  })

  it('服务端主题仅在合法值实际变化时应用并合并保存', () => {
    const environment = installSettingsEnvironment()
    initializeSettings()
    environment.setItem.mockClear()

    applyServerSettings({ sideTheme: 'theme-dark', skinName: 'skin-blue' })
    expect(useSettingsStore().theme).toBe('dark')
    expect(useSettingsStore().themeColor).toBe('#3B82F6')
    expect(settingsWriteCount(environment.setItem)).toBe(1)

    applyServerSettings({ sideTheme: 'theme-dark', skinName: 'skin-blue' })
    applyServerSettings({ skinName: 'unknown-skin' })
    expect(settingsWriteCount(environment.setItem)).toBe(1)

    applyServerSettings({ sideTheme: 'theme-light' })
    expect(useSettingsStore().theme).toBe('light')
    expect(settingsWriteCount(environment.setItem)).toBe(2)
  })

  it('同一 Store 只初始化一次且重复调用不读取或应用外部投影', () => {
    const environment = installSettingsEnvironment()
    initializeSettings()
    setTheme('dark')
    environment.getItem.mockClear()
    environment.writes.forEach((write) => write.mockClear())
    const patch = vi.spyOn(useSettingsStore(), '$patch')

    initializeSettings()

    expect(useSettingsStore().theme).toBe('dark')
    expect(patch).not.toHaveBeenCalled()
    expect(environment.getItem).not.toHaveBeenCalled()
    environment.writes.forEach((write) => expect(write).not.toHaveBeenCalled())
  })

  it('相同设置、规范化后相同颜色与默认复位均不产生写入', () => {
    const environment = installSettingsEnvironment()
    initializeSettings()
    environment.writes.forEach((write) => write.mockClear())
    const store = useSettingsStore()
    const mutation = vi.fn()
    const stop = store.$subscribe(mutation, { flush: 'sync' })
    const patch = vi.spyOn(store, '$patch')

    setTheme('light')
    setThemeColor(' #4f46e5 ')
    setThemeColor('invalid')
    setComponentSize('default')
    setLocale('zh-CN')
    resetSettings()

    expect(mutation).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
    environment.writes.forEach((write) => expect(write).not.toHaveBeenCalled())
    stop()
  })

  it('仅切换显示标志后复位只保存状态，不重复应用主题或语言', () => {
    const environment = installSettingsEnvironment()
    initializeSettings()
    toggleTagsView()
    environment.writes.forEach((write) => write.mockClear())

    resetSettings()

    expect(useSettingsStore().tagsView).toBe(true)
    expect(settingsWriteCount(environment.setItem)).toBe(1)
    environment.writes
      .filter((write) => write !== environment.setItem)
      .forEach((write) => expect(write).not.toHaveBeenCalled())
  })

  it('Store 创建不读取语言或操作 DOM，默认快照在各 Pinia 实例间隔离', () => {
    const environment = installSettingsEnvironment()
    const first = createPinia()
    const second = createPinia()
    setApplicationLocale('en-US', { persist: false })
    environment.writes.forEach((write) => write.mockClear())
    setActivePinia(first)
    expect(useSettingsStore().locale).toBe('zh-CN')
    expect(environment.getItem).not.toHaveBeenCalled()
    environment.writes.forEach((write) => expect(write).not.toHaveBeenCalled())
    initializeSettings()

    setApplicationLocale('zh-CN', { persist: false })
    setActivePinia(second)
    initializeSettings()
    setLocale('en-US')
    setActivePinia(first)
    setLocale('zh-CN')
    resetSettings()
    expect(useSettingsStore().locale).toBe('en-US')
    setActivePinia(second)
    resetSettings()
    expect(useSettingsStore().locale).toBe('zh-CN')
  })

  it('初始化前复位失败且不读取或写入外部状态', () => {
    const environment = installSettingsEnvironment()
    expect(() => resetSettings()).toThrow('重置设置前必须先初始化设置')
    expect(environment.getItem).not.toHaveBeenCalled()
    environment.writes.forEach((write) => expect(write).not.toHaveBeenCalled())
  })

  it('主题副作用发生时状态已更新，持久化发生时 DOM 已更新', () => {
    const environment = installSettingsEnvironment()
    initializeSettings()
    environment.classToggle.mockImplementation((_name, enabled) => {
      expect(useSettingsStore().theme).toBe(enabled ? 'dark' : 'light')
    })
    environment.setItem.mockImplementation((key, value) => {
      if (key === 'ryframe_settings') {
        expect(environment.attributes.get('data-theme')).toBe('dark')
        expect(JSON.parse(value).settings.theme).toBe('dark')
      }
      environment.values.set(key, value)
      return environment.values
    })
    setTheme('dark')
    expect(settingsWriteCount(environment.setItem)).toBe(1)
  })
})
