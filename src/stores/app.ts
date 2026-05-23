import { defineStore } from 'pinia'

interface AppState {
  sidebarCollapsed: boolean
  theme: string
  language: string
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebarCollapsed: false,
    theme: 'light',
    language: 'zh-cn',
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    setTheme(theme: string) {
      this.theme = theme
      document.documentElement.setAttribute('data-theme', theme)
    },
  },
})
