import { defineStore } from 'pinia'

type ComponentSize = 'large' | 'default' | 'small'

interface SettingsState {
  theme: 'light' | 'dark'
  themeColor: string
  componentSize: ComponentSize
  tagsView: boolean
  sidebarLogo: boolean
}

const STORAGE_KEY = 'ryframe_settings'

/** 默认配置 */
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
  } catch { /* ignore */ }
  return { ...defaults }
}

function saveSettings(state: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * 根据主色生成 Element Plus 完整调色板（light/dark 各 9 级）
 * 使用 HSL 模型计算，确保亮/暗变体视觉协调
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf)
  let h = 0, s = 0
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
  const sf = s / 100, lf = l / 100
  const c = (1 - Math.abs(2 * lf - 1)) * sf
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = lf - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function applyThemeColor(color: string) {
  const [r, g, b] = hexToRgb(color)
  const [h, s, l] = rgbToHsl(r, g, b)
  document.documentElement.style.setProperty('--el-color-primary', color)
  // 生成 light-3 ~ light-9
  for (let i = 3; i <= 9; i++) {
    const lightL = Math.min(l + (9 - i) * 6.5, 95)
    document.documentElement.style.setProperty(`--el-color-primary-light-${i}`, hslToHex(h, s, lightL))
  }
  // 生成 dark-2（主色的深色变体）
  document.documentElement.style.setProperty('--el-color-primary-dark-2', hslToHex(h, Math.min(s + 8, 100), Math.max(l - 8, 8)))
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

function applyComponentSize(size: ComponentSize) {
  // 设置 Element Plus 全局尺寸
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

    /** 初始化时调用，将持久化设置应用到 DOM */
    initSettings() {
      applyTheme(this.theme)
      applyThemeColor(this.themeColor)
      applyComponentSize(this.componentSize)
    },
  },
})
