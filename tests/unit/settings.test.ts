import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyComponentSize, applyTheme, applyThemeColor } from '@/stores/settings/domAdapter'
import { createDefaultSettings } from '@/stores/settings/model'
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
  })

  it('稳定转换 HSL 并为浅色主色生成可读前景色', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual([0, 100, 50])
    expect(hslToHex(0, 100, 50)).toBe('#ff0000')
    expect(resolveReadableThemeColor('#FFFFFF')).toMatch(/^#[0-9A-F]{6}$/u)
    expect(resolveReadableThemeColor('#FFFFFF')).not.toBe('#FFFFFF')
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
  })
})
