import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import type { MenuTreeNode } from '@/api/modules/menu'
import { buildAccessibleMenus, buildRoutesFromMenuTree } from '@/router/menuRouteBuilder'

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
    generateRoutes(
      menuTree: MenuTreeNode[],
      permissions: string[],
      roles: string[],
      capabilities: string[],
    ) {
      const routes = buildRoutesFromMenuTree(menuTree, capabilities)
      const menus = buildAccessibleMenus(routes, permissions, roles, capabilities)
      this.applyGeneratedRoutes(routes, menus)
      return routes
    },

    applyGeneratedRoutes(routes: RouteRecordRaw[], menus: RouteRecordRaw[]) {
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
