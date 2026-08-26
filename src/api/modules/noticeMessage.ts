import { post_system_notices_by_id_publish_message } from '@/api/generated/operations'
import { requestOperation } from '@/api/operationRequest'
import type { Id } from '@/shared/http/types'

export function publishNoticeToMessageCenter(id: Id) {
  return requestOperation(post_system_notices_by_id_publish_message, { path: { id } })
}
