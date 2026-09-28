import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MessageInboxPage, MessageRecord } from '@/api/modules/messages'
import {
  acknowledgeCachedMessages,
  cacheMessageDelivery,
  findCachedMessage,
  markAllCachedMessagesRead,
  markCachedMessageRead,
  mergeMessagePage,
  receiveMessageDelivery,
  removeCachedMessages,
  setUnreadCount,
} from '@/app/messages/messageCache/mutations'
import {
  inboxParamsFromKey,
  invalidateMessageInbox,
  isInboxKeyForSubject,
  messageInboxKeyParams,
  messageInboxQueryKey,
  messageUnreadQueryKey,
} from '@/app/messages/messageCache/queryKeys'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'

function message(id: string, overrides: Partial<MessageRecord> = {}): MessageRecord {
  return {
    id,
    topic: 'system',
    title: id,
    content: '内容',
    severity: 'info',
    payload: null,
    published_at: '2026-09-03T00:00:00Z',
    expires_at: null,
    acked_at: null,
    read_at: null,
    ...overrides,
  }
}
const page = (...records: MessageRecord[]): MessageInboxPage => ({ records, next_cursor: null })
const clock = '2026-09-03T01:00:00Z'

function scope() {
  const current = getServerStateScope()
  if (!current) throw new Error('测试会话未初始化')
  return current
}

beforeEach(() => {
  transitionServerStateScope(
    { tenantId: 't', subjectId: 'u', authorizationFingerprint: 'test' },
    () => undefined,
  )
})
afterEach(() => {
  deactivateServerStateScope()
  queryClient.clear()
})

describe('消息缓存合并与动作', () => {
  it('合并新页保留已经确认和已读的值，只保留明确指定的额外消息', () => {
    const previous = page(message('old'), message('same', { acked_at: clock, read_at: clock }))
    const incoming = page(message('same'), message('new', { published_at: clock }))
    const merged = mergeMessagePage(previous, incoming, 3, new Set(['old', 'missing', 'same']))
    expect(merged.records.map((item) => item.id)).toEqual(['new', 'same', 'old'])
    expect(merged.records[1]).toMatchObject({ read_at: clock, acked_at: clock })
    expect(merged.next_cursor).toBe('old')
    expect(
      mergeMessagePage(undefined, page(message('b'), message('a')), 10).records.map(
        (item) => item.id,
      ),
    ).toEqual(['b', 'a'])
    expect(
      mergeMessagePage(
        undefined,
        page(message('bad', { published_at: 'invalid' }), message('valid')),
        1,
      ).records[0]?.id,
    ).toBe('valid')
  })

  it('投递只进入首屏或已有记录的页，已读状态同步移出未读页并更新角标', () => {
    const client = new QueryClient()
    const identity = scope()
    const all = messageInboxQueryKey(identity, { limit: 10 })
    const unread = messageInboxQueryKey(identity, { limit: 10, unread_only: true })
    const older = messageInboxQueryKey(identity, { limit: 10, cursor: '50' })
    client.setQueryData(all, page(message('first')))
    client.setQueryData(unread, page(message('first')))
    client.setQueryData(older, page(message('older')))
    client.setQueryData(messageUnreadQueryKey(identity), 1)
    cacheMessageDelivery(client, identity, message('new'))
    expect(client.getQueryData<MessageInboxPage>(all)?.records).toHaveLength(2)
    expect(client.getQueryData<MessageInboxPage>(unread)?.records).toHaveLength(2)
    expect(client.getQueryData(older)).toEqual(page(message('older')))
    expect(client.getQueryData(messageUnreadQueryKey(identity))).toBe(2)
    cacheMessageDelivery(client, identity, message('first', { read_at: clock }))
    expect(client.getQueryData<MessageInboxPage>(unread)?.records.map((item) => item.id)).toEqual([
      'new',
    ])
    expect(client.getQueryData(messageUnreadQueryKey(identity))).toBe(1)
    cacheMessageDelivery(client, identity, message('first'))
    expect(findCachedMessage(client, identity, 'first')?.read_at).toBe(clock)
    expect(findCachedMessage(client, identity, 'absent')).toBeUndefined()
  })

  it('没有角标快照时重新拉取权威值，已有快照始终不减到负数', () => {
    const client = new QueryClient()
    const identity = scope()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    cacheMessageDelivery(client, identity, message('first'))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: messageUnreadQueryKey(identity) })
    expect(setUnreadCount(client, identity, () => 2)).toBe(false)
    client.setQueryData(messageUnreadQueryKey(identity), 1)
    expect(setUnreadCount(client, identity, (value) => value - 5)).toBe(true)
    expect(client.getQueryData(messageUnreadQueryKey(identity))).toBe(0)
  })

  it('确认幂等、单条和全部已读遵循页面筛选，删除只扣除真正未读记录', () => {
    const client = new QueryClient()
    const identity = scope()
    const all = messageInboxQueryKey(identity, {})
    const unread = messageInboxQueryKey(identity, { unread_only: true })
    const records = page(message('a'), message('b', { acked_at: 'earlier' }), message('c'))
    client.setQueryData(all, records)
    client.setQueryData(unread, records)
    client.setQueryData(messageUnreadQueryKey(identity), 3)
    acknowledgeCachedMessages(client, { ...identity, ids: ['a', 'b'] }, clock)
    expect(findCachedMessage(client, identity, 'a')?.acked_at).toBe(clock)
    expect(findCachedMessage(client, identity, 'b')?.acked_at).toBe('earlier')
    markCachedMessageRead(client, { ...identity, id: 'a' }, clock)
    expect(client.getQueryData<MessageInboxPage>(unread)?.records.map((item) => item.id)).toEqual([
      'b',
      'c',
    ])
    expect(removeCachedMessages(client, { ...identity, ids: ['a', 'b', 'absent'] })).toBe(1)
    expect(client.getQueryData(messageUnreadQueryKey(identity))).toBe(2)
    markAllCachedMessagesRead(client, identity, clock)
    expect(client.getQueryData(unread)).toEqual(page())
    expect(client.getQueryData<MessageInboxPage>(all)?.records[0]).toMatchObject({
      id: 'c',
      read_at: clock,
      acked_at: clock,
    })
    expect(removeCachedMessages(client, { ...identity, ids: ['c'] })).toBe(0)
  })

  it('全局实时投递使用当前 scope，失效只标记同主体收件箱', async () => {
    const identity = scope()
    const key = messageInboxQueryKey(identity, {})
    queryClient.setQueryData(key, page())
    queryClient.setQueryData(messageUnreadQueryKey(identity), 0)
    receiveMessageDelivery(identity, message('live'))
    expect(findCachedMessage(queryClient, identity, 'live')?.id).toBe('live')
    await invalidateMessageInbox(queryClient, identity)
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
  })

  it('缓存键规范化保留 false 与空游标，拒绝错误的参数结构', () => {
    expect(messageInboxKeyParams('u', {})).toEqual({
      user_id: 'u',
      cursor: null,
      limit: 100,
      unread_only: false,
    })
    const key = messageInboxQueryKey(scope(), { cursor: '', limit: 5, unread_only: false })
    expect(inboxParamsFromKey(key)).toEqual({
      user_id: 'u',
      cursor: '',
      limit: 5,
      unread_only: false,
    })
    expect(isInboxKeyForSubject(key, 'u')).toBe(true)
    expect(isInboxKeyForSubject(key, 'v')).toBe(false)
    for (const params of [
      null,
      [],
      1,
      {},
      { user_id: 'u' },
      { user_id: 'u', cursor: 5 },
      { user_id: 'u', cursor: null, limit: '5' },
      { user_id: 'u', cursor: null, limit: 5, unread_only: 1 },
    ]) {
      expect(inboxParamsFromKey(['fixture', null, null, null, null, params])).toBeUndefined()
    }
    expect(isInboxKeyForSubject([], 'u')).toBe(false)
  })
})
