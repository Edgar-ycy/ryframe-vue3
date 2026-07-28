import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())

vi.mock('@/shared/http/client', () => ({
  default: request,
}))

import {
  acknowledgeMessages,
  getMessageWebSocketTicket,
  getUnreadMessageCount,
  listMessages,
  markAllMessagesRead,
  markMessageRead,
} from './messageApi'

describe('消息中心 API 适配器', () => {
  beforeEach(() => {
    request.mockReset()
    request.mockResolvedValue({ code: 200, msg: 'ok' })
  })

  it('使用当前 API 版本下的收件箱和确认路径', async () => {
    await listMessages({ cursor: '42', limit: 20, unread_only: true })
    await acknowledgeMessages(['42', '43'])
    await markMessageRead('42/43')
    await markAllMessagesRead()
    await getUnreadMessageCount()

    expect(request).toHaveBeenNthCalledWith(1, {
      url: '/system/messages',
      method: 'get',
      params: { cursor: '42', limit: 20, unread_only: true },
    })
    expect(request).toHaveBeenNthCalledWith(2, {
      url: '/system/messages/ack',
      method: 'post',
      data: { ids: ['42', '43'] },
    })
    expect(request).toHaveBeenNthCalledWith(3, {
      url: '/system/messages/42%2F43/read',
      method: 'put',
    })
    expect(request).toHaveBeenNthCalledWith(4, {
      url: '/system/messages/read-all',
      method: 'put',
    })
    expect(request).toHaveBeenNthCalledWith(5, {
      url: '/system/messages/unread-count',
      method: 'get',
    })
  })

  it('为每次连接申请新的短期票据', async () => {
    await getMessageWebSocketTicket()

    expect(request).toHaveBeenCalledWith({
      url: '/auth/ws-ticket',
      method: 'post',
    })
  })
})
