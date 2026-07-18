import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/client'
import {
  createNavigationGuard,
  type NavigationGuardDependencies,
  type NavigationPermissionState,
  type NavigationUser,
} from './navigationGuard'

function harness(options?: {
  token?: string
  permissions?: string[]
  roles?: string[]
  routesLoaded?: boolean
  sessionStatus?: NavigationUser['sessionStatus']
  knownRoute?: boolean
}) {
  const user: NavigationUser = {
    token: options?.token ?? '',
    sessionStatus: options?.sessionStatus ?? (options?.token ? 'authenticated' : 'anonymous'),
    permissions: options?.permissions ?? [],
    roles: options?.roles ?? [],
    getUserInfo: vi.fn(async () => undefined),
  }
  const permissionState: NavigationPermissionState = {
    isRoutesLoaded: options?.routesLoaded ?? false,
  }
  const dependencies: NavigationGuardDependencies = {
    initializeSession: vi.fn(async () => undefined),
    getUser: () => user,
    getPermissionState: () => permissionState,
    refreshAccessibleRoutes: vi.fn(async () => undefined),
    clearSession: vi.fn(async () => undefined),
    isKnownRoute: vi.fn(() => options?.knownRoute ?? false),
  }
  return { user, dependencies, guard: createNavigationGuard(dependencies) }
}

describe('createNavigationGuard', () => {
  it('allows public paths and redirects anonymous users to login', async () => {
    const { guard } = harness()
    await expect(guard({ path: '/login', fullPath: '/login' })).resolves.toBe(true)
    await expect(guard({ path: '/users', fullPath: '/users?page=2' })).resolves.toEqual({
      path: '/login',
      query: { redirect: '/users?page=2' },
    })
  })

  it('waits for silent session initialization before deciding navigation', async () => {
    const state = harness()
    state.user.sessionStatus = 'initializing'
    state.dependencies.initializeSession = vi.fn(async () => {
      state.user.token = 'restored-token'
      state.user.sessionStatus = 'authenticated'
      state.user.permissions = ['system:user:list']
    })
    state.guard = createNavigationGuard(state.dependencies)

    await expect(state.guard({ path: '/users', fullPath: '/users' })).resolves.toEqual({
      path: '/users',
      replace: true,
    })
    expect(state.dependencies.initializeSession).toHaveBeenCalledOnce()
  })

  it('routes dependency outages to the service unavailable page', async () => {
    const { guard } = harness({ sessionStatus: 'unavailable' })
    await expect(guard({ path: '/users' })).resolves.toEqual({ path: '/500', replace: true })
    await expect(guard({ path: '/500' })).resolves.toBe(true)
  })

  it('loads user context and routes once before replaying the original target', async () => {
    const { user, dependencies, guard } = harness({ token: 'token' })
    await expect(guard({
      path: '/users',
      fullPath: '/users',
      redirectedFrom: { fullPath: '/users?tab=active' },
    })).resolves.toEqual({ path: '/users?tab=active', replace: true })
    expect(user.getUserInfo).toHaveBeenCalledOnce()
    expect(dependencies.refreshAccessibleRoutes).toHaveBeenCalledOnce()
  })

  it('replays a valid deep link when silent refresh already installed its dynamic route', async () => {
    const { dependencies, guard } = harness({
      token: 'token',
      routesLoaded: true,
      knownRoute: true,
    })

    await expect(guard({
      path: '/404',
      fullPath: '/404',
      redirectedFrom: { fullPath: '/tools/gen' },
    })).resolves.toEqual({ path: '/tools/gen', replace: true })
    expect(dependencies.isKnownRoute).toHaveBeenCalledWith('/tools/gen')
  })

  it('keeps a genuinely unknown deep link on 404', async () => {
    const { guard } = harness({ token: 'token', routesLoaded: true, knownRoute: false })

    await expect(guard({
      path: '/404',
      redirectedFrom: { fullPath: '/missing' },
    })).resolves.toBe(true)
  })

  it('does not reload user context when permissions are already present', async () => {
    const { user, guard } = harness({ token: 'token', permissions: ['system:user:list'] })
    await guard({ path: '/users', fullPath: '/users' })
    expect(user.getUserInfo).not.toHaveBeenCalled()
  })

  it('handles initialization failures according to HTTP status', async () => {
    const unauthorized = harness({ token: 'token' })
    unauthorized.dependencies.refreshAccessibleRoutes = vi.fn(async () => {
      throw new HttpError('expired', 401)
    })
    unauthorized.guard = createNavigationGuard(unauthorized.dependencies)
    await expect(unauthorized.guard({ path: '/users', fullPath: '/users' })).resolves.toEqual({
      path: '/login',
      query: { redirect: '/users' },
    })
    expect(unauthorized.dependencies.clearSession).toHaveBeenCalledOnce()

    const forbidden = harness({ token: 'token' })
    forbidden.dependencies.refreshAccessibleRoutes = vi.fn(async () => {
      throw new HttpError('forbidden', 403)
    })
    forbidden.guard = createNavigationGuard(forbidden.dependencies)
    await expect(forbidden.guard({ path: '/users' })).resolves.toEqual({
      path: '/403',
      replace: true,
    })

    const failed = harness({ token: 'token' })
    failed.dependencies.refreshAccessibleRoutes = vi.fn(async () => {
      throw new Error('network')
    })
    failed.guard = createNavigationGuard(failed.dependencies)
    await expect(failed.guard({ path: '/users' })).resolves.toEqual({
      path: '/500',
      replace: true,
    })
  })

  it('enforces route permissions after runtime routes are loaded', async () => {
    const allowed = harness({
      token: 'token',
      permissions: ['system:user:list'],
      routesLoaded: true,
    })
    await expect(allowed.guard({
      path: '/users',
      meta: { requiresPermission: true, permission: 'system:user:list' },
    })).resolves.toBe(true)
    await expect(allowed.guard({
      path: '/roles',
      meta: { requiresPermission: true, permission: 'system:role:list' },
    })).resolves.toEqual({ path: '/403', replace: true })
  })

  it('redirects authenticated users away from login and allows error pages', async () => {
    const { guard } = harness({ token: 'token' })
    await expect(guard({ path: '/login' })).resolves.toEqual({ path: '/' })
    await expect(guard({ path: '/403' })).resolves.toBe(true)
    await expect(guard({ path: '/500' })).resolves.toBe(true)
  })
})
