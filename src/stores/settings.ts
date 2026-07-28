import { defineStore } from 'pinia'
import { getConfigByKey } from '@/api/modules/config'
import {
  getApplicationLocale,
  normalizeLocale,
  setApplicationLocale,
  type AppLocale,
} from '@/i18n'

type ComponentSize = 'large' | 'default' | 'small'

const SKIN_COLOR_MAP: Record<string, string> = {
  'skin-blue': '#3B82F6',
  'skin-green': '#22C55E',
  'skin-purple': '#8B5CF6',
  'skin-red': '#F43F5E',
  'skin-yellow': '#EAB308',
}

interface SettingsState {
  theme: 'light' | 'dark'
  themeColor: string
  componentSize: ComponentSize
  locale: AppLocale
  tagsView: boolean
  sidebarLogo: boolean
}

interface ParsedThemeColor {
  red: number
  green: number
  blue: number
  alpha: number
  css: string
}

const STORAGE_KEY = 'ryframe_settings'

const defaults: SettingsState = {
  theme: 'light',
  themeColor: '#6366F1',
  componentSize: 'default',
  locale: getApplicationLocale(),
  tagsView: true,
  sidebarLogo: true,
}

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SettingsState>
      const settings: SettingsState = {
        ...defaults,
        ...parsed,
        locale: normalizeLocale(parsed.locale) ?? getApplicationLocale(),
      }
      const color = parseThemeColor(settings.themeColor)
      return { ...settings, themeColor: color?.css ?? defaults.themeColor }
    }
  } catch {
    // 忽略读取失败，使用默认设置。
  }
  return { ...defaults }
}

function saveSettings(state: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function toByte(value: number): number | undefined {
  if (!Number.isFinite(value) || value < 0 || value > 255) return undefined
  return Math.round(value)
}

function parseRgbChannel(value: string): number | undefined {
  const normalized = value.trim()
  const raw = normalized.endsWith('%')
    ? Number.parseFloat(normalized.slice(0, -1)) * 2.55
    : Number.parseFloat(normalized)
  return toByte(raw)
}

function parseAlpha(value: string | undefined): number | undefined {
  if (value === undefined) return 1
  const normalized = value.trim()
  const raw = normalized.endsWith('%')
    ? Number.parseFloat(normalized.slice(0, -1)) / 100
    : Number.parseFloat(normalized)
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : undefined
}

function colorCss(red: number, green: number, blue: number, alpha: number): string {
  if (alpha === 1) {
    return `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`
  }
  return `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(3))})`
}

/**
 * 启用透明度时，Element Plus 可能输出 #RRGGBBAA 或 rgba()。在推导 HSL 变体前
 * 同时转换这两种形式，以避免无效或透明输入产生 NaN CSS 变量。
 */
export function parseThemeColor(value: string | null | undefined): ParsedThemeColor | undefined {
  if (!value) return undefined
  const source = value.trim()
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(source)?.[1]
  if (hex) {
    const expanded = hex.length <= 4
      ? [...hex].map(part => `${part}${part}`).join('')
      : hex
    const red = Number.parseInt(expanded.slice(0, 2), 16)
    const green = Number.parseInt(expanded.slice(2, 4), 16)
    const blue = Number.parseInt(expanded.slice(4, 6), 16)
    const alpha = expanded.length === 8
      ? Number.parseInt(expanded.slice(6, 8), 16) / 255
      : 1
    return { red, green, blue, alpha, css: colorCss(red, green, blue, alpha) }
  }

  const match = /^rgba?\((.*)\)$/i.exec(source)
  if (!match) return undefined
  const parts = match[1].split(',')
  if (parts.length !== 3 && parts.length !== 4) return undefined
  const red = parseRgbChannel(parts[0] ?? '')
  const green = parseRgbChannel(parts[1] ?? '')
  const blue = parseRgbChannel(parts[2] ?? '')
  const alpha = parseAlpha(parts[3])
  if (red === undefined || green === undefined || blue === undefined || alpha === undefined) return undefined
  return { red, green, blue, alpha, css: colorCss(red, green, blue, alpha) }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6
    else if (max === gf) h = ((bf - rf) / d + 2) / 6
    else h = ((rf - gf) / d + 4) / 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100
  const lf = l / 100
  const c = (1 - Math.abs(2 * lf - 1)) * sf
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = lf - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function applyThemeColor(color: string) {
  const parsed = parseThemeColor(color) ?? parseThemeColor(defaults.themeColor)!
  const { red: r, green: g, blue: b, css } = parsed
  const [h, s, l] = rgbToHsl(r, g, b)

  document.documentElement.style.setProperty('--el-color-primary', css)
  document.documentElement.style.setProperty('--color-primary', css)
  document.documentElement.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`)

  for (let i = 3; i <= 9; i++) {
    const lightL = Math.min(l + (i - 3) * 6.5, 95)
    document.documentElement.style.setProperty(`--el-color-primary-light-${i}`, hslToHex(h, s, lightL))
  }

  const darkColor = hslToHex(h, Math.min(s + 8, 100), Math.max(l - 8, 8))
  document.documentElement.style.setProperty('--el-color-primary-dark-2', darkColor)
  document.documentElement.style.setProperty('--color-primary-dark', darkColor)

  const lightColor = hslToHex(h, Math.max(s - 4, 0), Math.min(l + 10, 95))
  document.documentElement.style.setProperty('--color-primary-light', lightColor)

  document.documentElement.style.setProperty('--sidebar-bg', `linear-gradient(180deg, hsl(${h}, 25%, 20%) 0%, hsl(${h}, 20%, 14%) 100%)`)
  document.documentElement.style.setProperty('--sidebar-item-hover-bg', `rgba(${r}, ${g}, ${b}, 0.12)`)
  document.documentElement.style.setProperty('--sidebar-item-active-bg', `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.25) 0%, rgba(${r}, ${g}, ${b}, 0.20) 100%)`)
  document.documentElement.style.setProperty('--tag-active-bg', `rgba(${r}, ${g}, ${b}, 0.1)`)
  document.documentElement.style.setProperty('--tag-active-bg-dark', `rgba(${r}, ${g}, ${b}, 0.2)`)
  document.documentElement.style.setProperty('--table-row-hover-bg', `rgba(${r}, ${g}, ${b}, 0.05)`)
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

function applyComponentSize(size: ComponentSize) {
  document.documentElement.setAttribute('data-size', size)
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => loadSettings(),

  actions: {
    setTheme(theme: 'light' | 'dark') {
      this.theme = theme
      applyTheme(theme)
      saveSettings(this.$state)
    },

    setThemeColor(color: string) {
      const parsed = parseThemeColor(color)
      if (!parsed) return
      this.themeColor = parsed.css
      applyThemeColor(parsed.css)
      saveSettings(this.$state)
    },

    setComponentSize(size: ComponentSize) {
      this.componentSize = size
      applyComponentSize(size)
      saveSettings(this.$state)
    },

    setLocale(locale: AppLocale) {
      this.locale = locale
      setApplicationLocale(locale)
      saveSettings(this.$state)
    },

    toggleTagsView() {
      this.tagsView = !this.tagsView
      saveSettings(this.$state)
    },

    toggleSidebarLogo() {
      this.sidebarLogo = !this.sidebarLogo
      saveSettings(this.$state)
    },

    resetSettings() {
      Object.assign(this.$state, defaults)
      applyTheme(this.theme)
      applyThemeColor(this.themeColor)
      applyComponentSize(this.componentSize)
      setApplicationLocale(this.locale)
      saveSettings(this.$state)
    },

    initSettings() {
      applyTheme(this.theme)
      applyThemeColor(this.themeColor)
      applyComponentSize(this.componentSize)
      setApplicationLocale(this.locale)
    },

    async syncFromServer() {
      let changed = false

      try {
        const res = await getConfigByKey('sys.index.sideTheme')
        const sideTheme = res.data
        if (sideTheme) {
          const theme = sideTheme === 'theme-dark' ? 'dark' : 'light'
          if (theme !== this.theme) {
            this.theme = theme
            applyTheme(theme)
            changed = true
          }
        }
      } catch {
        // 忽略服务端配置同步失败。
      }

      try {
        const res = await getConfigByKey('sys.index.skinName')
        const skinName = res.data
        if (skinName && SKIN_COLOR_MAP[skinName]) {
          const color = SKIN_COLOR_MAP[skinName]
          if (color !== this.themeColor) {
            this.themeColor = color
            applyThemeColor(color)
            changed = true
          }
        }
      } catch {
        // 忽略服务端配置同步失败。
      }

      if (changed) {
        saveSettings(this.$state)
      }
    },
  },
})
