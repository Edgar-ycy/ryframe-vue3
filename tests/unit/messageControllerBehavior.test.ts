import {
  contextApi,
  messageCache,
  messageSync,
  socketRuntime,
  ticketApi,
} from './messageControllerFixtures'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { messageController } from '@/app/messages/messageController'
import { getRuntime } from '@/app/messages/messageRuntime'
import { deactivateServerStateScope, transitionServerStateScope } from '@/shared/query/client'
import { HttpError } from '@/shared/http/client'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import type { MessageRecord } from '@/api/modules/messages'
import { deliveryFrame } from './messageSocketFixtures'

const message = (id: string, acked_at: string | null = null): MessageRecord => ({
  ...deliveryFrame().message,
  id,
  acked_at,
  severity: 'info',
})

function connect() {
  transitionServerStateScope(
    { tenantId: 't', subjectId: 'u', authorizationFingerprint: 'auth' },
    () => undefined,
    { force: true },
  )
  messageController.bindSession()
  const socket = socketRuntime.instances.at(-1)
  if (!socket) throw new Error('消息连接未建立')
  return socket
}

beforeEach(() => {
  setActivePinia(createPinia())
  messageController.unbindSession()
  deactivateServerStateScope()
  vi.clearAllMocks()
  vi.useFakeTimers()
  socketRuntime.instances.length = 0
  useUserStore().$patch({ sessionStatus: 'authenticated', tenantId: 't', userId: 'u', token: 'a' })
  messageSync.synchronizeMessageState.mockResolvedValue({ records: [], next_cursor: null })
  messageSync.executeMessageAcknowledgement.mockResolvedValue(undefined)
  contextApi.notifyTenantContextChanged.mockResolvedValue(undefined)
})
afterEach(() => {
  messageController.unbindSession()
  deactivateServerStateScope()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('消息传输协调', () => {
  it('重复绑定保持单连接，重启申请新票据并处理协议及租户通知', async () => {
    const socket = connect()
    messageController.bindSession()
    messageController.connectCurrentSession()
    expect(socketRuntime.instances).toHaveLength(1)
    ticketApi.getMessageWebSocketTicket.mockResolvedValueOnce({ data: { ticket: 'short' } })
    await expect(socket.options.requestTicket()).resolves.toBe('short')
    ticketApi.getMessageWebSocketTicket.mockResolvedValueOnce({})
    await expect(socket.options.requestTicket()).rejects.toThrow('缺少 ticket')
    socket.options.onProtocolError?.({ code: 'protocol', message: '无效帧' })
    expect(useMessageStore().socketError).toBe('无效帧')
    const frame = {
      v: 1,
      type: 'tenant_context_changed',
      authorization_epoch: 2,
      runtime_epoch: '2',
      placement_generation: '1',
      business_data_state: 'active',
    } as const
    socket.options.onTenantContextChanged?.(frame)
    expect(contextApi.notifyTenantContextChanged).toHaveBeenCalledWith(frame)
    messageController.restartConnection()
    socket.options.onProtocolError?.({ code: 'stale', message: '旧错误' })
    socket.options.onTenantContextChanged?.(frame)
    socket.options.onStateChange?.('connected')
    expect(useMessageStore().socketError).toBeUndefined()
    expect(contextApi.notifyTenantContextChanged).toHaveBeenCalledOnce()
    expect(socketRuntime.instances).toHaveLength(2)
    expect(socket.stop).toHaveBeenCalledOnce()
  })

  it('连接后补拉、轮询并只确认未删除且未确认的消息', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    const socket = connect()
    messageController.markMessagesDeleted(['deleted'])
    messageSync.synchronizeMessageState.mockResolvedValue({
      records: [message('unacked'), message('acked', 'now'), message('deleted')],
      next_cursor: null,
    })
    socket.options.onStateChange?.('connected')
    await vi.advanceTimersByTimeAsync(500)
    expect(messageSync.executeMessageAcknowledgement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 't' }),
      ['unacked'],
    )
    await vi.advanceTimersByTimeAsync(59_500)
    expect(messageSync.synchronizeMessageState).toHaveBeenCalledTimes(2)
    for (const state of ['idle', 'stopped'] as const) {
      socket.options.onStateChange?.(state)
      expect(useMessageStore().connectionStatus).toBe('disconnected')
    }
    messageController.disconnect()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(messageSync.synchronizeMessageState).toHaveBeenCalledTimes(2)
  })

  it('实时投递合并确认，删除后不再回写，清理只覆盖实际可见的删除记录', async () => {
    const socket = connect()
    messageController.pruneDeletedMessages(['1'])
    socket.options.onDelivery(message('1'))
    socket.options.onDelivery(message('2', 'acked'))
    messageController.queueAcknowledgement(['1'])
    messageController.markMessagesDeleted([])
    messageController.markMessagesDeleted(['1'])
    socket.options.onDelivery(message('1'))
    messageController.pruneDeletedMessages(['other'])
    messageController.pruneDeletedMessages(['1', 'other'])
    expect(messageCache.receiveMessageDelivery).toHaveBeenCalledTimes(2)
    expect(messageCache.removeCachedMessages).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ids: ['1'] }),
    )
    await vi.advanceTimersByTimeAsync(500)
    expect(messageSync.executeMessageAcknowledgement).not.toHaveBeenCalled()
  })

  it('确认批次有界且在途时不重复请求，成功后继续排空后续批次', async () => {
    connect()
    let finish!: () => void
    messageSync.executeMessageAcknowledgement.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const ids = Array.from({ length: 550 }, (_, i) => `${i}`)
    messageController.queueAcknowledgement(ids)
    await vi.advanceTimersByTimeAsync(500)
    messageController.queueAcknowledgement(['extra'])
    expect(messageSync.executeMessageAcknowledgement).toHaveBeenCalledOnce()
    finish()
    await vi.advanceTimersByTimeAsync(10)
    expect(messageSync.executeMessageAcknowledgement).toHaveBeenCalledTimes(6)
    expect(
      messageSync.executeMessageAcknowledgement.mock.calls.every((call) => call[2].length <= 100),
    ).toBe(true)
    expect(getRuntime().pendingAckIds.size + getRuntime().deferredAckIds.size).toBe(0)
  })

  it.each([new Error('offline'), new HttpError('limited', { status: 429 })])(
    '失败退避只记录一次，成功后清零重试状态：%s',
    async (error) => {
      connect()
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      messageSync.executeMessageAcknowledgement
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
      messageController.queueAcknowledgement(['1'])
      await vi.advanceTimersByTimeAsync(500)
      expect(getRuntime().ackRetryAttempt).toBe(1)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(warning).toHaveBeenCalledOnce()
      await vi.advanceTimersByTimeAsync(2_000)
      expect(getRuntime().ackRetryAttempt).toBe(0)
      expect(getRuntime().ackFailureReported).toBe(false)
    },
  )

  it('不可重试失败丢弃当前批次，继续处理其他消息', async () => {
    connect()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    messageSync.executeMessageAcknowledgement.mockRejectedValueOnce(
      new HttpError('denied', { status: 403 }),
    )
    messageController.queueAcknowledgement(Array.from({ length: 110 }, (_, i) => `${i}`))
    await vi.advanceTimersByTimeAsync(501)
    expect(messageSync.executeMessageAcknowledgement).toHaveBeenCalledTimes(2)
    expect(getRuntime().pendingAckIds.size).toBe(0)
  })

  it.each(['success', 'failure'])('会话切换屏蔽在途确认的%s回调', async (outcome) => {
    connect()
    let finish!: () => void
    messageSync.executeMessageAcknowledgement.mockReturnValueOnce(
      new Promise<void>((resolve, reject) => {
        finish = outcome === 'success' ? resolve : () => reject(new Error('old'))
      }),
    )
    messageController.queueAcknowledgement(['old'])
    await vi.advanceTimersByTimeAsync(500)
    connect()
    messageController.queueAcknowledgement(['new'])
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect([...getRuntime().pendingAckIds]).toEqual(['new'])
    expect(getRuntime().ackRetryAttempt).toBe(0)
  })

  it('匿名或身份不匹配时不保留连接和旧操作', async () => {
    connect()
    messageController.queueAcknowledgement(['old'])
    useUserStore().userId = 'other'
    messageController.markMessagesDeleted(['old'])
    messageController.pruneDeletedMessages(['old'])
    await vi.advanceTimersByTimeAsync(500)
    expect(messageSync.executeMessageAcknowledgement).not.toHaveBeenCalled()
    messageController.connectCurrentSession()
    messageController.queueAcknowledgement(['new'])
    expect(useMessageStore().connectionStatus).toBe('disconnected')
    expect(getRuntime().socket).toBeUndefined()
  })
})
