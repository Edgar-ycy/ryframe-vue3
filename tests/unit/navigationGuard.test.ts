import { describe, expect, it, vi } from 'vitest'

import {
  createNavigationGuard,
  type NavigationGuardDependencies,
} from '@/router/navigationGuard'

function dependencies(options?: {
  capabilities?: string[]
  permissions?: string[]
}): NavigationGuardDependencies {
  return {
    clearSession: vi.fn(async () => undefined),
    ensureAccessibleRoutes: vi.fn(async () => undefined),
    ensureTenantContextLoaded: vi.fn(async () => undefined),
    getPermissionState: () => ({ isRoutesLoaded: true }),
    getRuntimeCapabilities: () => ({
      ensureLoaded: async () => undefined,
      multiTenancyEnabled: true,
    }),
    getTenantContext: () => ({
      capabilityCodes: options?.capabilities ?? [],
    }),
    getUser: () => ({
      permissions: options?.permissions ?? [],
      sessionStatus: 'authenticated',
      token: 'token',
    }),
    initializeSession: async () => undefined,
    isKnownRoute: () => false,
    resolveReplacement: path => ({ path }),
  }
}

describe('导航守卫错误语义', () => {
  it('直达已知但缺权限的页面进入 403', async () => {
    const guard = createNavigationGuard(dependencies())
    await expect(guard({
      path: '/404',
      redirectedFrom: { fullPath: '/system/user' },
    })).resolves.toEqual({ path: '/403', replace: true })
  })

  it('直达已授权但未开通能力的页面进入功能不可用页', async () => {
    const guard = createNavigationGuard(dependencies({
      permissions: ['system:service-account:list'],
    }))
    await expect(guard({
      path: '/404',
      redirectedFrom: { fullPath: '/system/service-accounts' },
    })).resolves.toEqual({ path: '/feature-unavailable', replace: true })
  })

  it('未知路由保持 404', async () => {
    const guard = createNavigationGuard(dependencies())
    await expect(guard({
      path: '/404',
      redirectedFrom: { fullPath: '/not-a-real-page' },
    })).resolves.toBe(true)
  })
})
