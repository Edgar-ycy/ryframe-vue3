import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acknowledgementRetryDelay,
  clearAcknowledgements,
  enqueueAcknowledgements,
  promoteDeferredAcknowledgements,
  scheduleAcknowledgement,
  shouldRetryAcknowledgement,
} from '@/app/messages/acknowledgements'
import type { MessageRuntime } from '@/app/messages/messageRuntime'
import { forgetDeletedAcknowledgements, rememberDeletedMessages } from '@/app/messages/tombstones'
import { HttpError } from '@/shared/http/client'

function runtime(): MessageRuntime {
  return {
    generation: 1,
    ackInFlight: false,
    ackRetryAttempt: 0,
    ackFailureReported: false,
    pendingAckIds: new Set(),
    deferredAckIds: new Set(),
    deletedMessageIds: new Set(),
  }
}

describe('消息确认队列与删除记忆', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('确认去重、忽略删除记录、限制两级队列，并按序提升待确认记录', () => {
    const state = runtime()
    state.deletedMessageIds.add('deleted')
    expect(enqueueAcknowledgements(state, ['', 'deleted'])).toBe(false)
    const ids = Array.from({ length: 2_600 }, (_, index) => String(index))
    expect(enqueueAcknowledgements(state, [...ids, '0', '501'])).toBe(true)
    expect(state.pendingAckIds.size).toBe(500)
    expect(state.deferredAckIds.size).toBe(2_000)
    expect(state.deferredAckIds.has('2599')).toBe(false)
    promoteDeferredAcknowledgements(state)
    expect(state.deferredAckIds.size).toBe(2_000)
    state.pendingAckIds.delete('0')
    promoteDeferredAcknowledgements(state)
    expect(state.pendingAckIds.has('500')).toBe(true)
    expect(state.deferredAckIds.has('500')).toBe(false)
    state.pendingAckIds.clear()
    state.deferredAckIds = new Set(['last'])
    promoteDeferredAcknowledgements(state)
    expect([...state.pendingAckIds]).toEqual(['last'])
    expect(state.deferredAckIds.size).toBe(0)
  })

  it('合并确认计时器，清理后不再发送旧确认', () => {
    const state = runtime()
    const callback = vi.fn()
    scheduleAcknowledgement(state, 500, callback)
    scheduleAcknowledgement(state, 1, callback)
    vi.advanceTimersByTime(499)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledOnce()
    expect(state.ackTimer).toBeUndefined()
    scheduleAcknowledgement(state, 500, callback)
    state.pendingAckIds.add('1')
    state.deferredAckIds.add('2')
    state.ackInFlight = true
    state.ackRetryAttempt = 4
    state.ackFailureReported = true
    clearAcknowledgements(state)
    clearAcknowledgements(state)
    vi.runAllTimers()
    expect(callback).toHaveBeenCalledOnce()
    expect(state.pendingAckIds.size + state.deferredAckIds.size).toBe(0)
    expect(state.ackInFlight).toBe(false)
    expect(state.ackRetryAttempt).toBe(0)
    expect(state.ackFailureReported).toBe(false)
  })

  it.each([
    [new Error('network'), true],
    [new HttpError('network'), true],
    [new HttpError('cancelled', { kind: 'cancelled' }), false],
    [new HttpError('unauthorized', { status: 401 }), false],
    [new HttpError('not found', { status: 404 }), false],
    [new HttpError('limited', { status: 429 }), true],
    [new HttpError('server', { status: 503 }), true],
  ])('仅对可重试的确认错误继续重试：%s', (error, expected) => {
    expect(shouldRetryAcknowledgement(error)).toBe(expected)
  })

  it('指数退避及服务端重试时间均有上限', () => {
    expect(acknowledgementRetryDelay(new Error(), 0)).toBe(1_000)
    expect(acknowledgementRetryDelay(new HttpError(''), 1)).toBe(2_000)
    expect(acknowledgementRetryDelay(new Error(), 100)).toBe(30_000)
    expect(acknowledgementRetryDelay(new HttpError('', { retryAfterSeconds: 120 }), 0)).toBe(60_000)
    expect(acknowledgementRetryDelay(new HttpError('', { retryAfterSeconds: 3 }), 0)).toBe(3_000)
  })

  it('删除记忆按容量淘汰最早项，移除所有对应确认且不影响其他消息', () => {
    const state = runtime()
    const ids = Array.from({ length: 2_001 }, (_, index) => String(index + 1))
    expect(rememberDeletedMessages(state, ['', '1', '1'])).toEqual(['1'])
    rememberDeletedMessages(state, ids)
    expect(state.deletedMessageIds.size).toBe(2_000)
    expect(state.deletedMessageIds.has('1')).toBe(false)
    expect(state.deletedMessageIds.has('2001')).toBe(true)
    state.pendingAckIds = new Set(['2', 'keep'])
    state.deferredAckIds = new Set(['2', '3'])
    forgetDeletedAcknowledgements(state, ['2', '3', 'absent'])
    expect([...state.pendingAckIds]).toEqual(['keep'])
    expect(state.deferredAckIds.size).toBe(0)
  })
})
