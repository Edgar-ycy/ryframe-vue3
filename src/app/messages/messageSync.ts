import type { QueryClient } from '@tanstack/vue-query'
import {
  acknowledgeMessages,
  getUnreadMessageCount,
  listMessages,
  type MessageInboxPage,
  type MessageInboxQuery,
} from '@/api/modules/messages'
import { HttpError } from '@/shared/http/client'
import {
  acknowledgeCachedMessages,
  type AcknowledgeVariables,
  isInboxKeyForUser,
  invalidateUserInbox,
  mergeMessagePage,
  MESSAGE_INBOX_RESOURCE,
  messageInboxKeyParams,
  messageInboxQueryKey,
  messageUnreadQueryKey,
  resourceQueryKey,
} from './messageCache'

/** 取消指定身份的消息读取，防止会话切换后旧响应写回缓存。 */
export async function cancelMessageState(
  client: QueryClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  await Promise.all([
    client.cancelQueries({
      queryKey: resourceQueryKey(tenantId, MESSAGE_INBOX_RESOURCE),
      predicate: (query) => isInboxKeyForUser(query.queryKey, userId),
    }),
    client.cancelQueries({ queryKey: messageUnreadQueryKey(tenantId, userId) }),
  ])
}

export async function fetchMessageInboxPage(
  client: QueryClient,
  tenantId: string,
  userId: string,
  query: MessageInboxQuery,
  signal: AbortSignal,
): Promise<MessageInboxPage> {
  const key = messageInboxQueryKey(tenantId, userId, query)
  const knownIds = new Set(
    client.getQueryData<MessageInboxPage>(key)?.records.map((message) => message.id) ?? [],
  )
  const response = await listMessages(query, signal)
  if (!response.data) {
    throw new HttpError('消息收件箱响应缺少 data', { kind: 'invalid_response' })
  }
  const params = messageInboxKeyParams(userId, query)
  const current = client.getQueryData<MessageInboxPage>(key)
  const arrivedDuringRequest = new Set(
    current?.records.filter((message) => !knownIds.has(message.id)).map((message) => message.id) ??
      [],
  )
  return mergeMessagePage(current, response.data, params.limit, arrivedDuringRequest)
}

/** 强制补拉收件箱与未读数，并保留请求期间实时到达的记录。 */
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
    queryFn: ({ signal }) => fetchMessageInboxPage(client, tenantId, userId, query, signal),
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
  const [page] = await Promise.all([inboxPromise, unreadPromise.catch(() => undefined)])
  return page
}

export function normalizeMessageIds(ids: readonly string[], action: string): string[] {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (unique.length > 100) {
    throw new HttpError(`一次最多${action} 100 条消息`, { status: 400, kind: 'http' })
  }
  return unique
}

export function acknowledgeMutationOptions(client: QueryClient) {
  return {
    mutationKey: ['message-acknowledge'],
    meta: { errorMode: 'silent' as const },
    mutationFn: (variables: AcknowledgeVariables) => acknowledgeMessages(variables.ids),
    onSuccess: async (
      response: Awaited<ReturnType<typeof acknowledgeMessages>>,
      variables: AcknowledgeVariables,
    ) => {
      acknowledgeCachedMessages(client, variables, new Date().toISOString())
      if (response.data !== variables.ids.length) {
        await invalidateUserInbox(client, variables.tenantId, variables.userId)
      }
    },
  }
}

/** 在 Vue 组件之外也通过 MutationCache 执行同一送达确认写操作。 */
export async function executeMessageAcknowledgement(
  client: QueryClient,
  tenantId: string,
  userId: string,
  ids: readonly string[],
): Promise<void> {
  const normalized = normalizeMessageIds(ids, '确认')
  if (normalized.length === 0) return
  const variables = { tenantId, userId, ids: normalized }
  const mutation = client.getMutationCache().build(client, acknowledgeMutationOptions(client))
  await mutation.execute(variables)
}
