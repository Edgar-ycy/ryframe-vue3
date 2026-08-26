import { describe, expect, it } from 'vitest'

import {
  decodeMessageSocketFrame,
  parseMessageDelivery,
  parseMessageSocketError,
  parseTenantContextChanged,
} from '@/app/messages/socket/frameCodec'
import {
  isRealtimeServiceUnavailable,
  reconnectDelay,
  reconnectDelayForError,
} from '@/app/messages/socket/retryPolicy'
import { HttpError } from '@/shared/http/client'

import { deliveryFrame } from './messageSocketFixtures'

describe('消息帧编解码', () => {
  it('只接受完整的 v1 投递、上下文和错误帧', () => {
    expect(parseMessageDelivery(deliveryFrame())?.id).toBe('10')
    expect(
      parseTenantContextChanged({
        v: 1,
        type: 'tenant_context_changed',
        authorization_epoch: 12,
        runtime_epoch: '7',
        placement_generation: '3',
        business_data_state: 'active',
      }),
    ).toMatchObject({ authorization_epoch: 12, runtime_epoch: '7' })
    expect(
      parseMessageSocketError({
        v: 1,
        type: 'error',
        code: 'invalid_ticket',
        message: '票据无效',
      }),
    ).toEqual({ code: 'invalid_ticket', message: '票据无效' })
  })

  it('畸形 JSON 与缺字段帧不会进入业务回调', () => {
    expect(decodeMessageSocketFrame('{')).toBeUndefined()
    expect(decodeMessageSocketFrame({ type: 'message' })).toEqual({ type: 'message' })
    expect(parseMessageDelivery(null)).toBeUndefined()
    expect(parseMessageDelivery({ ...deliveryFrame(), v: 2 })).toBeUndefined()
    expect(parseMessageDelivery({ ...deliveryFrame(), type: 'error' })).toBeUndefined()
    expect(parseMessageDelivery({ ...deliveryFrame(), message: [] })).toBeUndefined()
    expect(
      parseMessageDelivery({
        ...deliveryFrame(),
        message: { ...deliveryFrame().message, title: '' },
      }),
    ).toBeUndefined()
    expect(
      parseTenantContextChanged({
        v: 1,
        type: 'tenant_context_changed',
        authorization_epoch: -1,
      }),
    ).toBeUndefined()
    expect(parseTenantContextChanged([])).toBeUndefined()
    expect(parseTenantContextChanged({ v: 2, type: 'tenant_context_changed' })).toBeUndefined()
    expect(
      parseTenantContextChanged({
        v: 1,
        type: 'tenant_context_changed',
        authorization_epoch: 1.5,
        runtime_epoch: '01',
        placement_generation: '-1',
        business_data_state: 'unknown',
      }),
    ).toBeUndefined()
    expect(parseMessageSocketError(null)).toBeUndefined()
    expect(parseMessageSocketError({ v: 2, type: 'error' })).toBeUndefined()
    expect(parseMessageSocketError({ v: 1, type: 'message' })).toBeUndefined()
    expect(parseMessageSocketError({ v: 1, type: 'error', code: 1, message: '' })).toBeUndefined()
  })

  it('规范化可选消息字段并保留合法业务状态', () => {
    expect(
      parseMessageDelivery({
        ...deliveryFrame(),
        message: {
          ...deliveryFrame().message,
          payload: { action: 'open' },
          expires_at: 10,
          acked_at: '2026-08-26T01:00:00Z',
        },
      }),
    ).toMatchObject({
      payload: { action: 'open' },
      expires_at: null,
      acked_at: '2026-08-26T01:00:00Z',
    })

    for (const state of ['provisioning', 'active', 'maintenance', 'failed']) {
      expect(
        parseTenantContextChanged({
          v: 1,
          type: 'tenant_context_changed',
          authorization_epoch: 0,
          runtime_epoch: '0',
          placement_generation: '0',
          business_data_state: state,
        }),
      ).toMatchObject({ business_data_state: state })
    }
  })
})

describe('消息重试策略', () => {
  it('指数退避具有上限并遵守服务端 Retry-After', () => {
    expect(reconnectDelay(0, () => 0.5)).toBe(500)
    expect(reconnectDelay(-1, () => 0)).toBe(400)
    expect(reconnectDelay(20, () => 0.5)).toBe(30_000)
    expect(reconnectDelayForError(0, { retryAfterSeconds: 10 }, () => 0.5)).toBe(10_000)
    expect(reconnectDelayForError(0, { retryAfterSeconds: 120 }, () => 0.5)).toBe(60_000)
    expect(reconnectDelayForError(0, null, () => 0.5)).toBe(500)
    expect(reconnectDelayForError(0, {}, () => 0.5)).toBe(500)
    expect(reconnectDelayForError(0, { retryAfterSeconds: -1 }, () => 0.5)).toBe(500)
    expect(reconnectDelayForError(0, { retryAfterSeconds: 'invalid' }, () => 0.5)).toBe(500)
  })

  it('只把服务端明确声明的 503 识别为实时降级', () => {
    expect(
      isRealtimeServiceUnavailable(
        new HttpError('不可用', {
          status: 503,
          realtimeStatus: 'unavailable',
        }),
      ),
    ).toBe(true)
    expect(
      isRealtimeServiceUnavailable(
        new HttpError('不可用', {
          status: 503,
          errorKey: 'service_unavailable',
          retryAfterSeconds: 1,
        }),
      ),
    ).toBe(true)
    expect(isRealtimeServiceUnavailable(new HttpError('普通故障', { status: 503 }))).toBe(false)
    expect(isRealtimeServiceUnavailable(new Error('普通故障'))).toBe(false)
  })
})
