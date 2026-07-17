import { describe, expect, it } from 'vitest'
import { createInitialLoginForm, resolveLoginRedirect } from './loginState'

describe('createInitialLoginForm', () => {
  it('uses the documented bootstrap account only during development', () => {
    expect(createInitialLoginForm('system', true)).toEqual({
      tenant_id: 'system',
      username: 'admin',
      password: '123456',
      captcha_code: '',
    })
  })

  it('does not expose bootstrap credentials in production builds', () => {
    expect(createInitialLoginForm('tenant-a', false)).toEqual({
      tenant_id: 'tenant-a',
      username: '',
      password: '',
      captcha_code: '',
    })
  })
})

describe('resolveLoginRedirect', () => {
  it('keeps an internal application path', () => {
    expect(resolveLoginRedirect('/system/users?status=1')).toBe('/system/users?status=1')
  })

  it.each([
    undefined,
    null,
    ['/system/users'],
    'https://example.com',
    '//example.com',
    '/login',
  ])('falls back to the home page for unsafe value %j', (value) => {
    expect(resolveLoginRedirect(value)).toBe('/')
  })
})
