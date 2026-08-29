import type { QueryClient } from '@tanstack/vue-query'
import {
  acknowledgeMessages,
  getUnreadMessageCount,
  listMessages,
  type MessageInboxPage,
  type MessageInboxQuery,
} from '@/api/modules/messages'
import { HttpError } from '@/shared/http/client'
import { assertServerStateScopeCurrent, isServerStateScopeCurrent } from '@/shared/query/client'
import { executeServerStateMutation } from '@/shared/query/useServerStateMutation'
import {
  type AcknowledgeVariables,
  isInboxKeyForSubject,
  invalidateMessageInbox,
  MESSAGE_INBOX_RESOURCE,
  type MessageIdentity,
  messageInboxKeyParams,
  messageInboxQueryKey,
  messageResourcePrefix,
  messageUnreadQueryKey,
} from './messageCache/queryKeys'
import { acknowledgeCachedMessages, mergeMessagePage } from './messageCache/mutations'

/** 取消指定身份的消息读取，防止会话切换后旧响应写回缓存。 */
export async function cancelMessageState(
  client: QueryClient,
  scope: MessageIdentity,
): Promise<void> {
  await Promise.all([
    client.cancelQueries({
      queryKey: messageResourcePrefix(scope, MESSAGE_INBOX_RESOURCE),
      predicate: (query) => isInboxKeyForSubject(query.queryKey, scope.subjectId),
    }),
    client.cancelQueries({ queryKey: messageUnreadQueryKey(scope) }),
  ])
}

export async function fetchMessageInboxPage(
  client: QueryClient,
  scope: MessageIdentity,
  query: MessageInboxQuery,
  signal: AbortSignal,
): Promise<MessageInboxPage> {
  assertServerStateScopeCurrent(scope)
  const key = messageInboxQueryKey(scope, query)
  const knownIds = new Set(
    client.getQueryData<MessageInboxPage>(key)?.records.map((message) => message.id) ?? [],
  )
  const response = await listMessages(query, signal)
  assertServerStateScopeCurrent(scope)
  if (!response.data) {
    throw new HttpError('消息收件箱响应缺少 data', { kind: 'invalid_response' })
  }
  const params = messageInboxKeyParams(scope.subjectId, query)
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
  scope: MessageIdentity,
  query: MessageInboxQuery,
): Promise<MessageInboxPage> {
  assertServerStateScopeCurrent(scope)
  const inboxKey = messageInboxQueryKey(scope, query)
  const unreadKey = messageUnreadQueryKey(scope)
  const inboxPromise = client.fetchQuery({
    queryKey: inboxKey,
    staleTime: 0,
    queryFn: ({ signal }) => fetchMessageInboxPage(client, scope, query, signal),
  })
  const unreadPromise = client.fetchQuery({
    queryKey: unreadKey,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      assertServerStateScopeCurrent(scope)
      const response = await getUnreadMessageCount(signal)
      assertServerStateScopeCurrent(scope)
      if (response.data === undefined) {
        throw new HttpError('未读消息响应缺少 data', { kind: 'invalid_response' })
      }
      return Math.max(0, response.data)
    },
  })
  const [page] = await Promise.all([inboxPromise, unreadPromise.catch(() => undefined)])
  assertServerStateScopeCurrent(scope)
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
    meta: { errorMode: 'silent' as const },
    mutationFn: (variables: AcknowledgeVariables) => {
      assertServerStateScopeCurrent(variables)
      return acknowledgeMessages(variables.ids)
    },
    onSuccess: async (
      response: Awaited<ReturnType<typeof acknowledgeMessages>>,
      variables: AcknowledgeVariables,
    ) => {
      if (!isServerStateScopeCurrent(variables)) return
      acknowledgeCachedMessages(client, variables, new Date().toISOString())
      if (response.data !== variables.ids.length) {
        await invalidateMessageInbox(client, variables)
      }
    },
  }
}

/** 在 Vue 组件之外也通过 MutationCache 执行同一送达确认写操作。 */
export async function executeMessageAcknowledgement(
  client: QueryClient,
  identity: MessageIdentity,
  ids: readonly string[],
): Promise<void> {
  const normalized = normalizeMessageIds(ids, '确认')
  if (normalized.length === 0) return
  assertServerStateScopeCurrent(identity)
  const variables = { ...identity, ids: normalized }
  await executeServerStateMutation(
    client,
    MESSAGE_INBOX_RESOURCE,
    variables,
    acknowledgeMutationOptions(client),
  )
}
