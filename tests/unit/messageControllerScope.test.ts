import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MessageRecord } from '@/api/modules/messages'
import type { MessageSocketOptions } from '@/app/messages/socket/lifecycle'

interface FakeMessageSocket {
  options: MessageSocketOptions
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

const socketRuntime = vi.hoisted(() => ({ instances: [] as FakeMessageSocket[] }))
const messageCache = vi.hoisted(() => ({
  receiveMessageDelivery: vi.fn(),
  removeCachedMessages: vi.fn(),
}))
const messageSync = vi.hoisted(() => ({
  cancelMessageState: vi.fn(),
  executeMessageAcknowledgement: vi.fn(),
  synchronizeMessageState: vi.fn(),
}))

vi.mock('@/api/modules/messages', () => ({ getMessageWebSocketTicket: vi.fn() }))
vi.mock('@/app/messages/messageCache/mutations', () => messageCache)
vi.mock('@/app/messages/messageSync', () => messageSync)
vi.mock('@/app/messages/socket/lifecycle', () => ({
  MessageSocket: class implements FakeMessageSocket {
    readonly start = vi.fn()
    readonly stop = vi.fn()

    constructor(readonly options: MessageSocketOptions) {
      socketRuntime.instances.push(this)
    }
  },
}))

import { messageController } from '@/app/messages/messageController'
import {
  deactivateServerStateScope,
  getServerStateScope,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { deliveryFrame } from './messageSocketFixtures'

function transition(fingerprint: string): boolean {
  return transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: '42',
      authorizationFingerprint: fingerprint,
    },
    () => undefined,
  )
}

describe('消息连接会话范围', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    messageController.unbindSession()
    deactivateServerStateScope()
    vi.clearAllMocks()
    socketRuntime.instances.length = 0
    useUserStore().$patch({
      sessionStatus: 'authenticated',
      tenantId: 'tenant-a',
      token: 'access-token-a',
      userId: '42',
    })
  })

  afterEach(() => {
    messageController.unbindSession()
    deactivateServerStateScope()
  })

  it('令牌轮换复用连接，同主体授权代次变化重连并忽略旧帧', () => {
    expect(transition('authorization-1')).toBe(true)
    const firstScope = getServerStateScope()
    const firstEpoch = firstScope?.sessionEpoch
    messageController.bindSession()

    expect(socketRuntime.instances).toHaveLength(1)
    const firstSocket = socketRuntime.instances[0]!
    expect(firstSocket.start).toHaveBeenCalledOnce()

    useUserStore().token = 'access-token-rotated'
    expect(transition('authorization-1')).toBe(false)
    expect(socketRuntime.instances).toHaveLength(1)
    expect(firstSocket.stop).not.toHaveBeenCalled()

    expect(transition('authorization-2')).toBe(true)
    const currentScope = getServerStateScope()
    expect(currentScope?.sessionEpoch).toBeGreaterThan(firstEpoch ?? 0)
    expect(firstSocket.stop).toHaveBeenCalledOnce()
    expect(socketRuntime.instances).toHaveLength(2)
    expect(messageSync.cancelMessageState).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: firstScope?.tenantId,
        subjectId: firstScope?.subjectId,
        sessionEpoch: firstEpoch,
      }),
    )
    expect(messageSync.cancelMessageState).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sessionEpoch: currentScope?.sessionEpoch }),
    )

    const currentSocket = socketRuntime.instances[1]!
    const message: MessageRecord = {
      ...deliveryFrame().message,
      acked_at: '2026-08-26T00:00:01Z',
      severity: 'info',
    }
    firstSocket.options.onDelivery(message)
    expect(messageCache.receiveMessageDelivery).not.toHaveBeenCalled()

    currentSocket.options.onDelivery(message)
    expect(messageCache.receiveMessageDelivery).toHaveBeenCalledOnce()
    expect(messageCache.receiveMessageDelivery).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-a',
        subjectId: '42',
        sessionEpoch: currentScope?.sessionEpoch,
      },
      message,
    )
  })
})
