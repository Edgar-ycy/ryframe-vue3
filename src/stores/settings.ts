import { defineStore } from 'pinia'
import { getApplicationLocale, setApplicationLocale } from '@/i18n'
import { applyComponentSize, applyTheme, applyThemeColor } from './settings/domAdapter'
import {
  createDefaultSettings,
  SKIN_COLOR_MAP,
  type ComponentSize,
  type SettingsState,
  type ShellServerSettings,
} from './settings/model'
import { loadSettings, saveSettings } from './settings/persistence'
import { parseThemeColor } from './settings/theme'

export type { ShellServerSettings } from './settings/model'
export { parseThemeColor, resolveReadableThemeColor } from './settings/theme'

const defaults = createDefaultSettings(getApplicationLocale())

/** 被动保存界面设置；持久化和 DOM 副作用由相邻适配器负责。 */
export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => loadSettings(defaults),

  actions: {
    setTheme(theme: SettingsState['theme']) {
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

    setLocale(locale: SettingsState['locale']) {
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
