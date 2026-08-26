import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'

interface PermissionState {
  routes: RouteRecordRaw[]
  menus: RouteRecordRaw[]
  isRoutesLoaded: boolean
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    routes: [],
    menus: [],
    isRoutesLoaded: false,
  }),

  actions: {
    applyRouteProjection(routes: RouteRecordRaw[], menus: RouteRecordRaw[]) {
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
