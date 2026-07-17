import request from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

const BASE = '/system/notices'

export type NoticeQuery = OperationQuery<'get_system_notices'>
type NoticeAllQuery = OperationQuery<'get_system_notices_all'>
export type NoticeCreateInput = OperationJsonBody<'post_system_notices'>
export type NoticeUpdateInput = OperationJsonBody<'put_system_notices_by_id'>
export type NoticeRecord = ApiSchema<'NoticeVo'>

export function listNotice(params: NoticeQuery) { return request<NoticeRecord[]>({ url: BASE, method: 'get', params }) }
export function listNoticeNoPage(params?: NoticeAllQuery) {
  return request<NoticeRecord[]>({
    url: `${BASE}/all`, method: 'get', params: stripPagination(params),
  })
}
export function getNotice(id: Id) { return request<NoticeRecord>({ url: `${BASE}/${id}`, method: 'get' }) }
export function createNotice(data: NoticeCreateInput) { return request<NoticeRecord>({ url: BASE, method: 'post', data }) }
export function updateNotice(id: Id, data: NoticeUpdateInput) { return request<NoticeRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteNotice(id: Id) { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }
