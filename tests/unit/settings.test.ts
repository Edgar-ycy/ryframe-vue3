import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyComponentSize, applyTheme, applyThemeColor } from '@/stores/settings/domAdapter'
import { createDefaultSettings, DEFAULT_THEME_COLOR, SKIN_COLOR_MAP } from '@/stores/settings/model'
import { loadSettings, saveSettings } from '@/stores/settings/persistence'
import {
  hslToHex,
  parseThemeColor,
  resolveReadableThemeColor,
  rgbToHsl,
} from '@/stores/settings/theme'

afterEach(() => vi.unstubAllGlobals())

describe('设置主题模型', () => {
  it('规范化十六进制颜色并拒绝透明色和短写', () => {
    expect(parseThemeColor(' #4f46e5 ')).toEqual({
      red: 79,
      green: 70,
      blue: 229,
      css: '#4F46E5',
    })
    expect(parseThemeColor('#fff')).toBeUndefined()
    expect(parseThemeColor('#4F46E580')).toBeUndefined()
    expect(parseThemeColor(undefined)).toBeUndefined()
    expect(parseThemeColor('not-a-color')).toBeUndefined()
  })

  it('稳定转换 HSL 并为浅色主色生成可读前景色', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual([0, 100, 50])
    expect(rgbToHsl(0, 255, 0)).toEqual([120, 100, 50])
    expect(rgbToHsl(0, 0, 255)).toEqual([240, 100, 50])
    expect(rgbToHsl(128, 128, 128)).toEqual([0, 0, 50])
    expect(rgbToHsl(64, 32, 32)).toEqual([0, 33, 19])
    expect(hslToHex(0, 100, 50)).toBe('#ff0000')
    expect(hslToHex(60, 100, 50)).toBe('#ffff00')
    expect(hslToHex(120, 100, 50)).toBe('#00ff00')
    expect(hslToHex(180, 100, 50)).toBe('#00ffff')
    expect(hslToHex(240, 100, 50)).toBe('#0000ff')
    expect(hslToHex(300, 100, 50)).toBe('#ff00ff')
    expect(resolveReadableThemeColor('#FFFFFF')).toMatch(/^#[0-9A-F]{6}$/u)
    expect(resolveReadableThemeColor('#FFFFFF')).not.toBe('#FFFFFF')
    expect(resolveReadableThemeColor('invalid')).toMatch(/^#[0-9A-F]{6}$/u)
    expect(resolveReadableThemeColor('#111827')).toBe('#111827')
  })

  it('提供完整且不可变语义的默认设置', () => {
    expect(createDefaultSettings('en-US')).toEqual({
      theme: 'light',
      themeColor: DEFAULT_THEME_COLOR,
      componentSize: 'default',
      locale: 'en-US',
      tagsView: true,
      sidebarLogo: true,
    })
    expect(Object.keys(SKIN_COLOR_MAP)).toEqual([
      'skin-blue',
      'skin-green',
      'skin-purple',
      'skin-red',
      'skin-yellow',
    ])
  })
})

describe('设置持久化', () => {
  it('读取受版本保护的数据并清理非法字段', () => {
    const defaults = createDefaultSettings('zh-CN')
    vi.stubGlobal('localStorage', {
      getItem: () =>
        JSON.stringify({
          schema_version: 1,
          settings: {
            componentSize: 'huge',
            locale: 'en-US',
            sidebarLogo: false,
            tagsView: false,
            theme: 'dark',
            themeColor: '#22c55e',
          },
        }),
    })

    expect(loadSettings(defaults)).toEqual({
      componentSize: 'default',
      locale: 'en-US',
      sidebarLogo: false,
      tagsView: false,
      theme: 'dark',
      themeColor: '#22C55E',
    })
  })

  it('未知版本回退默认值并以当前版本保存', () => {
    const defaults = createDefaultSettings('zh-CN')
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ schema_version: 2, settings: {} }),
      setItem,
    })

    expect(loadSettings(defaults)).toEqual(defaults)
    saveSettings(defaults)
    expect(JSON.parse(setItem.mock.calls[0][1])).toEqual({
      schema_version: 1,
      settings: defaults,
    })
  })

  it.each([
    null,
    'null',
    '[]',
    '{}',
    '{"schema_version":1}',
    '{"schema_version":1,"settings":null}',
    '{invalid',
  ])('损坏或不完整的存储值回退默认设置：%s', (stored) => {
    const defaults = createDefaultSettings('zh-CN')
    vi.stubGlobal('localStorage', {
      getItem: () => stored,
    })
    expect(loadSettings(defaults)).toEqual(defaults)
    expect(loadSettings(defaults)).not.toBe(defaults)
  })

  it('非法主题、颜色、语言和布尔字段逐项回退', () => {
    const defaults = createDefaultSettings('zh-CN')
    vi.stubGlobal('localStorage', {
      getItem: () =>
        JSON.stringify({
          schema_version: 1,
          settings: {
            theme: 'contrast',
            themeColor: '#fff',
            componentSize: null,
            locale: 'unknown',
            tagsView: 'yes',
            sidebarLogo: 1,
          },
        }),
    })
    expect(loadSettings(defaults)).toEqual(defaults)
  })
})

describe('设置 DOM 适配器', () => {
  it('将主题、字号和颜色集中投影到根节点', () => {
    const properties = new Map<string, string>()
    const setAttribute = vi.fn()
    const toggle = vi.fn()
    vi.stubGlobal('document', {
      documentElement: {
        classList: { toggle },
        setAttribute,
        style: { setProperty: (key: string, value: string) => properties.set(key, value) },
      },
    })

    applyTheme('dark')
    applyComponentSize('small')
    applyThemeColor('#4F46E5')

    expect(toggle).toHaveBeenCalledWith('dark', true)
    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
    expect(setAttribute).toHaveBeenCalledWith('data-size', 'small')
    expect(properties.get('--el-color-primary')).toBe('#4F46E5')
    expect(properties.get('--color-primary-readable')).toMatch(/^#[0-9A-F]{6}$/u)
    expect(properties.has('--el-color-primary-light-9')).toBe(true)
    expect(properties.get('--sidebar-bg')).toContain('linear-gradient')
    expect(properties.get('--el-color-primary-dark-2')).toMatch(/^#[0-9a-f]{6}$/u)
  })

  it('无效颜色使用默认主题色并可切换回浅色和大号组件', () => {
    const properties = new Map<string, string>()
    const setAttribute = vi.fn()
    const toggle = vi.fn()
    vi.stubGlobal('document', {
      documentElement: {
        classList: { toggle },
        setAttribute,
        style: { setProperty: (key: string, value: string) => properties.set(key, value) },
      },
    })

    applyThemeColor('invalid')
    applyTheme('light')
    applyComponentSize('large')

    expect(properties.get('--el-color-primary')).toBe(DEFAULT_THEME_COLOR)
    expect(toggle).toHaveBeenCalledWith('dark', false)
    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'light')
    expect(setAttribute).toHaveBeenCalledWith('data-size', 'large')
  })
})
