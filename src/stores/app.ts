import { defineStore } from 'pinia'

const MOBILE_BREAKPOINT = 1024
const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
const responsiveCleanups = new WeakMap<object, () => void>()

interface AppState {
  sidebarCollapsed: boolean
  isMobile: boolean
  responsiveInitialized: boolean
}

export const useAppStore = defineStore('app', {
  state: (): AppState => {
    const isMobile = isMobileViewport()

    return {
      sidebarCollapsed: isMobile,
      isMobile,
      responsiveInitialized: false,
    }
  },

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    closeSidebar() {
      this.sidebarCollapsed = true
    },
    initResponsive() {
      if (this.responsiveInitialized || typeof window === 'undefined') return

      this.responsiveInitialized = true
      const syncViewport = () => {
        const nextIsMobile = isMobileViewport()
        if (nextIsMobile !== this.isMobile) {
          this.isMobile = nextIsMobile
          this.sidebarCollapsed = nextIsMobile
        }
      }

      syncViewport()
      window.addEventListener('resize', syncViewport, { passive: true })
      responsiveCleanups.set(this, () => {
        window.removeEventListener('resize', syncViewport)
      })
    },
    destroyResponsive() {
      responsiveCleanups.get(this)?.()
      responsiveCleanups.delete(this)
      this.responsiveInitialized = false
    },
  },
})
