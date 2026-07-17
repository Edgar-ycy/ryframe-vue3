import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

const BASE = '/system/posts'

export type PostQuery = OperationQuery<'get_system_posts'>
type PostAllQuery = OperationQuery<'get_system_posts_all'>
type PostExportQuery = OperationQuery<'get_system_posts_export'>
export type PostCreateInput = OperationJsonBody<'post_system_posts'>
export type PostUpdateInput = OperationJsonBody<'put_system_posts_by_id'>
export type PostRecord = ApiSchema<'PostVo'>

export function listPost(params: PostQuery)  { return request<PostRecord[]>({ url: BASE, method: 'get', params }) }
export function listPostNoPage(params?: PostAllQuery) {
  return request<PostRecord[]>({
    url: `${BASE}/all`, method: 'get', params: stripPagination(params),
  })
}
export function exportPost(params?: PostExportQuery) {
  return requestBlob({ url: `${BASE}/export`, method: 'get', params: stripPagination(params) })
}
export function getPost(id: Id)           { return request<PostRecord>({ url: `${BASE}/${id}`, method: 'get' }) }
export function createPost(data: PostCreateInput)    { return request<PostRecord>({ url: BASE, method: 'post', data }) }
export function updatePost(id: Id, data: PostUpdateInput) { return request<PostRecord>({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deletePost(id: Id)        { return request<void>({ url: `${BASE}/${id}`, method: 'delete' }) }
