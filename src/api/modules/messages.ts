import { requestOperation } from '@/api/operationRequest'
import {
  get_system_messages,
  get_system_messages_unread_count,
  post_auth_ws_ticket,
  post_system_messages_ack,
  post_system_messages_delete,
  put_system_messages_by_id_read,
  put_system_messages_read_all,
} from '@/api/generated/operations'
import type { ApiSchema, OperationData, OperationJsonBody, OperationQuery } from '@/api/contract'

export type MessageRecord = ApiSchema<'MessageVo'>
export type MessageInboxQuery = OperationQuery<'get_system_messages'>
export type MessageInboxPage = ApiSchema<'MessageInboxPage'>
export type AcknowledgeMessagesInput = OperationJsonBody<'post_system_messages_ack'>
export type DeleteMessagesInput = OperationJsonBody<'post_system_messages_delete'>
export type WebSocketTicket = OperationData<'post_auth_ws_ticket'>

/** 获取当前用户的消息收件箱。 */
export function listMessages(params: MessageInboxQuery, signal: AbortSignal) {
  return requestOperation(get_system_messages, { params, signal })
}

/** 获取服务端权威的未读消息数量。 */
export function getUnreadMessageCount(signal: AbortSignal) {
  return requestOperation(get_system_messages_unread_count, { signal })
}

/** 批量确认消息已被客户端接收。 */
export function acknowledgeMessages(ids: AcknowledgeMessagesInput['ids']) {
  return requestOperation(post_system_messages_ack, { data: { ids } })
}

/** 软删除当前用户收件箱中的消息，不影响其他收件人。 */
export function deleteMessages(ids: DeleteMessagesInput['ids']) {
  return requestOperation(post_system_messages_delete, { data: { ids } })
}

/** 将单条消息标记为已读。 */
export function markMessageRead(id: string) {
  return requestOperation(put_system_messages_by_id_read, { path: { id } })
}

/** 将当前用户的全部未读消息标记为已读。 */
export function markAllMessagesRead() {
  return requestOperation(put_system_messages_read_all, {})
}

/** 申请仅能消费一次的短期 WebSocket 票据。 */
export function getMessageWebSocketTicket() {
  return requestOperation(post_auth_ws_ticket, {})
}
