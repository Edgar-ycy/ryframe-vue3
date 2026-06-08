import { defineStore } from 'pinia'
import { getConfigByKey } from '@/api/modules/config'

type ComponentSize = 'large' | 'default' | 'small'

/** 旧版皮肤名称 → 主题色 Hex 映射 */
const SKIN_COLOR_MAP: Record<string, string> = {
  'skin-blue':   '#3B82F6',
  'skin-green':  '#22C55E',
  'skin-purple': '#8B5CF6',
  'skin-red':    '#F43F5E',
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
  // Element Plus 主色
  document.documentElement.style.setProperty('--el-color-primary', color)
  // 自定义主色变量（用于 Navbar、TagsView 等）
  document.documentElement.style.setProperty('--color-primary', color)
  // RGB 分量（用于需要动态 rgba 的内联样式等）
  document.documentElement.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`)
  // 生成 light-3 ~ light-9
  for (let i = 3; i <= 9; i++) {
    const lightL = Math.min(l + (9 - i) * 6.5, 95)
    document.documentElement.style.setProperty(`--el-color-primary-light-${i}`, hslToHex(h, s, lightL))
  }
  // 生成 dark-2（主色的深色变体）
  const darkColor = hslToHex(h, Math.min(s + 8, 100), Math.max(l - 8, 8))
  document.documentElement.style.setProperty('--el-color-primary-dark-2', darkColor)
  document.documentElement.style.setProperty('--color-primary-dark', darkColor)
  // 生成 light 变体
  const lightColor = hslToHex(h, Math.max(s - 4, 0), Math.min(l + 10, 95))
  document.documentElement.style.setProperty('--color-primary-light', lightColor)

  // === 侧边栏 / 标签页 / 表格 专用背景变量（含透明度，避免 SCSS 编译期 rgba() 问题）===
  // 侧边栏背景渐变（三段色阶 + 微色相偏移，亮度 10%~18%，色相差异清晰可见）
  document.documentElement.style.setProperty('--sidebar-bg', `linear-gradient(180deg, hsl(${h}, 30%, 18%) 0%, hsl(${h + 3}, 26%, 14%) 60%, hsl(${h + 6}, 22%, 10%) 100%)`)
  // 侧边栏菜单项 hover 背景
  document.documentElement.style.setProperty('--sidebar-item-hover-bg', `rgba(${r}, ${g}, ${b}, 0.12)`)
  // 侧边栏菜单项激活背景
  document.documentElement.style.setProperty('--sidebar-item-active-bg', `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.25) 0%, rgba(${r}, ${g}, ${b}, 0.20) 100%)`)
  // 标签页激活背景（浅色）
  document.documentElement.style.setProperty('--tag-active-bg', `rgba(${r}, ${g}, ${b}, 0.1)`)
  // 标签页激活背景（暗色）
  document.documentElement.style.setProperty('--tag-active-bg-dark', `rgba(${r}, ${g}, ${b}, 0.2)`)
  // 表格行 hover 背景（暗色）
  document.documentElement.style.setProperty('--table-row-hover-bg', `rgba(${r}, ${g}, ${b}, 0.05)`)
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

    /**
     * 从后端配置表同步皮肤/主题设置到前端
     * - sys.index.sideTheme → theme (light/dark)
     * - sys.index.skinName  → themeColor (hex)
     */
    async syncFromServer() {
      let changed = false
      // 同步侧边栏主题
      try {
        const res = await getConfigByKey('sys.index.sideTheme')
        const sideTheme = (res as any)?.data as string | undefined
        if (sideTheme) {
          const theme = sideTheme === 'theme-dark' ? 'dark' : 'light'
          if (theme !== this.theme) {
            this.theme = theme
            applyTheme(theme)
            changed = true
          }
        }
      } catch { /* 服务器不可用或无此配置时静默跳过 */ }

      // 同步皮肤样式
      try {
        const res = await getConfigByKey('sys.index.skinName')
        const skinName = (res as any)?.data as string | undefined
        if (skinName && SKIN_COLOR_MAP[skinName]) {
          const color = SKIN_COLOR_MAP[skinName]
          if (color !== this.themeColor) {
            this.themeColor = color
            applyThemeColor(color)
            changed = true
          }
        }
      } catch { /* 服务器不可用或无此配置时静默跳过 */ }

      if (changed) {
        saveSettings(this.$state)
      }
    },
  },
})
