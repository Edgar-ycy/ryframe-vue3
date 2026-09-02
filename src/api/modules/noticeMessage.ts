import { post_system_notices_by_id_publish_message } from '@/api/generated/operations/system'
import type { Id } from '@/shared/http/types'

export function publishNoticeToMessageCenter(id: Id) {
  return post_system_notices_by_id_publish_message({ path: { id } })
}
