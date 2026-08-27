import type { QueryClient, QueryKey } from '@tanstack/vue-query'
import type { MessageInboxQuery } from '@/api/modules/messages'
import {
  serverStateQueryKeyForIdentity,
  serverStateResourcePrefixForIdentity,
} from '@/shared/query/client'

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
  return serverStateQueryKeyForIdentity(
    tenantId,
    userId,
    MESSAGE_INBOX_RESOURCE,
    messageInboxKeyParams(userId, query),
  )
}

export function messageUnreadQueryKey(tenantId: string, userId: string): QueryKey {
  return serverStateQueryKeyForIdentity(tenantId, userId, MESSAGE_UNREAD_RESOURCE, {
    user_id: userId,
  })
}

export function resourceQueryKey(tenantId: string, userId: string, resource: string): QueryKey {
  return serverStateResourcePrefixForIdentity(tenantId, userId, resource)
}

export function invalidateUserInbox(
  client: QueryClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  return client.invalidateQueries({
    queryKey: resourceQueryKey(tenantId, userId, MESSAGE_INBOX_RESOURCE),
    predicate: (query) => isInboxKeyForUser(query.queryKey, userId),
  })
}

export function isInboxKeyForUser(queryKey: QueryKey, userId: string): boolean {
  const params = queryKey[5]
  return isRecord(params) && params.user_id === userId
}

export function inboxParamsFromKey(queryKey: QueryKey): MessageInboxKeyParams | undefined {
  const params = queryKey[5]
  if (!isRecord(params)) return undefined
  if (
    typeof params.user_id !== 'string' ||
    !(typeof params.cursor === 'string' || params.cursor === null) ||
    typeof params.limit !== 'number' ||
    typeof params.unread_only !== 'boolean'
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
