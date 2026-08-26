import { defineStore } from 'pinia'
import { getApplicationLocale, normalizeLocale, setApplicationLocale, type AppLocale } from '@/i18n'

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

export interface ShellServerSettings {
  sideTheme?: string
  skinName?: string
}

interface ParsedThemeColor {
  red: number
  green: number
  blue: number
  css: string
}

const STORAGE_KEY = 'ryframe_settings'
const SETTINGS_SCHEMA_VERSION = 1

const defaults: SettingsState = {
  theme: 'light',
  themeColor: '#4F46E5',
  componentSize: 'default',
  locale: getApplicationLocale(),
  tagsView: true,
  sidebarLogo: true,
}

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('schema_version' in parsed) ||
        parsed.schema_version !== SETTINGS_SCHEMA_VERSION ||
        !('settings' in parsed) ||
        typeof parsed.settings !== 'object' ||
        parsed.settings === null
      )
        return { ...defaults }

      const value = parsed.settings as Partial<Record<keyof SettingsState, unknown>>
      const theme = value.theme === 'light' || value.theme === 'dark' ? value.theme : defaults.theme
      const themeColor =
        typeof value.themeColor === 'string'
          ? (parseThemeColor(value.themeColor)?.css ?? defaults.themeColor)
          : defaults.themeColor
      const componentSize = ['large', 'default', 'small'].includes(String(value.componentSize))
        ? (value.componentSize as ComponentSize)
        : defaults.componentSize
      const locale =
        typeof value.locale === 'string'
          ? (normalizeLocale(value.locale) ?? getApplicationLocale())
          : getApplicationLocale()

      return {
        theme,
        themeColor,
        componentSize,
        locale,
        tagsView: typeof value.tagsView === 'boolean' ? value.tagsView : defaults.tagsView,
        sidebarLogo:
          typeof value.sidebarLogo === 'boolean' ? value.sidebarLogo : defaults.sidebarLogo,
      }
    }
  } catch {
    // 忽略读取失败，使用默认设置。
  }
  return { ...defaults }
}

function saveSettings(state: SettingsState) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schema_version: SETTINGS_SCHEMA_VERSION,
      settings: state,
    }),
  )
}

/** 只接受并规范化不含透明度的 `#RRGGBB` 主题色。 */
export function parseThemeColor(value: string | null | undefined): ParsedThemeColor | undefined {
  if (!value) return undefined
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return undefined
  const hex = match[1].toUpperCase()
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
    css: `#${hex}`,
  }
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
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
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

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function relativeLuminance(red: number, green: number, blue: number): number {
  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

function contrastRatio(foreground: ParsedThemeColor, background: [number, number, number]): number {
  const foregroundLuminance = relativeLuminance(foreground.red, foreground.green, foreground.blue)
  const backgroundLuminance = relativeLuminance(...background)
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  )
}

function findReadableThemeColor(
  hue: number,
  saturation: number,
  lightness: number,
  red: number,
  green: number,
  blue: number,
): string {
  const pageBackground: [number, number, number] = [243, 244, 246]
  const activeTagBackground: [number, number, number] = [
    Math.round(pageBackground[0] * 0.9 + red * 0.1),
    Math.round(pageBackground[1] * 0.9 + green * 0.1),
    Math.round(pageBackground[2] * 0.9 + blue * 0.1),
  ]

  for (
    let candidateLightness = Math.min(lightness, 50);
    candidateLightness >= 0;
    candidateLightness -= 1
  ) {
    const candidate = parseThemeColor(hslToHex(hue, saturation, candidateLightness))!
    if (
      contrastRatio(candidate, pageBackground) >= 4.5 &&
      contrastRatio(candidate, activeTagBackground) >= 4.5
    ) {
      return candidate.css
    }
  }

  return '#111827'
}

export function resolveReadableThemeColor(value: string): string {
  const parsed = parseThemeColor(value) ?? parseThemeColor(defaults.themeColor)!
  const [hue, saturation, lightness] = rgbToHsl(parsed.red, parsed.green, parsed.blue)
  return findReadableThemeColor(hue, saturation, lightness, parsed.red, parsed.green, parsed.blue)
}

function applyThemeColor(color: string) {
  const parsed = parseThemeColor(color) ?? parseThemeColor(defaults.themeColor)!
  const { red: r, green: g, blue: b, css } = parsed
  const [h, s, l] = rgbToHsl(r, g, b)

  document.documentElement.style.setProperty('--el-color-primary', css)
  document.documentElement.style.setProperty('--color-primary', css)
  document.documentElement.style.setProperty(
    '--color-primary-readable',
    resolveReadableThemeColor(css),
  )
  document.documentElement.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`)

  for (let i = 3; i <= 9; i++) {
    const lightL = Math.min(l + (i - 3) * 6.5, 95)
    document.documentElement.style.setProperty(
      `--el-color-primary-light-${i}`,
      hslToHex(h, s, lightL),
    )
  }

  const darkColor = hslToHex(h, Math.min(s + 8, 100), Math.max(l - 8, 8))
  document.documentElement.style.setProperty('--el-color-primary-dark-2', darkColor)
  document.documentElement.style.setProperty('--color-primary-dark', darkColor)

  const lightColor = hslToHex(h, Math.max(s - 4, 0), Math.min(l + 10, 95))
  document.documentElement.style.setProperty('--color-primary-light', lightColor)

  document.documentElement.style.setProperty(
    '--sidebar-bg',
    `linear-gradient(180deg, hsl(${h}, 25%, 20%) 0%, hsl(${h}, 20%, 14%) 100%)`,
  )
  document.documentElement.style.setProperty(
    '--sidebar-item-hover-bg',
    `rgba(${r}, ${g}, ${b}, 0.12)`,
  )
  document.documentElement.style.setProperty(
    '--sidebar-item-active-bg',
    `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.25) 0%, rgba(${r}, ${g}, ${b}, 0.20) 100%)`,
  )
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

    applyServerSettings(settings: ShellServerSettings) {
      let changed = false

      if (settings.sideTheme) {
        const theme = settings.sideTheme === 'theme-dark' ? 'dark' : 'light'
        if (theme !== this.theme) {
          this.theme = theme
          applyTheme(theme)
          changed = true
        }
      }

      if (settings.skinName && SKIN_COLOR_MAP[settings.skinName]) {
        const color = SKIN_COLOR_MAP[settings.skinName]
        if (color !== this.themeColor) {
          this.themeColor = color
          applyThemeColor(color)
          changed = true
        }
      }

      if (changed) saveSettings(this.$state)
    },
  },
})
