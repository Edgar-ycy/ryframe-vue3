import { defineStore } from 'pinia'

type ComponentSize = 'large' | 'default' | 'small'

interface SettingsState {
  theme: 'light' | 'dark'
  componentSize: ComponentSize
  tagsView: boolean
  sidebarLogo: boolean
}

const STORAGE_KEY = 'ryframe_settings'

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {
    theme: 'light',
    componentSize: 'default',
    tagsView: true,
    sidebarLogo: true,
  }
}

function saveSettings(state: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => loadSettings(),

  actions: {
    setTheme(theme: 'light' | 'dark') {
      this.theme = theme
      document.documentElement.classList.toggle('dark', theme === 'dark')
      document.documentElement.setAttribute('data-theme', theme)
      saveSettings(this.$state)
    },

    setComponentSize(size: ComponentSize) {
      this.componentSize = size
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
      this.theme = 'light'
      this.componentSize = 'default'
      this.tagsView = true
      this.sidebarLogo = true
      saveSettings(this.$state)
    },
  },
})
