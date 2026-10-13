import { describe, expect, it } from 'vitest'
import { isSessionContext } from '@/api/modules/sessionContext'
import { createInitialLoginForm } from '@/views/login/loginState'
import { sessionContext } from './sessionContextFixtures'

describe('首次改密会话边界', () => {
  it('改密标志必须存在且为布尔值', () => {
    const valid = sessionContext(false)
    expect(isSessionContext(valid)).toBe(true)
    const missing = { ...valid }
    Reflect.deleteProperty(missing, 'password_change_required')
    expect(isSessionContext(missing)).toBe(false)
    expect(isSessionContext({ ...valid, password_change_required: 'true' })).toBe(false)
  })

  it('受限会话不能携带超级管理员或普通业务授权', () => {
    const restricted = {
      ...sessionContext(false),
      password_change_required: true,
      roles: [],
      permissions: [],
      menus: [],
      capabilities: [],
    }
    expect(isSessionContext(restricted)).toBe(true)
    expect(isSessionContext({ ...restricted, is_super_admin: true })).toBe(false)
    expect(isSessionContext({ ...restricted, permissions: ['*:*:*'] })).toBe(false)
    expect(isSessionContext({ ...restricted, roles: ['admin'] })).toBe(false)
  })

  it('登录表单不自动填入管理员和初始密码', () => {
    expect(createInitialLoginForm('system')).toEqual({
      tenant_id: 'system',
      username: '',
      password: '',
      captcha_code: '',
    })
  })
})
