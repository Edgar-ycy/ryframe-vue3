import { defineStore } from 'pinia'
import { getConfigByKey } from '@/api/modules/config'

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
  tagsView: boolean
  sidebarLogo: boolean
}

const STORAGE_KEY = 'ryframe_settings'

const defaults: SettingsState = {
  theme: 'light',
  themeColor: '#6366F1',
  componentSize: 'default',
  tagsView: true,
  sidebarLogo: true,
}

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return { ...defaults }
}

function saveSettings(state: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
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
  const [r, g, b] = hexToRgb(color)
  const [h, s, l] = rgbToHsl(r, g, b)

  document.documentElement.style.setProperty('--el-color-primary', color)
  document.documentElement.style.setProperty('--color-primary', color)
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
      this.themeColor = color
      applyThemeColor(color)
      saveSettings(this.$state)
    },

    setComponentSize(size: ComponentSize) {
      this.componentSize = size
      applyComponentSize(size)
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
      saveSettings(this.$state)
    },

    initSettings() {
      applyTheme(this.theme)
      applyThemeColor(this.themeColor)
      applyComponentSize(this.componentSize)
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
        // ignore
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
        // ignore
      }

      if (changed) {
        saveSettings(this.$state)
      }
    },
  },
})
