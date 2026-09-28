import {
  activate,
  api,
  deferred,
  message,
  page,
  prepare,
  response,
  scope,
} from './messageFlowFixtures'
import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acknowledgeMutationOptions,
  cancelMessageState,
  executeMessageAcknowledgement,
  fetchMessageInboxPage,
  normalizeMessageIds,
  synchronizeMessageState,
} from '@/app/messages/messageSync'
import { messageInboxQueryKey, messageUnreadQueryKey } from '@/app/messages/messageCache/queryKeys'
import { deactivateServerStateScope, queryClient } from '@/shared/query/client'
import type { MessageInboxPage } from '@/api/modules/messages'

beforeEach(prepare)
afterEach(() => {
  deactivateServerStateScope()
  queryClient.clear()
})

describe('消息真实缓存与补拉', () => {
  it('补拉保留请求期间新到消息，保留先前已读及确认状态', async () => {
    const identity = scope()
    const key = messageInboxQueryKey(identity, { limit: 100 })
    queryClient.setQueryData(key, page(message('old')))
    const pending = deferred<ReturnType<typeof response<MessageInboxPage>>>()
    api.listMessages.mockReturnValueOnce(pending.promise)
    const result = fetchMessageInboxPage(
      queryClient,
      identity,
      { limit: 100 },
      new AbortController().signal,
    )
    queryClient.setQueryData(key, page(message('old', { read_at: 'read' }), message('new')))
    pending.resolve(response(page(message('old'))))
    expect((await result).records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'old', read_at: 'read' }),
        expect.objectContaining({ id: 'new' }),
      ]),
    )
    expect(api.listMessages).toHaveBeenCalledWith({ limit: 100 }, expect.any(AbortSignal))
  })

  it('缺少收件箱数据失败，旧会话返回数据被取消', async () => {
    api.listMessages.mockResolvedValueOnce(response())
    await expect(
      fetchMessageInboxPage(queryClient, scope(), {}, new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'invalid_response' })
    const pending = deferred<ReturnType<typeof response<MessageInboxPage>>>()
    api.listMessages.mockReturnValueOnce(pending.promise)
    const result = fetchMessageInboxPage(queryClient, scope(), {}, new AbortController().signal)
    const rejected = expect(result).rejects.toMatchObject({ kind: 'cancelled' })
    activate('new')
    pending.resolve(response(page(message('old'))))
    await rejected
  })

  it.each(['negative', 'missing', 'failure'])(
    '未读计数校验失败不丢失成功收件箱，负计数归零：%s',
    async (unread) => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const identity = scope()
      if (unread === 'failure')
        api.getUnreadMessageCount.mockRejectedValueOnce(new Error('unread unavailable'))
      else
        api.getUnreadMessageCount.mockResolvedValueOnce(
          unread === 'negative' ? response(-2) : response(),
        )
      api.listMessages.mockResolvedValueOnce(response(page(message('1'))))
      expect((await synchronizeMessageState(client, identity, {})).records[0]?.id).toBe('1')
      const count = client.getQueryData(messageUnreadQueryKey(identity))
      expect(count === 0 || count === undefined).toBe(true)
      client.clear()
    },
  )

  it('确认规范化限制、空集合无请求、缺少确认项重新拉取权威页', async () => {
    expect(normalizeMessageIds([' 1 ', '1', ''], '确认')).toEqual(['1'])
    expect(() =>
      normalizeMessageIds(
        Array.from({ length: 101 }, (_, i) => `${i}`),
        '确认',
      ),
    ).toThrow('一次最多确认 100 条消息')
    await executeMessageAcknowledgement(queryClient, scope(), ['', ' '])
    expect(api.acknowledgeMessages).not.toHaveBeenCalled()
    const key = messageInboxQueryKey(scope(), {})
    queryClient.setQueryData(key, page(message('1')))
    api.acknowledgeMessages.mockResolvedValueOnce(response(0))
    await executeMessageAcknowledgement(queryClient, scope(), [' 1 ', '1'])
    expect(api.acknowledgeMessages).toHaveBeenCalledWith(['1'])
    expect(queryClient.getQueryData<MessageInboxPage>(key)?.records[0]?.acked_at).toBeTruthy()
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
  })

  it('旧代次确认不能修改缓存，取消仅覆盖指定身份', async () => {
    const old = scope()
    const options = acknowledgeMutationOptions(queryClient)
    activate('new')
    const key = messageInboxQueryKey(scope(), {})
    queryClient.setQueryData(key, page(message('1')))
    await options.onSuccess(response(1), { ...old, ids: ['1'] })
    expect(queryClient.getQueryData<MessageInboxPage>(key)?.records[0]?.acked_at).toBeNull()
    expect(() => options.mutationFn({ ...old, ids: ['1'] })).toThrow()
    const cancel = vi.spyOn(queryClient, 'cancelQueries')
    await cancelMessageState(queryClient, old)
    expect(cancel).toHaveBeenCalledTimes(2)
    expect(cancel.mock.calls[0]?.[0]?.queryKey).toContain(old.sessionEpoch)
    expect(cancel.mock.calls[1]?.[0]?.queryKey).toEqual(messageUnreadQueryKey(old))
    expect(queryClient.getQueryData(key)).toEqual(page(message('1')))
  })
})
