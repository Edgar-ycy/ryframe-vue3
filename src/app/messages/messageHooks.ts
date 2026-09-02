import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import {
  deleteMessages as deleteReceivedMessages,
  getUnreadMessageCount,
  markAllMessagesRead,
  markMessageRead,
  type MessageInboxPage,
  type MessageInboxQuery,
} from '@/api/modules/messages'
import { HttpError } from '@/shared/http/client'
import {
  assertServerStateScopeCurrent,
  getServerStateScope,
  isServerStateScopeCurrent,
  queryClient,
} from '@/shared/query/client'
import { sameServerStateScope, type ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import {
  type DeleteVariables,
  invalidateMessageInbox,
  MESSAGE_INBOX_RESOURCE,
  MESSAGE_UNREAD_RESOURCE,
  type MessageIdentity,
  messageInboxKeyParams,
  messageUnreadQueryKey,
  type MarkReadVariables,
} from './messageCache/queryKeys'
import {
  findCachedMessage,
  markAllCachedMessagesRead,
  markCachedMessageRead,
  removeCachedMessages,
  setUnreadCount,
} from './messageCache/mutations'
import {
  acknowledgeMutationOptions,
  fetchMessageInboxPage,
  normalizeMessageIds,
} from './messageSync'

const MESSAGE_QUERY_POLICY = {
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: 10 * 60_000,
  refetchOnReconnect: false,
  refetchOnMount: false,
  meta: { errorMode: 'silent' },
} as const

function currentMessageIdentity(): MessageIdentity {
  const userStore = useUserStore()
  const scope = getServerStateScope()
  if (userStore.sessionStatus !== 'authenticated' || !userStore.tenantId || !userStore.userId) {
    throw new HttpError('消息会话尚未就绪', { status: 401, kind: 'http' })
  }
  const subjectId = String(userStore.userId)
  if (!scope || scope.tenantId !== userStore.tenantId || scope.subjectId !== subjectId) {
    throw new HttpError('消息会话已切换', { status: 401, kind: 'cancelled' })
  }
  return {
    tenantId: scope.tenantId,
    subjectId: scope.subjectId,
    sessionEpoch: scope.sessionEpoch,
  }
}

function expectedMessageIdentity(expectedScope: ServerStateScope): MessageIdentity {
  assertServerStateScopeCurrent(expectedScope)
  const current = currentMessageIdentity()
  if (!sameServerStateScope(current, expectedScope)) {
    throw new HttpError('消息会话已切换', { status: 401, kind: 'cancelled' })
  }
  return expectedScope
}

/** 消息中心状态统一由 Vue Query 管理，实时投递与显式补拉负责更新缓存。 */
export function useMessageCenterQueries(query: MaybeRefOrGetter<MessageInboxQuery>) {
  const userStore = useUserStore()

  function isMessageSessionActive(): boolean {
    return (
      userStore.sessionStatus === 'authenticated' &&
      Boolean(userStore.tenantId) &&
      Boolean(userStore.userId)
    )
  }

  function currentUserId(): string {
    return String(userStore.userId || '')
  }

  const inboxQuery = useServerStateQuery<MessageInboxPage>(
    isMessageSessionActive,
    MESSAGE_INBOX_RESOURCE,
    () => messageInboxKeyParams(currentUserId(), toValue(query)),
    async (signal) => {
      const identity = currentMessageIdentity()
      const requestedQuery = toValue(query)
      return fetchMessageInboxPage(queryClient, identity, requestedQuery, signal)
    },
    MESSAGE_QUERY_POLICY,
  )
  const unreadQuery = useServerStateQuery<number>(
    isMessageSessionActive,
    MESSAGE_UNREAD_RESOURCE,
    () => ({ user_id: currentUserId() }),
    async (signal) => {
      const response = await getUnreadMessageCount(signal)
      if (response.data === undefined) {
        throw new HttpError('未读消息响应缺少 data', { kind: 'invalid_response' })
      }
      return Math.max(0, response.data)
    },
    MESSAGE_QUERY_POLICY,
  )

  const acknowledgeMutation = useServerStateMutation(
    MESSAGE_INBOX_RESOURCE,
    acknowledgeMutationOptions(queryClient),
  )
  const markReadMutation = useServerStateMutation(MESSAGE_INBOX_RESOURCE, {
    meta: { errorMode: 'silent' },
    mutationFn: (variables: MarkReadVariables) => {
      assertServerStateScopeCurrent(variables)
      return markMessageRead(variables.id)
    },
    onSuccess: async (_response, variables) => {
      if (!isServerStateScopeCurrent(variables)) return
      markCachedMessageRead(queryClient, variables, new Date().toISOString())
      if (variables.wasUnread === true) {
        if (!setUnreadCount(queryClient, variables, (current) => current - 1)) {
          if (!isServerStateScopeCurrent(variables)) return
          await queryClient.invalidateQueries({
            queryKey: messageUnreadQueryKey(variables),
          })
        }
      } else if (variables.wasUnread === undefined) {
        if (!isServerStateScopeCurrent(variables)) return
        await queryClient.invalidateQueries({
          queryKey: messageUnreadQueryKey(variables),
        })
      }
    },
  })
  const markAllReadMutation = useServerStateMutation(MESSAGE_INBOX_RESOURCE, {
    meta: { errorMode: 'silent' },
    mutationFn: (identity: MessageIdentity) => {
      assertServerStateScopeCurrent(identity)
      return markAllMessagesRead()
    },
    onSuccess: async (_response, identity) => {
      if (!isServerStateScopeCurrent(identity)) return
      markAllCachedMessagesRead(queryClient, identity, new Date().toISOString())
      if (!isServerStateScopeCurrent(identity)) return
      queryClient.setQueryData<number>(messageUnreadQueryKey(identity), 0)
      await Promise.all([
        invalidateMessageInbox(queryClient, identity),
        isServerStateScopeCurrent(identity)
          ? queryClient.invalidateQueries({ queryKey: messageUnreadQueryKey(identity) })
          : Promise.resolve(),
      ])
    },
  })
  const deleteMutation = useServerStateMutation(MESSAGE_INBOX_RESOURCE, {
    meta: { errorMode: 'silent' },
    mutationFn: (variables: DeleteVariables) => {
      assertServerStateScopeCurrent(variables)
      return deleteReceivedMessages(variables.ids)
    },
    onSuccess: async (response, variables) => {
      if (!isServerStateScopeCurrent(variables)) return
      removeCachedMessages(queryClient, variables)
      if (response.data !== variables.ids.length) {
        await Promise.all([
          invalidateMessageInbox(queryClient, variables),
          isServerStateScopeCurrent(variables)
            ? queryClient.invalidateQueries({ queryKey: messageUnreadQueryKey(variables) })
            : Promise.resolve(),
        ])
      }
    },
  })

  async function acknowledge(
    ids: readonly string[],
    expectedScope: ServerStateScope,
  ): Promise<void> {
    const identity = expectedMessageIdentity(expectedScope)
    const normalized = normalizeMessageIds(ids, '确认')
    if (normalized.length === 0) return
    await acknowledgeMutation.mutateAsync({
      ...identity,
      ids: normalized,
    })
  }

  async function markRead(id: string, expectedScope: ServerStateScope): Promise<void> {
    const identity = expectedMessageIdentity(expectedScope)
    const message = findCachedMessage(queryClient, identity, id)
    if (message?.read_at) return
    await markReadMutation.mutateAsync({
      ...identity,
      id,
      wasUnread: message ? !message.read_at : undefined,
    })
  }

  async function markAllRead(expectedScope: ServerStateScope): Promise<void> {
    const identity = expectedMessageIdentity(expectedScope)
    if ((unreadQuery.data.value ?? 0) === 0) return
    await markAllReadMutation.mutateAsync(identity)
  }

  async function remove(ids: readonly string[], expectedScope: ServerStateScope): Promise<number> {
    const identity = expectedMessageIdentity(expectedScope)
    const normalized = normalizeMessageIds(ids, '删除')
    if (normalized.length === 0) return 0
    const response = await deleteMutation.mutateAsync({
      ...identity,
      ids: normalized,
    })
    return response.data ?? 0
  }

  async function refresh(expectedScope: ServerStateScope): Promise<void> {
    expectedMessageIdentity(expectedScope)
    await Promise.all([
      inboxQuery.refetch({ throwOnError: true }),
      unreadQuery.refetch({ throwOnError: true }),
    ])
    expectedMessageIdentity(expectedScope)
  }

  return {
    inboxQuery,
    unreadQuery,
    inboxData: inboxQuery.data,
    unreadData: unreadQuery.data,
    inboxLoading: inboxQuery.isFetching,
    unreadLoading: unreadQuery.isFetching,
    mutating: computed(
      () =>
        acknowledgeMutation.isPending.value ||
        markReadMutation.isPending.value ||
        markAllReadMutation.isPending.value ||
        deleteMutation.isPending.value,
    ),
    acknowledge,
    markRead,
    markAllRead,
    remove,
    refresh,
  }
}
