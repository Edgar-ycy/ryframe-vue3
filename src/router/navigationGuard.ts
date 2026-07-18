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

export interface NavigationGuardDependencies {
  initializeSession(): Promise<void>
  getUser(): NavigationUser
  getPermissionState(): NavigationPermissionState
  refreshAccessibleRoutes(): Promise<unknown>
  clearSession(): Promise<void>
  isKnownRoute(path: string): boolean
}

const authenticatedErrorPaths = new Set(['/403', '/500'])
const publicPaths = new Set(['/login', '/reset-password'])

export function createNavigationGuard(dependencies: NavigationGuardDependencies) {
  return async (target: NavigationTarget): Promise<true | RouteLocationRaw> => {
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

    if (
      target.path === '/404'
      && target.redirectedFrom
      && dependencies.isKnownRoute(originalPath)
    ) {
      return { path: originalPath, replace: true }
    }

    if (target.path === '/login') return { path: '/' }
    if (authenticatedErrorPaths.has(target.path)) return true

    if (!dependencies.getPermissionState().isRoutesLoaded) {
      try {
        if (user.permissions.length === 0) await user.getUserInfo()
        await dependencies.refreshAccessibleRoutes()
        return { path: originalPath, replace: true }
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

    return canAccessRoute(user, target)
      ? true
      : { path: '/403', replace: true }
  }
}

function getOriginalFullPath(target: NavigationTarget): string {
  return target.redirectedFrom?.fullPath || target.fullPath || target.path || '/'
}

function canAccessRoute(user: NavigationUser, target: NavigationTarget): boolean {
  if (!target.meta?.requiresPermission) return true
  const required = target.meta.permission
  return typeof required === 'string'
    && hasPermission(user.permissions, required, user.roles)
}
