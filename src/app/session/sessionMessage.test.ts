import { describe, expect, it } from 'vitest'
import { isSessionMessage } from './sessionMessage'

const userInfo = {
  id: '1001',
  tenant_id: 'system',
  tenant_name: 'System tenant',
  username: 'operator',
  nickname: 'Test user',
  avatar: null,
  email: 'operator@example.com',
  phone: '',
  roles: ['operator'],
  perms: ['system:user:list'],
}
const operationId = 'tab-a:1:operation-a'

describe('session message validation', () => {
  it.each([
    { type: 'refresh-start', source: 'tab-a', operationId, startedAt: 1 },
    {
      type: 'authenticated',
      source: 'tab-a',
      operationId,
      startedAt: 1,
      accessToken: 'access-token',
      userInfo,
    },
    {
      type: 'authenticated',
      source: 'tab-a',
      operationId,
      startedAt: 1,
      accessToken: 'access-token',
      userInfo: {
        ...userInfo,
        tenant_name: '',
        nickname: '',
        email: '',
        phone: '',
      },
    },
    { type: 'refresh-failed', source: 'tab-a', operationId, startedAt: 1 },
    { type: 'refresh-failed', source: 'tab-a', operationId, startedAt: 1, status: 503 },
    { type: 'logout', source: 'tab-a', at: 1 },
  ])('accepts a valid $type message', (message) => {
    expect(isSessionMessage(message)).toBe(true)
  })

  it.each([
    null,
    [],
    'logout',
    { type: 'unknown', source: 'tab-a' },
    { type: 'logout', source: '', at: 1 },
    { type: 'logout', source: 'tab-a' },
    { type: 'logout', source: 'tab-a', at: Number.NaN },
    { type: 'logout', source: 'tab-a', at: 1, accessToken: 'smuggled-token' },
    { type: 'refresh-start', source: 'tab-a', startedAt: 1 },
    { type: 'refresh-start', source: 'tab-a', operationId: '', startedAt: 1 },
    { type: 'refresh-start', source: 'tab-a', operationId: 'invalid operation', startedAt: 1 },
    { type: 'refresh-start', source: 'tab-a', operationId, startedAt: '1' },
    { type: 'refresh-start', source: 'tab-a', operationId, startedAt: 1.5 },
    { type: 'refresh-failed', source: 'tab-a', operationId, startedAt: 1, status: '503' },
    { type: 'refresh-failed', source: 'tab-a', operationId, startedAt: 1, status: 600 },
    {
      type: 'authenticated',
      source: 'tab-a',
      operationId,
      startedAt: 1,
      accessToken: '',
      userInfo,
    },
    {
      type: 'authenticated',
      source: 'tab-a',
      operationId,
      startedAt: 1,
      accessToken: 'forged-token',
      userInfo: { ...userInfo, roles: ['operator', 1] },
    },
    {
      type: 'authenticated',
      source: 'tab-a',
      operationId,
      startedAt: 1,
      accessToken: 'forged-token',
      userInfo: { ...userInfo, elevated: true },
    },
  ])('rejects a malformed or schema-smuggling message', (message) => {
    expect(isSessionMessage(message)).toBe(false)
  })
})
