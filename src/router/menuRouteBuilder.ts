import type { RouteRecordRaw } from 'vue-router'
import type { MenuTreeNode, MenuType } from '@/api/modules/menu'
import { LAYOUT } from '@/router/layout'
import { constantRoutes } from '@/router/routes/constant'
import { getMenuPage } from '@/router/pageRegistry'
import { withRouteComponentName } from '@/router/namedRouteComponent'
import { hasPermission } from '@/utils/permission'

const SKIP_PATHS = new Set([
  '/',
  '/index',
  '/login',
  '/404',
  '/401',
  '/403',
  '/500',
  '/redirect',
  '/profile',
])

export function buildRoutesFromMenuTree(
  nodes: readonly MenuTreeNode[],
  parentPath?: string,
): RouteRecordRaw[] {
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

export function buildAccessibleMenus(
  routes: readonly RouteRecordRaw[],
  permissions: readonly string[],
  roles: readonly string[],
): RouteRecordRaw[] {
  return [
    ...getConstantMenus(),
    ...filterAccessibleRoutes(routes, permissions, roles),
  ]
}

function getConstantMenus(): RouteRecordRaw[] {
  const layoutRoute = constantRoutes.find(route => route.path === '/' && route.children)
  if (!layoutRoute) return []
  return (layoutRoute.children || [])
    .filter(child => !child.meta?.hidden)
    .map(child => ({
      ...child,
      path: `/${String(child.path).replace(/^\/+/, '')}`,
    }))
}

function isNodeVisible(node: MenuTreeNode): boolean {
  return node.visible
}

function isNodeEnabled(node: MenuTreeNode): boolean {
  return node.status === '1'
}

function getMenuType(node: MenuTreeNode): MenuType {
  return node.menu_type
}

function iconPascalCase(icon: string): string {
  return icon
    .split(/[-_]/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
}

function nodeToRoute(node: MenuTreeNode, parentPath?: string): RouteRecordRaw | null {
  const type = getMenuType(node)
  if (type === 'M') return buildDirectoryRoute(node)
  if (type === 'C') return buildMenuRoute(node, parentPath)
  return null
}

function buildDirectoryRoute(node: MenuTreeNode): RouteRecordRaw {
  const page = getMenuPage(node.route_key)
  const directoryPath = normalizePath(page?.path || `/menu-${node.id}`)
  const children = node.children?.length
    ? buildRoutesFromMenuTree(node.children, directoryPath)
    : []
  const firstChildPath = children.find(child => child.meta?.hidden !== true)?.path
  const redirect = firstChildPath
    ? resolveChildPath(directoryPath, String(firstChildPath))
    : directoryPath

  return {
    path: directoryPath,
    name: getRouteName(node),
    component: LAYOUT,
    redirect,
    meta: {
      title: node.name,
      icon: iconPascalCase(node.icon || '') || undefined,
      hidden: !isNodeVisible(node),
      alwaysShow: true,
      sort: node.sort,
      permission: node.perm_code || undefined,
      requiresPermission: Boolean(node.perm_code),
    },
    children,
  }
}

function buildMenuRoute(node: MenuTreeNode, parentPath?: string): RouteRecordRaw | null {
  const page = getMenuPage(node.route_key)
  if (!page?.component) return null
  const routeName = getRouteName(node)

  let routePath = page.path
  if (parentPath && routePath.startsWith(parentPath)) {
    routePath = routePath.slice(parentPath.length).replace(/^\//, '') || routePath
  }

  return {
    path: routePath,
    name: routeName,
    component: withRouteComponentName(routeName, page.component),
    meta: {
      title: node.name,
      icon: iconPascalCase(node.icon || '') || undefined,
      hidden: !isNodeVisible(node),
      sort: node.sort,
      permission: node.perm_code || undefined,
      requiresPermission: true,
    },
  }
}

function normalizePath(path?: string): string {
  if (!path) return '/'
  return `/${path.trim().replace(/^\/+/, '').replace(/\/+$/, '')}`
}

function resolveChildPath(parentPath: string, childPath: string): string {
  if (childPath.startsWith('/')) return childPath
  return `${parentPath}/${childPath}`.replace(/\/+/g, '/')
}

function getRouteName(node: MenuTreeNode): string {
  const page = getMenuPage(node.route_key)
  if (!page) return `menu_${node.id}`
  return normalizePath(page.path).replace(/\//g, '_')
}

function filterAccessibleRoutes(
  routes: readonly RouteRecordRaw[],
  permissions: readonly string[],
  roles: readonly string[],
): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = []

  for (const route of routes) {
    if (route.meta?.hidden) continue

    const required = route.meta?.permission
    if (
      route.meta?.requiresPermission
      && (typeof required !== 'string' || !hasPermission(permissions, required, roles))
    ) {
      continue
    }

    const children = route.children
      ? filterAccessibleRoutes(route.children, permissions, roles)
      : []
    if (route.meta?.alwaysShow && route.children?.length && children.length === 0) continue

    result.push({
      ...route,
      children: children.length ? children : undefined,
    } as RouteRecordRaw)
  }

  return result
}
