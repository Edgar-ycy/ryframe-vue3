import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MessageInboxPage, MessageRecord } from '@/api/modules/messages'
import {
  invalidateMessageInbox,
  MESSAGE_INBOX_RESOURCE,
  type MessageIdentity,
  messageInboxQueryKey,
  messageResourcePrefix,
  messageUnreadQueryKey,
} from '@/app/messages/messageCache/queryKeys'
import {
  acknowledgeCachedMessages,
  cacheMessageDelivery,
  markAllCachedMessagesRead,
  markCachedMessageRead,
  removeCachedMessages,
  setUnreadCount,
} from '@/app/messages/messageCache/mutations'
import { cancelMessageState } from '@/app/messages/messageSync'
import {
  deactivateServerStateScope,
  getServerStateScope,
  transitionServerStateScope,
} from '@/shared/query/client'

const INBOX_QUERY = { limit: 100, unread_only: false } as const

function activate(fingerprint: string): MessageIdentity {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: '42',
      authorizationFingerprint: fingerprint,
    },
    () => undefined,
  )
  const scope = getServerStateScope()
  if (!scope) throw new Error('测试会话范围未建立')
  return {
    tenantId: scope.tenantId,
    subjectId: scope.subjectId,
    sessionEpoch: scope.sessionEpoch,
  }
}

function message(id: string): MessageRecord {
  return {
    id,
    topic: 'system',
    title: `消息 ${id}`,
    content: '内容',
    severity: 'info',
    payload: null,
    published_at: '2026-08-29T00:00:00Z',
    expires_at: null,
    acked_at: null,
    read_at: null,
  }
}

function page(record: MessageRecord): MessageInboxPage {
  return { records: [record], next_cursor: null }
}

describe('消息缓存会话范围', () => {
  beforeEach(() => deactivateServerStateScope())
  afterEach(() => deactivateServerStateScope())

  it('同主体 epoch 切换后旧操作零写入、零失效且只取消旧 key', async () => {
    const client = new QueryClient()
    const oldScope = activate('authorization-1')
    const currentScope = activate('authorization-2')
    const currentMessage = message('current')
    const currentInboxKey = messageInboxQueryKey(currentScope, INBOX_QUERY)
    const currentUnreadKey = messageUnreadQueryKey(currentScope)
    client.setQueryData(currentInboxKey, page(currentMessage))
    client.setQueryData(currentUnreadKey, 1)

    const write = vi.spyOn(client, 'setQueryData')
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const staleVariables = { ...oldScope, ids: ['current'] }

    cacheMessageDelivery(client, oldScope, message('late'))
    acknowledgeCachedMessages(client, staleVariables, '2026-08-29T00:00:01Z')
    markCachedMessageRead(client, { ...oldScope, id: 'current' }, '2026-08-29T00:00:01Z')
    markAllCachedMessagesRead(client, oldScope, '2026-08-29T00:00:01Z')
    expect(removeCachedMessages(client, staleVariables)).toBe(0)
    expect(setUnreadCount(client, oldScope, (count) => count + 1)).toBe(false)
    await invalidateMessageInbox(client, oldScope)

    expect(write).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    expect(client.getQueryData(currentInboxKey)).toEqual(page(currentMessage))
    expect(client.getQueryData(currentUnreadKey)).toBe(1)

    const cancel = vi.spyOn(client, 'cancelQueries')
    await cancelMessageState(client, oldScope)
    expect(cancel).toHaveBeenNthCalledWith(1, {
      queryKey: messageResourcePrefix(oldScope, MESSAGE_INBOX_RESOURCE),
      predicate: expect.any(Function),
    })
    expect(cancel).toHaveBeenNthCalledWith(2, {
      queryKey: messageUnreadQueryKey(oldScope),
    })
    expect(cancel).not.toHaveBeenCalledWith({ queryKey: currentUnreadKey })
    expect(messageUnreadQueryKey(oldScope)).not.toEqual(currentUnreadKey)
  })
})
