import {
  activate,
  api,
  deferred,
  message,
  page,
  prepare,
  response,
  runComposable,
  scope,
} from './messageFlowFixtures'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useMessageCenterQueries } from '@/app/messages/messageHooks'
import { messageInboxQueryKey, messageUnreadQueryKey } from '@/app/messages/messageCache/queryKeys'
import { deactivateServerStateScope, queryClient } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

const stops: (() => void)[] = []
async function createCenter() {
  const harness = runComposable(() => useMessageCenterQueries({ limit: 100, unread_only: false }))
  stops.push(harness.stop)
  await harness.result.refresh(scope())
  await nextTick()
  return harness.result
}
const inboxKey = () => messageInboxQueryKey(scope(), { limit: 100, unread_only: false })

beforeEach(prepare)
afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  deactivateServerStateScope()
  queryClient.clear()
})

describe('消息中心查询与变更', () => {
  it('已读操作维护角标，已经读过的消息不会再次发送请求', async () => {
    api.listMessages.mockResolvedValue(response(page(message('1'))))
    api.getUnreadMessageCount.mockResolvedValue(response(1))
    const center = await createCenter()
    api.markMessageRead.mockImplementation(async () => {
      api.listMessages.mockResolvedValue(response(page(message('1', { read_at: 'now' }))))
      api.getUnreadMessageCount.mockResolvedValue(response(0))
      return response()
    })
    await center.markRead('1', scope())
    expect(center.inboxData.value?.records[0]?.read_at).toBeTruthy()
    expect(queryClient.getQueryData(messageUnreadQueryKey(scope()))).toBe(0)
    await center.markRead('1', scope())
    expect(api.markMessageRead).toHaveBeenCalledOnce()
  })

  it('缓存缺少消息或角标时，已读动作重新读取权威未读数', async () => {
    const center = await createCenter()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await center.markRead('missing', scope())
    expect(api.markMessageRead).toHaveBeenCalledWith('missing')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: messageUnreadQueryKey(scope()) })
    queryClient.setQueryData(inboxKey(), page(message('1')))
    queryClient.removeQueries({ queryKey: messageUnreadQueryKey(scope()), exact: true })
    await center.markRead('1', scope())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: messageUnreadQueryKey(scope()) })
  })

  it('全部已读在零未读时跳过，否则更新缓存并刷新权威状态', async () => {
    const center = await createCenter()
    await center.markAllRead(scope())
    expect(api.markAllMessagesRead).not.toHaveBeenCalled()
    api.listMessages.mockResolvedValue(response(page(message('1', { read_at: 'now' }))))
    api.getUnreadMessageCount.mockResolvedValue(response(0))
    queryClient.setQueryData(inboxKey(), page(message('1')))
    queryClient.setQueryData(messageUnreadQueryKey(scope()), 1)
    await nextTick()
    await center.markAllRead(scope())
    expect(api.markAllMessagesRead).toHaveBeenCalledOnce()
    expect(center.unreadData.value).toBe(0)
    expect(center.inboxData.value?.records[0]?.read_at).toBeTruthy()
  })

  it('确认使用规范化集合，删除返回实际数量，空集合保持无请求', async () => {
    const center = await createCenter()
    await center.acknowledge(['', ' '], scope())
    expect(api.acknowledgeMessages).not.toHaveBeenCalled()
    await center.acknowledge(['1', ' 1 '], scope())
    expect(api.acknowledgeMessages).toHaveBeenCalledWith(['1'])
    expect(await center.remove([], scope())).toBe(0)
    expect(api.deleteMessages).not.toHaveBeenCalled()
    queryClient.setQueryData(inboxKey(), page(message('1')))
    queryClient.setQueryData(messageUnreadQueryKey(scope()), 1)
    expect(await center.remove(['1', '1'], scope())).toBe(1)
    expect(api.deleteMessages).toHaveBeenCalledWith(['1'])
    expect(center.inboxData.value?.records).toEqual([])
    api.deleteMessages.mockResolvedValueOnce(response())
    const invalidation = vi.spyOn(queryClient, 'invalidateQueries')
    expect(await center.remove(['missing'], scope())).toBe(0)
    expect(invalidation).toHaveBeenCalledWith({ queryKey: messageUnreadQueryKey(scope()) })
  })

  it('请求期间变更状态可观察，完成后复位', async () => {
    const center = await createCenter()
    const pending = deferred<ReturnType<typeof response<number>>>()
    api.deleteMessages.mockReturnValueOnce(pending.promise)
    const operation = center.remove(['1'], scope())
    await vi.waitFor(() => expect(center.mutating.value).toBe(true))
    pending.resolve(response(1))
    await operation
    await nextTick()
    expect(center.mutating.value).toBe(false)
  })

  it('刷新传播缺少未读数据的错误，后续刷新仍可恢复', async () => {
    const center = await createCenter()
    api.getUnreadMessageCount.mockResolvedValue(response())
    await expect(center.refresh(scope())).rejects.toMatchObject({ kind: 'invalid_response' })
    api.getUnreadMessageCount.mockResolvedValue(response(-1))
    await center.refresh(scope())
    expect(center.unreadData.value).toBe(0)
  })

  it.each(['anonymous', 'different-subject', 'missing-tenant', 'missing-subject'])(
    '消息身份不完整或与当前范围不符时拒绝变更：%s',
    async (state) => {
      const center = await createCenter()
      if (state === 'anonymous') useUserStore().sessionStatus = 'anonymous'
      else if (state === 'different-subject') useUserStore().userId = 'other'
      else if (state === 'missing-tenant') useUserStore().tenantId = ''
      else useUserStore().userId = ''
      await expect(center.acknowledge(['1'], scope())).rejects.toMatchObject({ status: 401 })
      expect(api.acknowledgeMessages).not.toHaveBeenCalled()
    },
  )

  it('切换身份后慢写入结果不能覆盖新消息缓存', async () => {
    const center = await createCenter()
    const oldScope = scope()
    const pending = deferred<ReturnType<typeof response<number>>>()
    api.deleteMessages.mockReturnValueOnce(pending.promise)
    const operation = center.remove(['1'], oldScope)
    const cancelled = expect(operation).rejects.toMatchObject({ kind: 'cancelled' })
    await vi.waitFor(() => expect(api.deleteMessages).toHaveBeenCalledOnce())
    activate('new')
    await nextTick()
    await center.refresh(scope())
    queryClient.setQueryData(inboxKey(), page(message('new')))
    pending.resolve(response(1))
    await cancelled
    expect(center.inboxData.value?.records[0]?.id).toBe('new')
  })
})
