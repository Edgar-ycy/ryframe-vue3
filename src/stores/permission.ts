import { defineStore } from 'pinia'
import type { RouteProjection } from '@/shared/navigation/routeProjection'

interface PermissionState {
  routes: RouteProjection[]
  menus: RouteProjection[]
  isRoutesLoaded: boolean
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    routes: [],
    menus: [],
    isRoutesLoaded: false,
  }),

  actions: {
    applyRouteProjection(routes: RouteProjection[], menus: RouteProjection[]) {
      this.routes = routes
      this.menus = menus
      this.isRoutesLoaded = true
    },

    resetRoutes() {
      this.routes = []
      this.menus = []
      this.isRoutesLoaded = false
    },
  },
})
