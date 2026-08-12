import request from '@/shared/http/client'
import { requestExportJob } from './exportJob'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id, type PageResponse } from '@/shared/http/types'

const BASE = '/system/posts'

export type PostQuery = OperationQuery<'get_system_posts'>
type PostExportQuery = Omit<PostQuery, 'page' | 'page_size'> & OperationJsonBody<'post_system_posts_exports'>
export type PostCreateInput = OperationJsonBody<'post_system_posts'>
export type PostUpdateInput = OperationJsonBody<'put_system_posts_by_id'>
export type PostRecord = ApiSchema<'PostVo'>

export function listPost(params: PostQuery, signal?: AbortSignal) {
  return request<PageResponse<PostRecord>>({ url: BASE, method: 'get', params, signal })
}
export function exportPost(
  params: PostExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestExportJob(`${BASE}/exports`, stripPagination(params), idempotencyKey, signal)
}
export function getPost(id: Id, signal?: AbortSignal) {
  return request<PostRecord>({ url: `${BASE}/${id}`, method: 'get', signal })
}
export function createPost(data: PostCreateInput)    { return request<PostRecord>({ url: BASE, method: 'post', data }) }
export function updatePost(id: Id, data: PostUpdateInput) { return request<PostRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deletePost(id: Id)        { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }
