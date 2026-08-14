import type { RouteLocationRaw, RouteMeta } from 'vue-router'
import { HttpError } from '@/shared/http/client'
import { hasPermission } from '@/utils/permission'

export interface NavigationTarget {
  path: string
  fullPath?: string
  redirectedFrom?: { fullPath: string }
  meta?: RouteMeta
}

export interface NavigationUser {
  token: string
  sessionStatus: 'initializing' | 'authenticated' | 'anonymous' | 'unavailable'
  permissions: string[]
  roles: string[]
  getUserInfo(): Promise<unknown>
}

export interface NavigationPermissionState {
  isRoutesLoaded: boolean
}

export interface NavigationRuntimeCapabilities {
  multiTenancyEnabled: boolean
  ensureLoaded(): Promise<void>
}

export interface NavigationGuardDependencies {
  initializeSession(): Promise<void>
  getUser(): NavigationUser
  getPermissionState(): NavigationPermissionState
  getRuntimeCapabilities(): NavigationRuntimeCapabilities
  ensureAccessibleRoutes(): Promise<unknown>
  clearSession(): Promise<void>
  isKnownRoute(path: string): boolean
  resolveReplacement(path: string): RouteLocationRaw
}

const authenticatedErrorPaths = new Set(['/403', '/500'])
const publicPaths = new Set(['/login', '/reset-password'])

export function createNavigationGuard(dependencies: NavigationGuardDependencies) {
  return async (target: NavigationTarget): Promise<true | RouteLocationRaw> => {
    const runtimeCapabilities = dependencies.getRuntimeCapabilities()
    await runtimeCapabilities.ensureLoaded()
    await dependencies.initializeSession()
    const user = dependencies.getUser()
    const originalPath = getOriginalFullPath(target)

    if (user.sessionStatus === 'unavailable') {
      return target.path === '/500' ? true : { path: '/500', replace: true }
    }

    if (!user.token) {
      return publicPaths.has(target.path)
        ? true
        : { path: '/login', query: { redirect: originalPath } }
    }

    if (target.path === '/login') return { path: '/index', replace: true }
    if (authenticatedErrorPaths.has(target.path)) return true

    if (!dependencies.getPermissionState().isRoutesLoaded) {
      try {
        if (user.permissions.length === 0) await user.getUserInfo()
        await dependencies.ensureAccessibleRoutes()
        // 重新解析原始完整地址，避免首次解析已经落入 404 的结果被复用。
        return dependencies.resolveReplacement(originalPath)
      }
      catch (error) {
        if (error instanceof HttpError && error.status === 401) {
          await dependencies.clearSession()
          return { path: '/login', query: { redirect: originalPath } }
        }
        if (error instanceof HttpError && error.status === 403) {
          return { path: '/403', replace: true }
        }
        return { path: '/500', replace: true }
      }
    }

    if (
      target.path === '/404'
      && target.redirectedFrom
      && dependencies.isKnownRoute(originalPath)
    ) {
      return dependencies.resolveReplacement(originalPath)
    }

    return canAccessRoute(user, target, runtimeCapabilities.multiTenancyEnabled)
      ? true
      : { path: '/403', replace: true }
  }
}

function getOriginalFullPath(target: NavigationTarget): string {
  return target.redirectedFrom?.fullPath || target.fullPath || target.path || '/'
}

function canAccessRoute(
  user: NavigationUser,
  target: NavigationTarget,
  multiTenancyEnabled: boolean,
): boolean {
  if (target.meta?.requiresMultiTenancy && !multiTenancyEnabled) return false
  if (!target.meta?.requiresPermission) return true
  const required = target.meta.permission
  return typeof required === 'string'
    && hasPermission(user.permissions, required, user.roles)
}
