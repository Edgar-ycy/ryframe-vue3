import request from '@/shared/http/client'
import type {
  ApiSchema,
  OperationData,
  OperationJsonBody,
  OperationQuery,
} from '@/api/contract'

const BASE = '/system/messages'

export type MessageRecord = ApiSchema<'MessageVo'>
export type MessageInboxQuery = OperationQuery<'get_system_messages'>
export type MessageInboxPage = ApiSchema<'MessageInboxPage'>
export type AcknowledgeMessagesInput = OperationJsonBody<'post_system_messages_ack'>
export type DeleteMessagesInput = OperationJsonBody<'post_system_messages_delete'>
export type WebSocketTicket = OperationData<'post_auth_ws_ticket'>

/** 获取当前用户的消息收件箱。 */
export function listMessages(params: MessageInboxQuery, signal: AbortSignal) {
  return request<MessageInboxPage>({ url: BASE, method: 'get', params, signal })
}

/** 获取服务端权威的未读消息数量。 */
export function getUnreadMessageCount(signal: AbortSignal) {
  return request<OperationData<'get_system_messages_unread_count'>>({
    url: `${BASE}/unread-count`, method: 'get', signal,
  })
}

/** 批量确认消息已被客户端接收。 */
export function acknowledgeMessages(ids: AcknowledgeMessagesInput['ids']) {
  return request<OperationData<'post_system_messages_ack'>>({
    url: `${BASE}/ack`, method: 'post', data: { ids },
  })
}

/** 软删除当前用户收件箱中的消息，不影响其他收件人。 */
export function deleteMessages(ids: DeleteMessagesInput['ids']) {
  return request<OperationData<'post_system_messages_delete'>>({
    url: `${BASE}/delete`, method: 'post', data: { ids },
  })
}

/** 将单条消息标记为已读。 */
export function markMessageRead(id: string) {
  return request<void>({
    url: `${BASE}/${encodeURIComponent(id)}/read`, method: 'put',
  })
}

/** 将当前用户的全部未读消息标记为已读。 */
export function markAllMessagesRead() {
  return request<OperationData<'put_system_messages_read_all'>>({
    url: `${BASE}/read-all`, method: 'put',
  })
}

/** 申请仅能消费一次的短期 WebSocket 票据。 */
export function getMessageWebSocketTicket() {
  return request<WebSocketTicket>({ url: '/auth/ws-ticket', method: 'post' })
}
