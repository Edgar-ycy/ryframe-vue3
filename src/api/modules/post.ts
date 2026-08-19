import { requestOperation } from '@/api/operationRequest'
import {
  delete_system_posts_by_id,
  get_system_posts,
  get_system_posts_by_id,
  post_system_posts,
  post_system_posts_exports,
  put_system_posts_by_id,
} from '@/api/generated/operations'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { stripPagination, type Id } from '@/shared/http/types'

export type PostQuery = OperationQuery<'get_system_posts'>
type PostExportQuery = Omit<PostQuery, 'page' | 'page_size'> & OperationJsonBody<'post_system_posts_exports'>
export type PostCreateInput = OperationJsonBody<'post_system_posts'>
export type PostUpdateInput = OperationJsonBody<'put_system_posts_by_id'>
export type PostRecord = ApiSchema<'PostVo'>

export function listPost(params: PostQuery, signal?: AbortSignal) {
  return requestOperation(get_system_posts, { params, signal })
}
export function exportPost(
  params: PostExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation(post_system_posts_exports, {
    data: stripPagination(params),
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}
export function getPost(id: Id, signal?: AbortSignal) {
  return requestOperation(get_system_posts_by_id, { path: { id }, signal })
}
export function createPost(data: PostCreateInput) {
  return requestOperation(post_system_posts, { data })
}
export function updatePost(id: Id, data: PostUpdateInput) {
  return requestOperation(put_system_posts_by_id, { path: { id }, data })
}
export function deletePost(id: Id) {
  return requestOperation(delete_system_posts_by_id, { path: { id } })
}
