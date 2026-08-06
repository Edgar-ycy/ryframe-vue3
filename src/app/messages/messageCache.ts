import type { QueryClient, QueryKey } from '@tanstack/vue-query'
import type {
  MessageInboxPage,
  MessageInboxQuery,
  MessageRecord,
} from '@/api/modules/messages'
import { queryClient, tenantQueryKey } from '@/shared/query/client'

export const MESSAGE_INBOX_RESOURCE = 'message-inbox'
export const MESSAGE_UNREAD_RESOURCE = 'message-unread-count'
export const DEFAULT_INBOX_LIMIT = 100

export interface MessageIdentity {
  tenantId: string
  userId: string
}

export interface MessageInboxKeyParams {
  user_id: string
  cursor: string | null
  limit: number
  unread_only: boolean
}

export interface AcknowledgeVariables extends MessageIdentity {
  ids: string[]
}

export interface MarkReadVariables extends MessageIdentity {
  id: string
  wasUnread?: boolean
}

export interface DeleteVariables extends MessageIdentity {
  ids: string[]
}

/** 将可选查询字段规范为稳定缓存键，空游标也会显式进入键。 */
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

export function resourceQueryKey(tenantId: string, resource: string): QueryKey {
  return tenantQueryKey(tenantId, resource).slice(0, 3)
}

export function invalidateUserInbox(
  client: QueryClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  return client.invalidateQueries({
    queryKey: resourceQueryKey(tenantId, MESSAGE_INBOX_RESOURCE),
    predicate: query => isInboxKeyForUser(query.queryKey, userId),
  })
}

export function isInboxKeyForUser(queryKey: QueryKey, userId: string): boolean {
  const params = queryKey[3]
  return isRecord(params) && params.user_id === userId
}

export function inboxParamsFromKey(queryKey: QueryKey): MessageInboxKeyParams | undefined {
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

export function mergeMessagePage(
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

export function findCachedMessage(
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

export function setUnreadCount(
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

/** 将 WebSocket 投递合并到当前租户和用户的收件箱缓存。 */
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

export function acknowledgeCachedMessages(
  client: QueryClient,
  variables: AcknowledgeVariables,
  acknowledgedAt: string,
): void {
  const ids = new Set(variables.ids)
  updateCachedMessages(client, variables, message => (
    ids.has(message.id) ? { ...message, acked_at: message.acked_at ?? acknowledgedAt } : message
  ))
}

export function markCachedMessageRead(
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

export function markAllCachedMessagesRead(
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

/** 从所有收件箱变体中移除消息，并按缓存中的真实未读状态修正角标。 */
export function removeCachedMessages(
  client: QueryClient,
  variables: DeleteVariables,
): number {
  const ids = new Set(variables.ids)
  const unreadRemoved = variables.ids.reduce((count, id) => {
    const message = findCachedMessage(
      client,
      variables.tenantId,
      variables.userId,
      id,
    )
    return count + Number(Boolean(message && !message.read_at))
  }, 0)

  updateCachedMessages(client, variables, message => (
    ids.has(message.id) ? undefined : message
  ))
  if (unreadRemoved > 0) {
    setUnreadCount(
      client,
      variables.tenantId,
      variables.userId,
      current => current - unreadRemoved,
    )
  }
  return unreadRemoved
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
