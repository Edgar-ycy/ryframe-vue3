import { requestOperation } from '@/api/operationRequest'
import {
  delete_system_notices_by_id,
  get_system_notices,
  get_system_notices_by_id,
  post_system_notices,
  post_system_notices_by_id_publish_message,
  put_system_notices_by_id,
} from '@/api/generated/operations'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id } from '@/shared/http/types'

export type NoticeQuery = OperationQuery<'get_system_notices'>
export type NoticeCreateInput = OperationJsonBody<'post_system_notices'>
export type NoticeUpdateInput = OperationJsonBody<'put_system_notices_by_id'>
export type NoticeRecord = ApiSchema<'NoticeVo'>

export function listNotice(params: NoticeQuery, signal?: AbortSignal) {
  return requestOperation(get_system_notices, { params, signal })
}
export function getNotice(id: Id, signal?: AbortSignal) {
  return requestOperation(get_system_notices_by_id, { path: { id }, signal })
}
export function createNotice(data: NoticeCreateInput) {
  return requestOperation(post_system_notices, { data })
}
export function updateNotice(id: Id, data: NoticeUpdateInput) {
  return requestOperation(put_system_notices_by_id, { path: { id }, data })
}
export function deleteNotice(id: Id) {
  return requestOperation(delete_system_notices_by_id, { path: { id } })
}
export function publishNoticeToMessageCenter(id: Id) {
  return requestOperation(post_system_notices_by_id_publish_message, { path: { id } })
}
