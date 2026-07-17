import type { RouteRecordRaw } from 'vue-router'

export interface DashboardLink {
  title: string
  path: string
  icon?: string
}

function resolvePath(parentPath: string, childPath: string): string {
  if (childPath.startsWith('/')) return childPath
  return `${parentPath.replace(/\/$/, '')}/${childPath}`.replace(/\/{2,}/g, '/')
}

export function collectDashboardLinks(
  routes: RouteRecordRaw[],
  limit = 8,
): DashboardLink[] {
  const links: DashboardLink[] = []
  const seenPaths = new Set<string>()

  function visit(route: RouteRecordRaw, parentPath = ''): void {
    if (route.meta?.hidden) return
    const fullPath = resolvePath(parentPath, route.path)
    const visibleChildren = (route.children ?? []).filter(child => !child.meta?.hidden)
    if (visibleChildren.length > 0) {
      for (const child of visibleChildren) visit(child, fullPath)
      return
    }

    const title = route.meta?.title
    if (typeof title !== 'string' || !title || fullPath === '/index' || seenPaths.has(fullPath)) {
      return
    }
    seenPaths.add(fullPath)
    links.push({
      title,
      path: fullPath,
      icon: typeof route.meta?.icon === 'string' ? route.meta.icon : undefined,
    })
  }

  for (const route of routes) visit(route)
  return links.slice(0, Math.max(0, limit))
}
