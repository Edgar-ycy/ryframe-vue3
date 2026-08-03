import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient } from '@tanstack/vue-query'
import type { MessageInboxPage, MessageRecord } from '@/api/modules/messages'

const api = vi.hoisted(() => ({
  acknowledgeMessages: vi.fn(),
  getUnreadMessageCount: vi.fn(),
  listMessages: vi.fn(),
  markAllMessagesRead: vi.fn(),
  markMessageRead: vi.fn(),
}))
const queryHarness = vi.hoisted(() => ({
  calls: [] as unknown[][],
  inbox: {
    data: { value: undefined as MessageInboxPage | undefined },
    isFetching: { value: false },
    refetch: vi.fn(),
  },
  unread: {
    data: { value: undefined as number | undefined },
    isFetching: { value: false },
    refetch: vi.fn(),
  },
}))
const mutationHarness = vi.hoisted(() => ({
  pendingStates: [] as Array<{ value: boolean }>,
}))

vi.mock('@/api/modules/messages', () => api)
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    queryHarness.calls.push(args)
    return args[2] === 'message-inbox' ? queryHarness.inbox : queryHarness.unread
  },
}))
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/vue-query')>()
  return {
    ...actual,
    useMutation: (options: {
      mutationFn: (variables: unknown) => Promise<unknown>
      onSuccess?: (data: unknown, variables: unknown) => void | Promise<void>
    }) => {
      const isPending = { value: false }
      mutationHarness.pendingStates.push(isPending)
      return {
        isPending,
        mutateAsync: async (variables: unknown) => {
          const data = await options.mutationFn(variables)
          await options.onSuccess?.(data, variables)
          return data
        },
      }
    },
  }
})

import {
  cacheMessageDelivery,
  cancelMessageState,
  executeMessageAcknowledgement,
  messageInboxQueryKey,
  messageUnreadQueryKey,
  receiveMessageDelivery,
  synchronizeMessageState,
  useMessageCenterQueries,
} from './messageQueries'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

const firstMessage: MessageRecord = {
  id: '1',
  topic: 'system.notice',
  title: '第一条消息',
  content: '内容一',
  severity: 'info',
  published_at: '2026-07-26T12:00:00Z',
  acked_at: null,
  read_at: null,
}
const secondMessage: MessageRecord = {
  ...firstMessage,
  id: '2',
  title: '第二条消息',
  published_at: '2026-07-26T13:00:00Z',
}

function page(records: MessageRecord[]): MessageInboxPage {
  return { records, next_cursor: records.at(-1)?.id ?? null }
}

function authenticate(): void {
  const user = useUserStore()
  user.token = 'access-token'
  user.sessionStatus = 'authenticated'
  user.tenantId = 'tenant-a'
  user.userId = '7'
}

describe('消息中心 QueryClient 数据层', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    queryClient.clear()
    queryHarness.calls = []
    mutationHarness.pendingStates = []
    queryHarness.inbox.data.value = page([firstMessage])
    queryHarness.inbox.isFetching.value = false
    queryHarness.inbox.refetch.mockReset().mockResolvedValue({ data: page([firstMessage]) })
    queryHarness.unread.data.value = 1
    queryHarness.unread.isFetching.value = false
    queryHarness.unread.refetch.mockReset().mockResolvedValue({ data: 1 })
    vi.clearAllMocks()
    api.acknowledgeMessages.mockResolvedValue({ data: 1 })
    api.markMessageRead.mockResolvedValue({})
    api.markAllMessagesRead.mockResolvedValue({ data: 1 })
  })

  it('缓存键包含租户、用户、过滤条件和游标', () => {
    expect(messageInboxQueryKey('tenant-a', '7', {
      cursor: '42',
      limit: 20,
      unread_only: true,
    })).toEqual([
      'server-state',
      'tenant-a',
      'message-inbox',
      { user_id: '7', cursor: '42', limit: 20, unread_only: true },
    ])
    expect(messageInboxQueryKey('tenant-a', '7', { limit: 20 }))
      .not.toEqual(messageInboxQueryKey('tenant-b', '7', { limit: 20 }))
  })

  it('WebSocket 投递只更新同身份首屏缓存，并同步未读数', () => {
    const client = new QueryClient()
    const firstPageKey = messageInboxQueryKey('tenant-a', '7', { limit: 2 })
    const unreadPageKey = messageInboxQueryKey('tenant-a', '7', {
      limit: 2,
      unread_only: true,
    })
    const cursorPageKey = messageInboxQueryKey('tenant-a', '7', {
      cursor: '1',
      limit: 2,
    })
    const otherUserKey = messageInboxQueryKey('tenant-a', '8', { limit: 2 })
    client.setQueryData(firstPageKey, page([firstMessage]))
    client.setQueryData(unreadPageKey, page([firstMessage]))
    client.setQueryData(cursorPageKey, page([firstMessage]))
    client.setQueryData(otherUserKey, page([firstMessage]))
    client.setQueryData(messageUnreadQueryKey('tenant-a', '7'), 1)

    cacheMessageDelivery(client, 'tenant-a', '7', secondMessage)

    expect(client.getQueryData<MessageInboxPage>(firstPageKey)?.records.map(item => item.id))
      .toEqual(['2', '1'])
    expect(client.getQueryData<MessageInboxPage>(unreadPageKey)?.records.map(item => item.id))
      .toEqual(['2', '1'])
    expect(client.getQueryData<MessageInboxPage>(cursorPageKey)?.records.map(item => item.id))
      .toEqual(['1'])
    expect(client.getQueryData<MessageInboxPage>(otherUserKey)?.records.map(item => item.id))
      .toEqual(['1'])
    expect(client.getQueryData(messageUnreadQueryKey('tenant-a', '7'))).toBe(2)

    cacheMessageDelivery(client, 'tenant-a', '7', { ...secondMessage, title: '更新后的标题' })
    expect(client.getQueryData(messageUnreadQueryKey('tenant-a', '7'))).toBe(2)
    expect(client.getQueryData<MessageInboxPage>(firstPageKey)?.records[0]?.title)
      .toBe('更新后的标题')
  })

  it('实时投递处理已读跃迁、无效缓存键和缺失未读缓存', () => {
    const client = new QueryClient()
    const normalKey = messageInboxQueryKey('tenant-a', '7', { limit: 10 })
    const unreadKey = messageInboxQueryKey('tenant-a', '7', {
      limit: 10,
      unread_only: true,
    })
    const countKey = messageUnreadQueryKey('tenant-a', '7')
    const malformedKey = ['server-state', 'tenant-a', 'message-inbox', null] as const
    const invalidParamsKey = [
      'server-state',
      'tenant-a',
      'message-inbox',
      { user_id: 7, cursor: null, limit: 10, unread_only: false },
    ] as const
    client.setQueryData(normalKey, page([firstMessage]))
    client.setQueryData(unreadKey, page([firstMessage]))
    client.setQueryData(malformedKey, page([firstMessage]))
    client.setQueryData(invalidParamsKey, page([firstMessage]))
    client.setQueryData(countKey, 1)

    cacheMessageDelivery(client, 'tenant-a', '7', {
      ...firstMessage,
      read_at: '2026-07-26T14:00:00Z',
    })

    expect(client.getQueryData<MessageInboxPage>(normalKey)?.records[0]?.read_at)
      .toBe('2026-07-26T14:00:00Z')
    expect(client.getQueryData<MessageInboxPage>(unreadKey)?.records).toEqual([])
    expect(client.getQueryData(countKey)).toBe(0)
    expect(client.getQueryData<MessageInboxPage>(malformedKey)?.records).toEqual([firstMessage])
    expect(client.getQueryData<MessageInboxPage>(invalidParamsKey)?.records).toEqual([firstMessage])

    const invalidate = vi.spyOn(client, 'invalidateQueries')
    client.removeQueries({ queryKey: countKey })
    cacheMessageDelivery(client, 'tenant-a', '7', {
      ...secondMessage,
      published_at: 'invalid-date',
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: countKey })
  })

  it('全局投递入口写入共享 QueryClient，身份取消只终止目标用户请求', async () => {
    const sharedKey = messageInboxQueryKey('tenant-a', '7', { limit: 10 })
    queryClient.setQueryData(sharedKey, page([firstMessage]))
    receiveMessageDelivery('tenant-a', '7', secondMessage)
    expect(queryClient.getQueryData<MessageInboxPage>(sharedKey)?.records.map(item => item.id))
      .toEqual(['2', '1'])

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const userSevenKey = messageInboxQueryKey('tenant-a', '7', { limit: 10 })
    const userEightKey = messageInboxQueryKey('tenant-a', '8', { limit: 10 })
    let userSevenSignal: AbortSignal | undefined
    let userEightSignal: AbortSignal | undefined
    const userSevenRequest = client.fetchQuery({
      queryKey: userSevenKey,
      queryFn: ({ signal }) => {
        userSevenSignal = signal
        return new Promise<MessageInboxPage>(() => undefined)
      },
    }).catch(() => undefined)
    const userEightRequest = client.fetchQuery({
      queryKey: userEightKey,
      queryFn: ({ signal }) => {
        userEightSignal = signal
        return new Promise<MessageInboxPage>(() => undefined)
      },
    }).catch(() => undefined)
    await Promise.resolve()

    await cancelMessageState(client, 'tenant-a', '7')
    expect(userSevenSignal?.aborted).toBe(true)
    expect(userEightSignal?.aborted).toBe(false)

    await cancelMessageState(client, 'tenant-a', '8')
    await Promise.all([userSevenRequest, userEightRequest])
  })

  it('定时补拉按 ID 合并实时记录，并通过 MutationCache 确认送达', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const inboxKey = messageInboxQueryKey('tenant-a', '7', { limit: 100, unread_only: false })
    client.setQueryData(inboxKey, page([secondMessage]))
    api.listMessages.mockResolvedValue({ data: page([firstMessage, secondMessage]) })
    api.getUnreadMessageCount.mockResolvedValue({ data: 2 })
    api.acknowledgeMessages.mockResolvedValue({ data: 2 })

    const pulled = await synchronizeMessageState(
      client,
      'tenant-a',
      '7',
      { limit: 100, unread_only: false },
    )
    expect(pulled.records.map(item => item.id)).toEqual(['2', '1'])
    expect(new Set(pulled.records.map(item => item.id)).size).toBe(2)

    await executeMessageAcknowledgement(client, 'tenant-a', '7', ['1', '2'])
    expect(api.acknowledgeMessages).toHaveBeenCalledWith(['1', '2'])
    expect(client.getQueryData<MessageInboxPage>(inboxKey)?.records.every(item => item.acked_at))
      .toBe(true)
  })

  it('补拉保留请求期间到达的实时消息，并允许未读数查询独立失败', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const inboxKey = messageInboxQueryKey('tenant-a', '7', { limit: 2, unread_only: false })
    client.setQueryData(inboxKey, page([firstMessage]))
    let resolveInbox!: (value: { data: MessageInboxPage }) => void
    api.listMessages.mockImplementation(() => new Promise(resolve => {
      resolveInbox = resolve
    }))
    api.getUnreadMessageCount.mockRejectedValue(new Error('unread unavailable'))

    const pulling = synchronizeMessageState(
      client,
      'tenant-a',
      '7',
      { limit: 2, unread_only: false },
    )
    await vi.waitFor(() => expect(api.listMessages).toHaveBeenCalledTimes(1))
    cacheMessageDelivery(client, 'tenant-a', '7', secondMessage)
    resolveInbox({ data: page([firstMessage]) })

    await expect(pulling).resolves.toMatchObject({
      records: [expect.objectContaining({ id: '2' }), expect.objectContaining({ id: '1' })],
      next_cursor: '1',
    })
  })

  it('补拉拒绝缺失收件箱数据，并把负未读数规整为零', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    api.listMessages.mockResolvedValueOnce({ data: undefined })
    api.getUnreadMessageCount.mockResolvedValueOnce({ data: -3 })

    await expect(synchronizeMessageState(
      client,
      'tenant-a',
      '7',
      { limit: 10 },
    )).rejects.toMatchObject({ message: '消息收件箱响应缺少 data' })
    expect(client.getQueryData(messageUnreadQueryKey('tenant-a', '7'))).toBe(0)
  })

  it('ack、read 和 read-all 都通过 mutation 更新同一份缓存', async () => {
    authenticate()
    const inboxKey = messageInboxQueryKey('tenant-a', '7', { limit: 100, unread_only: false })
    const unreadKey = messageUnreadQueryKey('tenant-a', '7')
    queryClient.setQueryData(inboxKey, page([firstMessage, secondMessage]))
    queryClient.setQueryData(unreadKey, 2)
    queryHarness.unread.data.value = 2
    const center = useMessageCenterQueries({ limit: 100, unread_only: false })

    await center.acknowledge(['1'])
    expect(api.acknowledgeMessages).toHaveBeenCalledWith(['1'])
    expect(queryClient.getQueryData<MessageInboxPage>(inboxKey)?.records[0]?.acked_at).toBeTruthy()

    await center.markRead('1')
    expect(api.markMessageRead).toHaveBeenCalledWith('1')
    expect(queryClient.getQueryData<MessageInboxPage>(inboxKey)?.records[0]?.read_at).toBeTruthy()
    expect(queryClient.getQueryData(unreadKey)).toBe(1)

    await center.markAllRead()
    expect(api.markAllMessagesRead).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData<MessageInboxPage>(inboxKey)?.records.every(item => item.read_at))
      .toBe(true)
    expect(queryClient.getQueryData(unreadKey)).toBe(0)
  })

  it('确认 mutation 处理空输入、数量上限和服务端差异', async () => {
    authenticate()
    const inboxKey = messageInboxQueryKey('tenant-a', '7', { limit: 100 })
    const otherUserKey = messageInboxQueryKey('tenant-a', '8', { limit: 100 })
    queryClient.setQueryData(inboxKey, page([firstMessage]))
    queryClient.setQueryData(otherUserKey, page([firstMessage]))
    const center = useMessageCenterQueries({ limit: 100 })

    await center.acknowledge([])
    expect(api.acknowledgeMessages).not.toHaveBeenCalled()
    await expect(center.acknowledge(Array.from({ length: 101 }, (_, index) => String(index + 1))))
      .rejects.toMatchObject({ status: 400 })

    api.acknowledgeMessages.mockResolvedValueOnce({ data: 0 })
    await center.acknowledge(['1', '1'])
    expect(api.acknowledgeMessages).toHaveBeenCalledWith(['1'])
    expect(queryClient.getQueryState(inboxKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(otherUserKey)?.isInvalidated).toBe(false)

    api.acknowledgeMessages.mockClear()
    await executeMessageAcknowledgement(queryClient, 'tenant-a', '7', [])
    expect(api.acknowledgeMessages).not.toHaveBeenCalled()
  })

  it('已读 mutation 处理已读短路、未缓存消息和未读专用缓存', async () => {
    authenticate()
    const normalKey = messageInboxQueryKey('tenant-a', '7', { limit: 100 })
    const unreadOnlyKey = messageInboxQueryKey('tenant-a', '7', {
      limit: 100,
      unread_only: true,
    })
    const countKey = messageUnreadQueryKey('tenant-a', '7')
    const alreadyRead = { ...firstMessage, read_at: '2026-07-26T14:00:00Z' }
    queryClient.setQueryData(normalKey, page([alreadyRead, secondMessage]))
    queryClient.setQueryData(unreadOnlyKey, page([secondMessage]))
    queryClient.setQueryData(countKey, 1)
    const center = useMessageCenterQueries({ limit: 100 })

    await center.markRead('1')
    expect(api.markMessageRead).not.toHaveBeenCalled()

    await center.markRead('2')
    expect(queryClient.getQueryData<MessageInboxPage>(unreadOnlyKey)?.records).toEqual([])
    expect(queryClient.getQueryData(countKey)).toBe(0)

    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await center.markRead('missing')
    expect(api.markMessageRead).toHaveBeenLastCalledWith('missing')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: countKey })
  })

  it('未认证会话拒绝写操作，零未读时跳过全部已读', async () => {
    const center = useMessageCenterQueries({ limit: 100 })
    await expect(center.acknowledge(['1'])).rejects.toMatchObject({ status: 401 })
    await expect(center.markRead('1')).rejects.toMatchObject({ status: 401 })
    await expect(center.markAllRead()).rejects.toMatchObject({ status: 401 })

    authenticate()
    queryHarness.unread.data.value = 0
    const authenticatedCenter = useMessageCenterQueries({ limit: 100 })
    await authenticatedCenter.markAllRead()
    expect(api.markAllMessagesRead).not.toHaveBeenCalled()
  })

  it('查询读取使用取消信号，加载与刷新状态来自 Query', async () => {
    authenticate()
    api.listMessages.mockResolvedValue({ data: page([firstMessage]) })
    api.getUnreadMessageCount.mockResolvedValue({ data: 1 })
    queryHarness.inbox.isFetching.value = true
    const center = useMessageCenterQueries({ cursor: '42', limit: 20, unread_only: true })
    const inboxCall = queryHarness.calls.find(call => call[2] === 'message-inbox')
    const unreadCall = queryHarness.calls.find(call => call[2] === 'message-unread-count')
    const controller = new AbortController()

    await (inboxCall?.[4] as (signal: AbortSignal) => Promise<MessageInboxPage>)(controller.signal)
    await (unreadCall?.[4] as (signal: AbortSignal) => Promise<number>)(controller.signal)

    expect(api.listMessages).toHaveBeenCalledWith(
      { cursor: '42', limit: 20, unread_only: true },
      controller.signal,
    )
    expect(api.getUnreadMessageCount).toHaveBeenCalledWith(controller.signal)
    expect(center.loading.value).toBe(true)
    expect(center.messages.value).toEqual([firstMessage])
    expect(center.unreadCount.value).toBe(1)

    queryHarness.inbox.isFetching.value = false
    queryHarness.unread.isFetching.value = true
    expect(center.loading.value).toBe(true)
    queryHarness.unread.isFetching.value = false
    mutationHarness.pendingStates[1]!.value = true
    expect(center.mutating.value).toBe(true)
    mutationHarness.pendingStates[1]!.value = false
    mutationHarness.pendingStates[2]!.value = true
    expect(center.mutating.value).toBe(true)

    await center.refresh()
    expect(queryHarness.inbox.refetch).toHaveBeenCalledWith({ throwOnError: true })
    expect(queryHarness.unread.refetch).toHaveBeenCalledWith({ throwOnError: true })
  })

  it('查询函数拒绝缺失 data，启用状态随租户和用户变化', async () => {
    authenticate()
    const center = useMessageCenterQueries({})
    const inboxCall = queryHarness.calls.find(call => call[2] === 'message-inbox')
    const unreadCall = queryHarness.calls.find(call => call[2] === 'message-unread-count')
    const enabled = inboxCall?.[1] as { value: boolean }
    const inboxParams = inboxCall?.[3] as () => unknown
    const unreadParams = unreadCall?.[3] as () => unknown
    const controller = new AbortController()
    api.listMessages.mockResolvedValueOnce({ data: undefined })
    api.getUnreadMessageCount.mockResolvedValueOnce({ data: undefined })

    expect(enabled.value).toBe(true)
    expect(inboxParams()).toEqual({ user_id: '7', cursor: null, limit: 100, unread_only: false })
    expect(unreadParams()).toEqual({ user_id: '7' })
    await expect((inboxCall?.[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal))
      .rejects.toMatchObject({ message: '消息收件箱响应缺少 data' })
    await expect((unreadCall?.[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal))
      .rejects.toMatchObject({ message: '未读消息响应缺少 data' })

    const user = useUserStore()
    user.tenantId = ''
    expect(enabled.value).toBe(false)
    user.tenantId = 'tenant-a'
    user.userId = ''
    expect(enabled.value).toBe(false)
    expect(center.messages.value).toEqual([firstMessage])
  })
})
