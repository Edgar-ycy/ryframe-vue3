import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import {
  deleteMessages as deleteReceivedMessages,
  getUnreadMessageCount,
  markAllMessagesRead,
  markMessageRead,
  type MessageInboxPage,
  type MessageInboxQuery,
} from '@/api/modules/messages'
import { HttpError } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import {
  type DeleteVariables,
  findCachedMessage,
  invalidateUserInbox,
  markAllCachedMessagesRead,
  markCachedMessageRead,
  MESSAGE_INBOX_RESOURCE,
  MESSAGE_UNREAD_RESOURCE,
  type MessageIdentity,
  messageInboxKeyParams,
  messageUnreadQueryKey,
  removeCachedMessages,
  setUnreadCount,
  type MarkReadVariables,
} from './messageCache'
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
  if (
    userStore.sessionStatus !== 'authenticated'
    || !userStore.tenantId
    || !userStore.userId
  ) {
    throw new HttpError('消息会话尚未就绪', { status: 401, kind: 'http' })
  }
  return { tenantId: userStore.tenantId, userId: String(userStore.userId) }
}

/** 消息中心状态统一由 Vue Query 管理，实时投递与显式补拉负责更新缓存。 */
export function useMessageCenterQueries(
  query: MaybeRefOrGetter<MessageInboxQuery>,
) {
  const userStore = useUserStore()

  function isMessageSessionActive(): boolean {
    return userStore.sessionStatus === 'authenticated'
      && Boolean(userStore.tenantId)
      && Boolean(userStore.userId)
  }

  function currentUserId(): string {
    return String(userStore.userId || '')
  }

  const inboxQuery = useTenantQuery<MessageInboxPage>(
    () => userStore.tenantId,
    isMessageSessionActive,
    MESSAGE_INBOX_RESOURCE,
    () => messageInboxKeyParams(currentUserId(), toValue(query)),
    async (signal) => {
      const tenantId = userStore.tenantId
      const requestedUserId = currentUserId()
      const requestedQuery = toValue(query)
      return fetchMessageInboxPage(
        queryClient,
        tenantId,
        requestedUserId,
        requestedQuery,
        signal,
      )
    },
    MESSAGE_QUERY_POLICY,
  )
  const unreadQuery = useTenantQuery<number>(
    () => userStore.tenantId,
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

  const acknowledgeMutation = useMutation(acknowledgeMutationOptions(queryClient))
  const markReadMutation = useMutation({
    meta: { errorMode: 'silent' },
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
    meta: { errorMode: 'silent' },
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
  const deleteMutation = useMutation({
    mutationKey: ['message-delete'],
    meta: { errorMode: 'silent' },
    mutationFn: (variables: DeleteVariables) => deleteReceivedMessages(variables.ids),
    onSuccess: async (response, variables) => {
      removeCachedMessages(queryClient, variables)
      if (response.data !== variables.ids.length) {
        await Promise.all([
          invalidateUserInbox(queryClient, variables.tenantId, variables.userId),
          queryClient.invalidateQueries({
            queryKey: messageUnreadQueryKey(variables.tenantId, variables.userId),
          }),
        ])
      }
    },
  })

  async function acknowledge(ids: readonly string[]): Promise<void> {
    const normalized = normalizeMessageIds(ids, '确认')
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

  async function remove(ids: readonly string[]): Promise<number> {
    const normalized = normalizeMessageIds(ids, '删除')
    if (normalized.length === 0) return 0
    const response = await deleteMutation.mutateAsync({
      ...currentMessageIdentity(),
      ids: normalized,
    })
    return response.data ?? 0
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
    inboxData: inboxQuery.data,
    unreadData: unreadQuery.data,
    inboxLoading: inboxQuery.isFetching,
    unreadLoading: unreadQuery.isFetching,
    mutating: computed(() => (
      acknowledgeMutation.isPending.value
      || markReadMutation.isPending.value
      || markAllReadMutation.isPending.value
      || deleteMutation.isPending.value
    )),
    acknowledge,
    markRead,
    markAllRead,
    remove,
    refresh,
  }
}
