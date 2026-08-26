import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isSessionContext } from '@/api/modules/sessionContext'
import { installRouteRuntime } from '@/app/navigation/runtime'
import {
  applyAuthenticatedSession,
  assertSessionEpoch,
  ensureRoutesAfterAuthentication,
  getSessionEpoch,
  invalidateSessionEpoch,
  isSessionTerminating,
  setSessionTerminating,
} from '@/app/session/state'
import { applyUserIdentity } from '@/app/session/userProjection'
import {
  applyTenantSessionContext,
  failClosedTenantContext,
} from '@/app/tenant-context/coordinator'
import { useUserStore } from '@/stores/user'

import { sessionContext } from './sessionContextFixtures'

describe('会话授权快照', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
    })
    setSessionTerminating(false)
  })

  it('必须显式携带布尔型超级管理员标记', () => {
    const valid = sessionContext(false)
    expect(isSessionContext(valid)).toBe(true)
    expect(isSessionContext({ ...valid, is_super_admin: 'false' })).toBe(false)

    const missing = { ...valid }
    Reflect.deleteProperty(missing, 'is_super_admin')
    expect(isSessionContext(missing)).toBe(false)
    expect(isSessionContext({ ...valid, unexpected: true })).toBe(false)
    expect(
      isSessionContext({
        ...valid,
        capabilities: [
          {
            client_config: {},
            code: 'feature-a',
            schema_version: 0,
            variant: 'default',
          },
        ],
      }),
    ).toBe(false)
    expect(
      isSessionContext({
        ...valid,
        menus: [
          {
            children: [],
            id: '1',
            menu_type: 'C',
            name: '用户',
            perm_code: 'not-in-catalog',
            sort: 1,
            status: '1',
            visible: true,
          },
        ],
      }),
    ).toBe(false)
  })

  it('角色名不会推导超级身份，失败关闭会原子清空授权投影', () => {
    const context = sessionContext(false)
    if (!isSessionContext(context)) throw new Error('测试会话快照无效')

    const user = useUserStore()
    applyTenantSessionContext(context)

    expect(user.roles).toEqual(['admin'])
    expect(user.permissions).toEqual(['*:*:*'])
    expect(user.isSuperAdmin).toBe(false)

    failClosedTenantContext()
    expect(user.roles).toEqual([])
    expect(user.permissions).toEqual([])
    expect(user.isSuperAdmin).toBe(false)
  })

  it('超级管理员标记变化会计入授权范围指纹', () => {
    const regular = sessionContext(false)
    const superAdmin = sessionContext(true)
    if (!isSessionContext(regular) || !isSessionContext(superAdmin)) {
      throw new Error('测试会话快照无效')
    }

    expect(applyAuthenticatedSession('token-a', regular)).toBe(false)
    expect(applyAuthenticatedSession('token-b', superAdmin)).toBe(true)
    expect(useUserStore().isSuperAdmin).toBe(true)
  })

  it('认证投影失败时原子回退用户与租户状态', () => {
    const context = sessionContext(false)
    const duplicateCapabilities = {
      ...context,
      capabilities: [
        { client_config: {}, code: 'feature-a', schema_version: 1, variant: 'on' },
        { client_config: {}, code: 'feature-a', schema_version: 1, variant: 'on' },
      ],
    }
    if (!isSessionContext(duplicateCapabilities)) throw new Error('测试会话快照无效')

    expect(() => applyAuthenticatedSession('token', duplicateCapabilities)).toThrow(
      '会话上下文包含重复能力码',
    )
    expect(useUserStore().sessionStatus).toBe('anonymous')
    expect(useUserStore().token).toBe('')
  })

  it('身份、租户、角色、权限、纪元、能力和菜单变化均会刷新路由范围', () => {
    const base = sessionContext(false)
    if (!isSessionContext(base)) throw new Error('测试会话快照无效')
    expect(applyAuthenticatedSession('token', base)).toBe(false)

    const cases = [
      { ...base, user: { ...base.user, id: '43' } },
      { ...base, user: { ...base.user, tenant_id: 'tenant-b' } },
      { ...base, roles: ['operator'] },
      { ...base, permissions: ['system:user:list'] },
      { ...base, authorization_epoch: '12' },
      { ...base, runtime_epoch: '8' },
      {
        ...base,
        capabilities: [{ client_config: {}, code: 'feature-a', schema_version: 1, variant: 'on' }],
      },
      {
        ...base,
        menus: [
          {
            children: [],
            id: '1',
            menu_type: 'C',
            name: '用户',
            perm_code: 'system:user:list',
            route_key: 'system.user',
            sort: 1,
            status: '1',
            visible: true,
          },
        ],
      },
    ]
    for (const context of cases) {
      if (!isSessionContext(context)) throw new Error('变化后的测试会话快照无效')
      expect(applyAuthenticatedSession('token', context)).toBe(true)
      expect(applyAuthenticatedSession('token', base)).toBe(true)
    }
  })

  it('会话纪元拒绝过期和终止中的异步结果', () => {
    const current = getSessionEpoch()
    expect(isSessionTerminating()).toBe(false)
    expect(() => assertSessionEpoch(current)).not.toThrow()
    invalidateSessionEpoch()
    expect(() => assertSessionEpoch(current)).toThrow('会话操作已取消')
    setSessionTerminating(true)
    expect(isSessionTerminating()).toBe(true)
    expect(() => assertSessionEpoch(getSessionEpoch())).toThrow('会话操作已取消')
  })

  it('认证后按参数调用注入的路由运行时', async () => {
    const ensureAccessibleRoutes = vi.fn(async () => undefined)
    installRouteRuntime({
      router: {} as never,
      ensureAccessibleRoutes,
      refreshAccessibleRoutes: vi.fn(async () => undefined),
      resolveAccessibleRoute: (candidate) => candidate,
      resetDynamicRoutes: vi.fn(),
    })

    await ensureRoutesAfterAuthentication()
    await ensureRoutesAfterAuthentication(true)
    expect(ensureAccessibleRoutes).toHaveBeenNthCalledWith(1, { skipAuthRefresh: false })
    expect(ensureAccessibleRoutes).toHaveBeenNthCalledWith(2, { skipAuthRefresh: true })
  })

  it('用户投影仅在合法偏好语言存在时同步设置', () => {
    const baseUser = {
      avatar: '',
      email: '',
      id: '42',
      nickname: '测试用户',
      perms: [],
      phone: '',
      roles: [],
      tenant_id: 'tenant-a',
      tenant_name: '租户甲',
      username: 'tester',
    }

    applyUserIdentity({ ...baseUser, preferred_locale: 'en-US' } as never, false)
    expect(useUserStore().preferredLocale).toBe('en-US')
    applyUserIdentity({ ...baseUser, preferred_locale: 'invalid' } as never, true)
    expect(useUserStore().preferredLocale).toBeUndefined()
    expect(useUserStore().isSuperAdmin).toBe(true)
  })
})
