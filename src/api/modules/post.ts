import { post_system_posts_exports } from '@/api/generated/operations/system'
import type { OperationJsonBody } from '@/api/contract'
import { stripPagination } from '@/shared/http/types'

type PostExportQuery = OperationJsonBody<'post_system_posts_exports'>['filter']

export function exportPost(
  params: PostExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
  confirmAll = false,
) {
  return post_system_posts_exports({
    data: {
      filter: stripPagination(params) ?? {},
      confirm_all: confirmAll,
    },
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}
