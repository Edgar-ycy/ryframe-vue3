import type { RouteLocationRaw, RouteMeta } from 'vue-router'
import { HttpError } from '@/shared/http/client'
import {
  accessResultPath,
  CAPABILITY_UNAVAILABLE_PATH,
  registeredPageAccessResult,
  routeMetaAccessResult,
  type RouteAccessContext,
} from '@/features/navigation/routeAccess'

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
}

export interface NavigationPermissionState {
  isRoutesLoaded: boolean
}

export interface NavigationRuntimeCapabilities {
  multiTenancyEnabled: boolean
}

export interface NavigationTenantContext {
  capabilityCodes: string[]
}

export interface NavigationGuardDependencies {
  initializeSession(): Promise<void>
  getUser(): NavigationUser
  getPermissionState(): NavigationPermissionState
  getRuntimeCapabilities(): NavigationRuntimeCapabilities
  ensureRuntimeCapabilitiesLoaded(): Promise<void>
  getTenantContext(): NavigationTenantContext
  ensureTenantContextLoaded(): Promise<void>
  ensureAccessibleRoutes(): Promise<unknown>
  clearSession(): Promise<void>
  isKnownRoute(path: string): boolean
  resolveReplacement(path: string): RouteLocationRaw
}

const authenticatedErrorPaths = new Set(['/403', '/503', CAPABILITY_UNAVAILABLE_PATH])
const publicPaths = new Set(['/login', '/reset-password'])

export function createNavigationGuard(dependencies: NavigationGuardDependencies) {
  return async (target: NavigationTarget): Promise<true | RouteLocationRaw> => {
    try {
      await dependencies.ensureRuntimeCapabilitiesLoaded()
    } catch {
      return target.path === '/503' ? true : { path: '/503', replace: true }
    }
    const runtimeCapabilities = dependencies.getRuntimeCapabilities()
    await dependencies.initializeSession()
    const user = dependencies.getUser()
    const originalPath = getOriginalFullPath(target)

    if (user.sessionStatus === 'unavailable') {
      return target.path === '/503' ? true : { path: '/503', replace: true }
    }

    if (!user.token) {
      return publicPaths.has(target.path)
        ? true
        : { path: '/login', query: { redirect: originalPath } }
    }

    if (target.path === '/login') return { path: '/index', replace: true }
    if (authenticatedErrorPaths.has(target.path)) return true

    try {
      await dependencies.ensureTenantContextLoaded()
      if (!dependencies.getPermissionState().isRoutesLoaded) {
        await dependencies.ensureAccessibleRoutes()
        // 重新解析原始完整地址，避免首次解析已经落入 404 的结果被复用。
        return dependencies.resolveReplacement(originalPath)
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        await dependencies.clearSession()
        return { path: '/login', query: { redirect: originalPath } }
      }
      if (error instanceof HttpError && error.status === 403) {
        return { path: '/403', replace: true }
      }
      return { path: '/503', replace: true }
    }

    if (target.path === '/404' && target.redirectedFrom) {
      const result = registeredPageAccessResult(
        originalPath,
        routeAccessContext(
          user,
          runtimeCapabilities.multiTenancyEnabled,
          dependencies.getTenantContext().capabilityCodes,
        ),
      )
      if (result === 'allowed') {
        return dependencies.isKnownRoute(originalPath)
          ? dependencies.resolveReplacement(originalPath)
          : { path: '/503', replace: true }
      }
      if (result === 'unknown') return true
      const replacement = accessResultPath(result)
      return replacement ? { path: replacement, replace: true } : true
    }

    const result = routeMetaAccessResult(
      target.meta,
      routeAccessContext(
        user,
        runtimeCapabilities.multiTenancyEnabled,
        dependencies.getTenantContext().capabilityCodes,
      ),
    )
    const replacement = accessResultPath(result)
    return replacement ? { path: replacement, replace: true } : true
  }
}

function getOriginalFullPath(target: NavigationTarget): string {
  return target.redirectedFrom?.fullPath || target.fullPath || target.path || '/'
}

function routeAccessContext(
  user: NavigationUser,
  multiTenancyEnabled: boolean,
  capabilities: readonly string[],
): RouteAccessContext {
  return {
    capabilities,
    multiTenancyEnabled,
    permissions: user.permissions,
  }
}
