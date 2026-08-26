import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { isSessionContext } from '@/api/modules/sessionContext'
import { isSessionMessage } from '@/app/session/sessionMessage'
import { applyAuthenticatedSession } from '@/app/session/state'
import {
  applyTenantSessionContext,
  failClosedTenantContext,
} from '@/app/tenant-context/coordinator'
import { useUserStore } from '@/stores/user'

function sessionContext(isSuperAdmin: boolean) {
  return {
    authorization_epoch: '11',
    business_data: {
      placement_generation: '3',
      state: 'active',
    },
    capabilities: [],
    is_super_admin: isSuperAdmin,
    menus: [],
    permissions: ['*:*:*'],
    roles: ['admin'],
    runtime_epoch: '7',
    user: {
      email: '',
      id: '42',
      nickname: '测试用户',
      phone: '',
      tenant_id: 'tenant-a',
      tenant_name: '租户甲',
      username: 'tester',
    },
  }
}

describe('会话授权快照', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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

  it('跨标签已认证消息复用同一严格校验', () => {
    const context = sessionContext(true)
    expect(
      isSessionMessage({
        type: 'authenticated',
        source: 'tab-a',
        operationId: 'refresh-1',
        startedAt: 1,
        accessToken: 'token',
        sessionContext: context,
      }),
    ).toBe(true)
    expect(
      isSessionMessage({
        type: 'authenticated',
        source: 'tab-a',
        operationId: 'refresh-1',
        startedAt: 1,
        accessToken: 'token',
        sessionContext: { ...context, is_super_admin: 1 },
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
})
