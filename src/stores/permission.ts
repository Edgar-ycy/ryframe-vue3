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
      serviceAccountsEnabled = true,
    ) {
      const routes = buildRoutesFromMenuTree(menuTree)
      this.routes = routes
      this.menus = buildAccessibleMenus(routes, permissions, roles, serviceAccountsEnabled)
      this.isRoutesLoaded = true
      return routes
    },

    resetRoutes() {
      this.routes = []
      this.menus = []
      this.isRoutesLoaded = false
    },
  },
})
