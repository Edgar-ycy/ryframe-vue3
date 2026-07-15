import { defineStore } from 'pinia'
import { LAYOUT } from '@/router/layout'
import { constantRoutes } from '@/router/routes/constant'
import { getMenuPage } from '@/router/pageRegistry'
import { hasPermission } from '@/utils/permission'
import type { MenuTreeNode } from '@/api/types'
import type { RouteRecordRaw } from 'vue-router'

function getConstantMenus(): RouteRecordRaw[] {
  const layoutRoute = constantRoutes.find(r => r.path === '/' && r.children)
  if (!layoutRoute) return []
  return (layoutRoute.children || [])
    .filter(c => !c.meta?.hidden)
    .map(c => ({
      ...c,
      path: '/' + String(c.path).replace(/^\/+/, ''),
    }))
}

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
    generateRoutes(menuTree: MenuTreeNode[], permissions: string[], roles: string[]) {
      const routes = buildRoutesFromMenuTree(menuTree)
      this.routes = routes
      this.menus = [
        ...getConstantMenus(),
        ...filterAccessibleRoutes(routes, permissions, roles),
      ]
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

function getNodeTitle(n: MenuTreeNode): string {
  return n.name
}

function getNodeSort(n: MenuTreeNode): number {
  return n.sort
}

function isNodeVisible(n: MenuTreeNode): boolean {
  if (n.visible === undefined || n.visible === null) return true
  if (typeof n.visible === 'boolean') return n.visible
  return n.visible !== 0 && n.visible !== '0'
}

function isNodeEnabled(n: MenuTreeNode): boolean {
  if (n.status === undefined || n.status === null || n.status === '') return true
  return String(n.status) === '1'
}

function getMenuType(n: MenuTreeNode): string {
  if (n.menu_type) return n.menu_type
  return n.children?.length ? 'M' : 'C'
}

function iconPascalCase(icon: string): string {
  if (!icon) return ''
  return icon.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
}

const SKIP_PATHS = new Set(['/', '/index', '/login', '/404', '/401', '/403', '/500', '/redirect', '/profile'])

function buildRoutesFromMenuTree(nodes: MenuTreeNode[], parentPath?: string): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = []

  for (const node of nodes) {
    if (!isNodeEnabled(node)) continue

    const type = getMenuType(node)
    if (type === 'F') continue

    const page = getMenuPage(node.route_key)
    if (page && SKIP_PATHS.has(normalizePath(page.path))) continue

    const route = nodeToRoute(node, parentPath)
    if (route) routes.push(route)
  }

  return routes
}

function nodeToRoute(node: MenuTreeNode, parentPath?: string): RouteRecordRaw | null {
  const type = getMenuType(node)
  if (type === 'M') return buildDirectoryRoute(node)
  if (type === 'C') return buildMenuRoute(node, parentPath)
  return null
}

function buildDirectoryRoute(node: MenuTreeNode): RouteRecordRaw {
  const page = getMenuPage(node.route_key)
  const dirPath = normalizePath(page?.path || `/menu-${node.id}`)
  const children = node.children?.length
    ? buildRoutesFromMenuTree(node.children, dirPath)
    : []
  const visibleChildren = children.filter(c => c.meta?.hidden !== true)
  const firstChildPath = visibleChildren[0]?.path
  const redirect = firstChildPath
    ? (String(firstChildPath).startsWith('/') ? firstChildPath : `${dirPath}/${firstChildPath}`.replace(/\/\//g, '/'))
    : dirPath

  return {
    path: dirPath,
    name: getRouteName(node),
    component: LAYOUT,
    redirect,
    meta: {
      title: getNodeTitle(node),
      icon: iconPascalCase(node.icon || '') || undefined,
      hidden: !isNodeVisible(node),
      alwaysShow: true,
      sort: getNodeSort(node),
      permission: node.perm_code || undefined,
      requiresPermission: Boolean(node.perm_code),
    },
    children,
  }
}

function buildMenuRoute(node: MenuTreeNode, parentPath?: string): RouteRecordRaw | null {
  const page = getMenuPage(node.route_key)
  if (!page?.component) return null

  const nodePath = page.path
  let routePath = nodePath
  if (parentPath && nodePath.startsWith(parentPath)) {
    routePath = nodePath.slice(parentPath.length).replace(/^\//, '') || ''
  }
  if (!routePath) routePath = nodePath

  return {
    path: routePath,
    name: getRouteName(node),
    component: page.component,
    meta: {
      title: getNodeTitle(node),
      icon: iconPascalCase(node.icon || '') || undefined,
      hidden: !isNodeVisible(node),
      sort: getNodeSort(node),
      permission: node.perm_code || undefined,
      requiresPermission: true,
    },
  }
}

function normalizePath(path?: string): string {
  if (!path) return '/'
  let p = path.trim()
  p = p.replace(/^\/+/, '').replace(/\/+$/, '')
  return '/' + p
}

function getRouteName(node: MenuTreeNode): string {
  const page = getMenuPage(node.route_key)
  return normalizePath(page?.path).replace(/\//g, '_') || `menu_${node.id}`
}

function filterAccessibleRoutes(
  routes: readonly RouteRecordRaw[],
  permissions: string[],
  roles: string[],
): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = []

  for (const route of routes) {
    if (route.meta?.hidden) continue

    const required = route.meta?.permission
    if (route.meta?.requiresPermission) {
      if (typeof required !== 'string' || !hasPermission(permissions, required, roles)) {
        continue
      }
    }

    const filteredChildren = route.children
      ? filterAccessibleRoutes(route.children, permissions, roles)
      : []
    if (route.meta?.alwaysShow && route.children?.length && filteredChildren.length === 0) {
      continue
    }

    result.push({
      ...route,
      children: filteredChildren.length ? filteredChildren : undefined,
    } as RouteRecordRaw)
  }

  return result
}
