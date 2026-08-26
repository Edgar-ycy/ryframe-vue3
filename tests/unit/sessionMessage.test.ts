import { describe, expect, it } from 'vitest'

import { isSessionMessage } from '@/app/session/sessionMessage'

import { sessionContext } from './sessionContextFixtures'

describe('跨标签会话消息', () => {
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

  it('严格校验四种跨标签消息及精确字段集合', () => {
    const context = sessionContext(false)
    const base = { source: 'tab-a', operationId: 'refresh-1', startedAt: 1 }
    expect(isSessionMessage({ type: 'refresh-start', ...base })).toBe(true)
    expect(isSessionMessage({ type: 'refresh-failed', ...base })).toBe(true)
    expect(isSessionMessage({ type: 'refresh-failed', ...base, status: 503 })).toBe(true)
    expect(isSessionMessage({ type: 'logout', source: 'tab-a', at: 1 })).toBe(true)
    expect(
      isSessionMessage({
        type: 'authenticated',
        ...base,
        accessToken: 'token',
        sessionContext: context,
      }),
    ).toBe(true)

    expect(isSessionMessage(null)).toBe(false)
    expect(isSessionMessage([])).toBe(false)
    expect(isSessionMessage(new Date())).toBe(false)
    expect(isSessionMessage({ type: 'refresh-start', ...base, extra: true })).toBe(false)
    expect(isSessionMessage({ type: 'refresh-start', ...base, source: '' })).toBe(false)
    expect(isSessionMessage({ type: 'refresh-start', ...base, operationId: 'has space' })).toBe(
      false,
    )
    expect(isSessionMessage({ type: 'refresh-start', ...base, operationId: 'x'.repeat(257) })).toBe(
      false,
    )
    expect(isSessionMessage({ type: 'refresh-start', ...base, startedAt: 0 })).toBe(false)
    expect(isSessionMessage({ type: 'refresh-start', ...base, startedAt: 1.5 })).toBe(false)
    expect(isSessionMessage({ type: 'refresh-failed', ...base, status: 99 })).toBe(false)
    expect(isSessionMessage({ type: 'refresh-failed', ...base, status: 600 })).toBe(false)
    expect(isSessionMessage({ type: 'authenticated', ...base, accessToken: '' })).toBe(false)
    expect(isSessionMessage({ type: 'logout', source: 'tab-a', at: -1 })).toBe(false)
    expect(isSessionMessage({ type: 'unknown', source: 'tab-a' })).toBe(false)

    const symbolMessage = { type: 'logout', source: 'tab-a', at: 1 }
    Object.defineProperty(symbolMessage, Symbol('hidden'), { value: true })
    expect(isSessionMessage(symbolMessage)).toBe(false)
    expect(
      isSessionMessage(
        Object.assign(Object.create(null) as object, { type: 'logout', source: 'tab-a', at: 1 }),
      ),
    ).toBe(true)
  })
})
