import type { QueryClient } from '@tanstack/vue-query'
import type { MessageInboxPage, MessageRecord } from '@/api/modules/messages'
import { isServerStateScopeCurrent, queryClient } from '@/shared/query/client'
import {
  type AcknowledgeVariables,
  type DeleteVariables,
  type MarkReadVariables,
  type MessageIdentity,
  type MessageInboxKeyParams,
  inboxParamsFromKey,
  isInboxKeyForSubject,
  MESSAGE_INBOX_RESOURCE,
  messageResourcePrefix,
  messageUnreadQueryKey,
} from './queryKeys'

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
  const currentMessages = new Map(current?.records.map((message) => [message.id, message]) ?? [])
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
    next_cursor:
      records.length >= limit ? (records.at(-1)?.id ?? incoming.next_cursor) : incoming.next_cursor,
  }
}

export function findCachedMessage(
  client: QueryClient,
  scope: MessageIdentity,
  id: string,
): MessageRecord | undefined {
  const entries = client.getQueriesData<MessageInboxPage>({
    queryKey: messageResourcePrefix(scope, MESSAGE_INBOX_RESOURCE),
  })
  for (const [key, page] of entries) {
    if (!page || !isInboxKeyForSubject(key, scope.subjectId)) continue
    const message = page.records.find((record) => record.id === id)
    if (message) return message
  }
  return undefined
}

export function setUnreadCount(
  client: QueryClient,
  scope: MessageIdentity,
  update: (current: number) => number,
): boolean {
  if (!isServerStateScopeCurrent(scope)) return false
  const key = messageUnreadQueryKey(scope)
  if (client.getQueryData<number>(key) === undefined) return false
  if (!isServerStateScopeCurrent(scope)) return false
  client.setQueryData<number>(key, (current) => Math.max(0, update(current ?? 0)))
  return true
}

/** 将 WebSocket 投递合并到当前租户和用户的收件箱缓存。 */
export function cacheMessageDelivery(
  client: QueryClient,
  scope: MessageIdentity,
  incoming: MessageRecord,
): void {
  if (!isServerStateScopeCurrent(scope)) return
  const previous = findCachedMessage(client, scope, incoming.id)
  const merged = mergeMessage(previous, incoming)
  const entries = client.getQueriesData<MessageInboxPage>({
    queryKey: messageResourcePrefix(scope, MESSAGE_INBOX_RESOURCE),
  })

  for (const [key, page] of entries) {
    const params = inboxParamsFromKey(key)
    if (!page || !params || params.user_id !== scope.subjectId) continue
    const existing = page.records.some((message) => message.id === incoming.id)
    const belongsToFirstPage = params.cursor === null && (!params.unread_only || !merged.read_at)
    if (!existing && !belongsToFirstPage) continue

    const records = page.records
      .filter((message) => message.id !== incoming.id)
      .concat(merged)
      .filter((message) => !params.unread_only || !message.read_at)
      .sort(sortMessages)
      .slice(0, params.limit)
    if (!isServerStateScopeCurrent(scope)) return
    client.setQueryData<MessageInboxPage>(key, { ...page, records })
  }

  const unreadDelta = previous
    ? Number(!merged.read_at) - Number(!previous.read_at)
    : Number(!merged.read_at)
  if (
    unreadDelta !== 0 &&
    !setUnreadCount(client, scope, (current) => current + unreadDelta) &&
    isServerStateScopeCurrent(scope)
  ) {
    void client.invalidateQueries({ queryKey: messageUnreadQueryKey(scope) })
  }
}

export function receiveMessageDelivery(scope: MessageIdentity, message: MessageRecord): void {
  cacheMessageDelivery(queryClient, scope, message)
}

function updateCachedMessages(
  client: QueryClient,
  identity: MessageIdentity,
  update: (message: MessageRecord, params: MessageInboxKeyParams) => MessageRecord | undefined,
): void {
  if (!isServerStateScopeCurrent(identity)) return
  const entries = client.getQueriesData<MessageInboxPage>({
    queryKey: messageResourcePrefix(identity, MESSAGE_INBOX_RESOURCE),
  })
  for (const [key, page] of entries) {
    const params = inboxParamsFromKey(key)
    if (!page || !params || params.user_id !== identity.subjectId) continue
    const records = page.records.flatMap((message) => {
      const changed = update(message, params)
      return changed ? [changed] : []
    })
    if (!isServerStateScopeCurrent(identity)) return
    client.setQueryData<MessageInboxPage>(key, { ...page, records })
  }
}

export function acknowledgeCachedMessages(
  client: QueryClient,
  variables: AcknowledgeVariables,
  acknowledgedAt: string,
): void {
  const ids = new Set(variables.ids)
  updateCachedMessages(client, variables, (message) =>
    ids.has(message.id) ? { ...message, acked_at: message.acked_at ?? acknowledgedAt } : message,
  )
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
  updateCachedMessages(client, identity, (message, params) =>
    params.unread_only
      ? undefined
      : {
          ...message,
          read_at: message.read_at ?? readAt,
          acked_at: message.acked_at ?? readAt,
        },
  )
}

/** 从所有收件箱变体中移除消息，并按缓存中的真实未读状态修正角标。 */
export function removeCachedMessages(client: QueryClient, variables: DeleteVariables): number {
  if (!isServerStateScopeCurrent(variables)) return 0
  const ids = new Set(variables.ids)
  const unreadRemoved = variables.ids.reduce((count, id) => {
    const message = findCachedMessage(client, variables, id)
    return count + Number(Boolean(message && !message.read_at))
  }, 0)

  updateCachedMessages(client, variables, (message) => (ids.has(message.id) ? undefined : message))
  if (unreadRemoved > 0) {
    setUnreadCount(client, variables, (current) => current - unreadRemoved)
  }
  return unreadRemoved
}
