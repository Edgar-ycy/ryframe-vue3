// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { parseThemeColor, resolveReadableThemeColor, useSettingsStore } from './settings'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

function relativeLuminance(color: string): number {
  const normalized = parseThemeColor(color)!
  const channel = (value: number) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(normalized.red) + 0.7152 * channel(normalized.green) + 0.0722 * channel(normalized.blue)
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
}

describe('theme color parsing', () => {
  it('normalizes canonical six-digit hex colors', () => {
    expect(parseThemeColor('#6366f1')).toMatchObject({
      red: 99,
      green: 102,
      blue: 241,
      css: '#6366F1',
    })
  })

  it('rejects shorthand, alpha and functional color forms', () => {
    for (const value of ['#abc', '#6366F180', 'rgba(10, 20, 30, 0.25)', '#12']) {
      expect(parseThemeColor(value)).toBeUndefined()
    }
  })

  it('derives readable foreground colors for custom theme colors', () => {
    for (const color of ['#4F46E5', '#EAB308', '#22C55E', '#F43F5E']) {
      expect(contrastRatio(resolveReadableThemeColor(color), '#F3F4F6')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('persists a versioned and validated settings document', () => {
    const store = useSettingsStore()
    store.setTheme('dark')
    store.setThemeColor('#6366f1')

    expect(JSON.parse(localStorage.getItem('ryframe_settings')!)).toMatchObject({
      schema_version: 1,
      settings: {
        theme: 'dark',
        themeColor: '#6366F1',
      },
    })
  })

  it('applies server theme settings through the pure store boundary', () => {
    const store = useSettingsStore()
    store.applyServerSettings({ sideTheme: 'theme-dark', skinName: 'skin-blue' })

    expect(store.theme).toBe('dark')
    expect(store.themeColor).toBe('#3B82F6')
    expect(JSON.parse(localStorage.getItem('ryframe_settings')!)).toMatchObject({
      schema_version: 1,
      settings: { theme: 'dark', themeColor: '#3B82F6' },
    })
  })

  it('does not accept an unversioned or invalid persisted settings format', () => {
    localStorage.setItem('ryframe_settings', JSON.stringify({
      theme: 'dark',
      themeColor: '#00000080',
    }))
    let store = useSettingsStore()
    expect(store.theme).toBe('light')
    expect(store.themeColor).toBe('#4F46E5')

    setActivePinia(createPinia())
    localStorage.setItem('ryframe_settings', JSON.stringify({
      schema_version: 1,
      settings: {
        theme: 'unknown',
        themeColor: 'rgba(0, 0, 0, 0.5)',
        componentSize: 'huge',
        locale: 'invalid',
        tagsView: 'yes',
        sidebarLogo: 1,
      },
    }))
    store = useSettingsStore()
    expect(store.$state).toMatchObject({
      theme: 'light',
      themeColor: '#4F46E5',
      componentSize: 'default',
      tagsView: true,
      sidebarLogo: true,
    })
  })
})
