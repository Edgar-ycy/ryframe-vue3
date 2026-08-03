import request from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id, PageResponse } from '@/shared/http/types'

const BASE = '/system/notices'

export type NoticeQuery = OperationQuery<'get_system_notices'>
export type NoticeCreateInput = OperationJsonBody<'post_system_notices'>
export type NoticeUpdateInput = OperationJsonBody<'put_system_notices_by_id'>
export type NoticeRecord = ApiSchema<'NoticeVo'>

export function listNotice(params: NoticeQuery, signal?: AbortSignal) {
  return request<PageResponse<NoticeRecord>>({ url: BASE, method: 'get', params, signal })
}
export function getNotice(id: Id, signal?: AbortSignal) {
  return request<NoticeRecord>({ url: `${BASE}/${id}`, method: 'get', signal })
}
export function createNotice(data: NoticeCreateInput) { return request<NoticeRecord>({ url: BASE, method: 'post', data }) }
export function updateNotice(id: Id, data: NoticeUpdateInput) { return request<NoticeRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteNotice(id: Id) { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }
export function publishNoticeToMessageCenter(id: Id) {
  return request({ url: `${BASE}/${id}/publish-message`, method: 'post' })
}
