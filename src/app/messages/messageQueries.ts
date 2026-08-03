import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, type QueryClient, type QueryKey } from '@tanstack/vue-query'
import {
  acknowledgeMessages,
  getUnreadMessageCount,
  listMessages,
  markAllMessagesRead,
  markMessageRead,
  type MessageInboxPage,
  type MessageInboxQuery,
  type MessageRecord,
} from '@/api/modules/messages'
import { HttpError } from '@/shared/http/client'
import { queryClient, tenantQueryKey } from '@/shared/query/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const MESSAGE_INBOX_RESOURCE = 'message-inbox'
const MESSAGE_UNREAD_RESOURCE = 'message-unread-count'
const DEFAULT_INBOX_LIMIT = 100

interface MessageIdentity {
  tenantId: string
  userId: string
}

interface MessageInboxKeyParams {
  user_id: string
  cursor: string | null
  limit: number
  unread_only: boolean
}

interface AcknowledgeVariables extends MessageIdentity {
  ids: string[]
}

interface MarkReadVariables extends MessageIdentity {
  id: string
  wasUnread?: boolean
}

/** 把可选查询字段规范成稳定缓存键，游标为空时也必须进入键。 */
export function messageInboxKeyParams(
  userId: string,
  query: MessageInboxQuery,
): MessageInboxKeyParams {
  return {
    user_id: userId,
    cursor: query.cursor ?? null,
    limit: query.limit ?? DEFAULT_INBOX_LIMIT,
    unread_only: query.unread_only ?? false,
  }
}

export function messageInboxQueryKey(
  tenantId: string,
  userId: string,
  query: MessageInboxQuery,
): QueryKey {
  return tenantQueryKey(
    tenantId,
    MESSAGE_INBOX_RESOURCE,
    messageInboxKeyParams(userId, query),
  )
}

export function messageUnreadQueryKey(tenantId: string, userId: string): QueryKey {
  return tenantQueryKey(tenantId, MESSAGE_UNREAD_RESOURCE, { user_id: userId })
}

function resourceQueryKey(tenantId: string, resource: string): QueryKey {
  return tenantQueryKey(tenantId, resource).slice(0, 3)
}

function invalidateUserInbox(
  client: QueryClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  return client.invalidateQueries({
    queryKey: resourceQueryKey(tenantId, MESSAGE_INBOX_RESOURCE),
    predicate: query => isInboxKeyForUser(query.queryKey, userId),
  })
}

function isInboxKeyForUser(queryKey: QueryKey, userId: string): boolean {
  const params = queryKey[3]
  return isRecord(params) && params.user_id === userId
}

function inboxParamsFromKey(queryKey: QueryKey): MessageInboxKeyParams | undefined {
  const params = queryKey[3]
  if (!isRecord(params)) return undefined
  if (
    typeof params.user_id !== 'string'
    || !(typeof params.cursor === 'string' || params.cursor === null)
    || typeof params.limit !== 'number'
    || typeof params.unread_only !== 'boolean'
  ) {
    return undefined
  }
  return {
    user_id: params.user_id,
    cursor: params.cursor,
    limit: params.limit,
    unread_only: params.unread_only,
  }
}

function sortMessages(left: MessageRecord, right: MessageRecord): number {
  const rightTime = Date.parse(right.published_at) || 0
  const leftTime = Date.parse(left.published_at) || 0
  if (rightTime !== leftTime) return rightTime - leftTime
  return right.id.localeCompare(left.id)
}

function mergeMessage(previous: MessageRecord | undefined, incoming: MessageRecord): MessageRecord {
  return {
    ...previous,
    ...incoming,
    read_at: incoming.read_at ?? previous?.read_at,
    acked_at: incoming.acked_at ?? previous?.acked_at,
  }
}

function mergeMessagePage(
  current: MessageInboxPage | undefined,
  incoming: MessageInboxPage,
  limit: number,
  preserveExtraIds: ReadonlySet<string> = new Set(),
): MessageInboxPage {
  const currentMessages = new Map(current?.records.map(message => [message.id, message]) ?? [])
  const messages = new Map<string, MessageRecord>()
  for (const message of incoming.records) {
    messages.set(message.id, mergeMessage(currentMessages.get(message.id), message))
  }
  for (const id of preserveExtraIds) {
    const message = currentMessages.get(id)
    if (message && !messages.has(id)) messages.set(id, message)
  }
  const records = [...messages.values()].sort(sortMessages).slice(0, limit)
  return {
    ...incoming,
    records,
    next_cursor: records.length >= limit
      ? records.at(-1)?.id ?? incoming.next_cursor
      : incoming.next_cursor,
  }
}

function findCachedMessage(
  client: QueryClient,
  tenantId: string,
  userId: string,
  id: string,
): MessageRecord | undefined {
  const entries = client.getQueriesData<MessageInboxPage>({
    queryKey: resourceQueryKey(tenantId, MESSAGE_INBOX_RESOURCE),
  })
  for (const [key, page] of entries) {
    if (!page || !isInboxKeyForUser(key, userId)) continue
    const message = page.records.find(record => record.id === id)
    if (message) return message
  }
  return undefined
}

function setUnreadCount(
  client: QueryClient,
  tenantId: string,
  userId: string,
  update: (current: number) => number,
): boolean {
  const key = messageUnreadQueryKey(tenantId, userId)
  if (client.getQueryData<number>(key) === undefined) return false
  client.setQueryData<number>(key, current => Math.max(0, update(current ?? 0)))
  return true
}

/** WebSocket 投递直接合并到当前租户和用户的 QueryClient 缓存。 */
export function cacheMessageDelivery(
  client: QueryClient,
  tenantId: string,
  userId: string,
  incoming: MessageRecord,
): void {
  const previous = findCachedMessage(client, tenantId, userId, incoming.id)
  const merged = mergeMessage(previous, incoming)
  const entries = client.getQueriesData<MessageInboxPage>({
    queryKey: resourceQueryKey(tenantId, MESSAGE_INBOX_RESOURCE),
  })

  for (const [key, page] of entries) {
    const params = inboxParamsFromKey(key)
    if (!page || !params || params.user_id !== userId) continue
    const existing = page.records.some(message => message.id === incoming.id)
    const belongsToFirstPage = params.cursor === null
      && (!params.unread_only || !merged.read_at)
    if (!existing && !belongsToFirstPage) continue

    const records = page.records
      .filter(message => message.id !== incoming.id)
      .concat(merged)
      .filter(message => !params.unread_only || !message.read_at)
      .sort(sortMessages)
      .slice(0, params.limit)
    client.setQueryData<MessageInboxPage>(key, { ...page, records })
  }

  const unreadDelta = previous
    ? Number(!merged.read_at) - Number(!previous.read_at)
    : Number(!merged.read_at)
  if (unreadDelta !== 0 && !setUnreadCount(
    client,
    tenantId,
    userId,
    current => current + unreadDelta,
  )) {
    void client.invalidateQueries({ queryKey: messageUnreadQueryKey(tenantId, userId) })
  }
}

export function receiveMessageDelivery(
  tenantId: string,
  userId: string,
  message: MessageRecord,
): void {
  cacheMessageDelivery(queryClient, tenantId, userId, message)
}

/** 取消指定身份的消息读取，防止会话切换后旧响应重新写入缓存。 */
export async function cancelMessageState(
  client: QueryClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  await Promise.all([
    client.cancelQueries({
      queryKey: resourceQueryKey(tenantId, MESSAGE_INBOX_RESOURCE),
      predicate: query => isInboxKeyForUser(query.queryKey, userId),
    }),
    client.cancelQueries({ queryKey: messageUnreadQueryKey(tenantId, userId) }),
  ])
}

async function fetchMessageInboxPage(
  client: QueryClient,
  tenantId: string,
  userId: string,
  query: MessageInboxQuery,
  signal: AbortSignal,
): Promise<MessageInboxPage> {
  const key = messageInboxQueryKey(tenantId, userId, query)
  const knownIds = new Set(
    client.getQueryData<MessageInboxPage>(key)?.records.map(message => message.id) ?? [],
  )
  const response = await listMessages(query, signal)
  if (!response.data) {
    throw new HttpError('消息收件箱响应缺少 data', { kind: 'invalid_response' })
  }
  const params = messageInboxKeyParams(userId, query)
  const current = client.getQueryData<MessageInboxPage>(key)
  const arrivedDuringRequest = new Set(
    current?.records.filter(message => !knownIds.has(message.id)).map(message => message.id) ?? [],
  )
  return mergeMessagePage(
    current,
    response.data,
    params.limit,
    arrivedDuringRequest,
  )
}

/** 强制补拉收件箱与未读数，并把实时投递期间到达的记录按 ID 合并。 */
export async function synchronizeMessageState(
  client: QueryClient,
  tenantId: string,
  userId: string,
  query: MessageInboxQuery,
): Promise<MessageInboxPage> {
  const inboxKey = messageInboxQueryKey(tenantId, userId, query)
  const unreadKey = messageUnreadQueryKey(tenantId, userId)
  const inboxPromise = client.fetchQuery({
    queryKey: inboxKey,
    staleTime: 0,
    queryFn: ({ signal }) => fetchMessageInboxPage(
      client,
      tenantId,
      userId,
      query,
      signal,
    ),
  })
  const unreadPromise = client.fetchQuery({
    queryKey: unreadKey,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const response = await getUnreadMessageCount(signal)
      if (response.data === undefined) {
        throw new HttpError('未读消息响应缺少 data', { kind: 'invalid_response' })
      }
      return Math.max(0, response.data)
    },
  })
  const [page] = await Promise.all([
    inboxPromise,
    unreadPromise.catch(() => undefined),
  ])
  return page
}

function updateCachedMessages(
  client: QueryClient,
  identity: MessageIdentity,
  update: (message: MessageRecord, params: MessageInboxKeyParams) => MessageRecord | undefined,
): void {
  const entries = client.getQueriesData<MessageInboxPage>({
    queryKey: resourceQueryKey(identity.tenantId, MESSAGE_INBOX_RESOURCE),
  })
  for (const [key, page] of entries) {
    const params = inboxParamsFromKey(key)
    if (!page || !params || params.user_id !== identity.userId) continue
    const records = page.records.flatMap((message) => {
      const changed = update(message, params)
      return changed ? [changed] : []
    })
    client.setQueryData<MessageInboxPage>(key, { ...page, records })
  }
}

function acknowledgeCachedMessages(
  client: QueryClient,
  variables: AcknowledgeVariables,
  acknowledgedAt: string,
): void {
  const ids = new Set(variables.ids)
  updateCachedMessages(client, variables, message => (
    ids.has(message.id) ? { ...message, acked_at: message.acked_at ?? acknowledgedAt } : message
  ))
}

function markCachedMessageRead(
  client: QueryClient,
  variables: MarkReadVariables,
  readAt: string,
): void {
  updateCachedMessages(client, variables, (message, params) => {
    if (message.id !== variables.id) return message
    if (params.unread_only) return undefined
    return {
      ...message,
      read_at: message.read_at ?? readAt,
      acked_at: message.acked_at ?? readAt,
    }
  })
}

function markAllCachedMessagesRead(
  client: QueryClient,
  identity: MessageIdentity,
  readAt: string,
): void {
  updateCachedMessages(client, identity, (message, params) => (
    params.unread_only
      ? undefined
      : {
          ...message,
          read_at: message.read_at ?? readAt,
          acked_at: message.acked_at ?? readAt,
        }
  ))
}

function currentMessageIdentity(): MessageIdentity {
  const userStore = useUserStore()
  if (
    userStore.sessionStatus !== 'authenticated'
    || !userStore.tenantId
    || !userStore.userId
  ) {
    throw new HttpError('消息会话尚未就绪', { status: 401, kind: 'http' })
  }
  return { tenantId: userStore.tenantId, userId: String(userStore.userId) }
}

function uniqueMessageIds(ids: readonly string[]): string[] {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length > 100) {
    throw new HttpError('一次最多确认 100 条消息', { status: 400, kind: 'http' })
  }
  return unique
}

function acknowledgeMutationOptions(client: QueryClient) {
  return {
    mutationKey: ['message-acknowledge'],
    mutationFn: (variables: AcknowledgeVariables) => acknowledgeMessages(variables.ids),
    onSuccess: async (response: Awaited<ReturnType<typeof acknowledgeMessages>>, variables: AcknowledgeVariables) => {
      acknowledgeCachedMessages(client, variables, new Date().toISOString())
      if (response.data !== variables.ids.length) {
        await invalidateUserInbox(client, variables.tenantId, variables.userId)
      }
    },
  }
}

/** 在 Vue 组件之外也通过 TanStack MutationCache 执行同一确认写操作。 */
export async function executeMessageAcknowledgement(
  client: QueryClient,
  tenantId: string,
  userId: string,
  ids: readonly string[],
): Promise<void> {
  const normalized = uniqueMessageIds(ids)
  if (normalized.length === 0) return
  const variables = { tenantId, userId, ids: normalized }
  const mutation = client.getMutationCache().build(client, acknowledgeMutationOptions(client))
  await mutation.execute(variables)
}

/**
 * 消息中心的服务端状态入口。列表、未读数和所有写操作都由 TanStack Query 管理，
 * Pinia 不再保存这些数据的副本。
 */
export function useMessageCenterQueries(
  query: MaybeRefOrGetter<MessageInboxQuery>,
) {
  const userStore = useUserStore()
  const enabled = computed(() => (
    userStore.sessionStatus === 'authenticated'
    && Boolean(userStore.tenantId)
    && Boolean(userStore.userId)
  ))
  const userId = computed(() => String(userStore.userId || ''))

  const inboxQuery = useTenantQuery<MessageInboxPage>(
    () => userStore.tenantId,
    enabled,
    MESSAGE_INBOX_RESOURCE,
    () => messageInboxKeyParams(userId.value, toValue(query)),
    async (signal) => {
      const tenantId = userStore.tenantId
      const requestedUserId = userId.value
      const requestedQuery = toValue(query)
      return fetchMessageInboxPage(
        queryClient,
        tenantId,
        requestedUserId,
        requestedQuery,
        signal,
      )
    },
  )
  const unreadQuery = useTenantQuery<number>(
    () => userStore.tenantId,
    enabled,
    MESSAGE_UNREAD_RESOURCE,
    () => ({ user_id: userId.value }),
    async (signal) => {
      const response = await getUnreadMessageCount(signal)
      if (response.data === undefined) {
        throw new HttpError('未读消息响应缺少 data', { kind: 'invalid_response' })
      }
      return Math.max(0, response.data)
    },
  )

  const acknowledgeMutation = useMutation(acknowledgeMutationOptions(queryClient))
  const markReadMutation = useMutation({
    mutationFn: (variables: MarkReadVariables) => markMessageRead(variables.id),
    onSuccess: async (_response, variables) => {
      markCachedMessageRead(queryClient, variables, new Date().toISOString())
      if (variables.wasUnread === true) {
        if (!setUnreadCount(
          queryClient,
          variables.tenantId,
          variables.userId,
          current => current - 1,
        )) {
          await queryClient.invalidateQueries({
            queryKey: messageUnreadQueryKey(variables.tenantId, variables.userId),
          })
        }
      }
      else if (variables.wasUnread === undefined) {
        await queryClient.invalidateQueries({
          queryKey: messageUnreadQueryKey(variables.tenantId, variables.userId),
        })
      }
    },
  })
  const markAllReadMutation = useMutation({
    mutationFn: (_identity: MessageIdentity) => markAllMessagesRead(),
    onSuccess: async (_response, identity) => {
      markAllCachedMessagesRead(queryClient, identity, new Date().toISOString())
      queryClient.setQueryData<number>(messageUnreadQueryKey(identity.tenantId, identity.userId), 0)
      await Promise.all([
        invalidateUserInbox(queryClient, identity.tenantId, identity.userId),
        queryClient.invalidateQueries({
          queryKey: messageUnreadQueryKey(identity.tenantId, identity.userId),
        }),
      ])
    },
  })

  async function acknowledge(ids: readonly string[]): Promise<void> {
    const normalized = uniqueMessageIds(ids)
    if (normalized.length === 0) return
    await acknowledgeMutation.mutateAsync({ ...currentMessageIdentity(), ids: normalized })
  }

  async function markRead(id: string): Promise<void> {
    const identity = currentMessageIdentity()
    const message = findCachedMessage(queryClient, identity.tenantId, identity.userId, id)
    if (message?.read_at) return
    await markReadMutation.mutateAsync({
      ...identity,
      id,
      wasUnread: message ? !message.read_at : undefined,
    })
  }

  async function markAllRead(): Promise<void> {
    const identity = currentMessageIdentity()
    if ((unreadQuery.data.value ?? 0) === 0) return
    await markAllReadMutation.mutateAsync(identity)
  }

  async function refresh(): Promise<void> {
    await Promise.all([
      inboxQuery.refetch({ throwOnError: true }),
      unreadQuery.refetch({ throwOnError: true }),
    ])
  }

  return {
    inboxQuery,
    unreadQuery,
    messages: computed(() => inboxQuery.data.value?.records ?? []),
    unreadCount: computed(() => unreadQuery.data.value ?? 0),
    loading: computed(() => inboxQuery.isFetching.value || unreadQuery.isFetching.value),
    mutating: computed(() => (
      acknowledgeMutation.isPending.value
      || markReadMutation.isPending.value
      || markAllReadMutation.isPending.value
    )),
    acknowledge,
    markRead,
    markAllRead,
    refresh,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
