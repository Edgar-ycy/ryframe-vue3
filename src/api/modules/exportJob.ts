import type { ApiSchema, OperationJsonBody } from '@/api/contract'
import { requestBlobOperation, requestOperation } from '@/api/operationRequest'
import {
  get_common_jobs,
  get_common_jobs_by_id,
  get_common_jobs_by_id_download,
  get_common_jobs_notifications_unread_count,
  post_common_jobs_by_id_cancel,
  post_common_jobs_notifications_read,
} from '@/api/generated/operations'

export type ExportJob = ApiSchema<'ExportJobVo'>
export type MarkExportNotificationsReadInput =
  OperationJsonBody<'post_common_jobs_notifications_read'>

/** 查询当前申请人最近一百条导出任务。 */
export function listExportJobs(signal?: AbortSignal) {
  return requestOperation(get_common_jobs, { signal })
}

/** 查询当前申请人尚未查看的完成或失败提醒数量。 */
export function getUnreadExportNotificationCount(signal?: AbortSignal) {
  return requestOperation(get_common_jobs_notifications_unread_count, { signal })
}

/** 确认当前申请人已经实际看到的完成或失败任务。 */
export function markExportNotificationsRead(
  ids: MarkExportNotificationsReadInput['ids'],
  signal?: AbortSignal,
) {
  return requestOperation(post_common_jobs_notifications_read, {
    data: { ids },
    signal,
  })
}

/** 查询导出任务的最新状态。 */
export function getExportJob(id: string, signal?: AbortSignal) {
  return requestOperation(get_common_jobs_by_id, { path: { id }, signal })
}

/** 下载已完成且未过期的导出文件。 */
export function downloadExportJob(id: string, signal?: AbortSignal) {
  return requestBlobOperation(get_common_jobs_by_id_download, { path: { id }, signal })
}

/** 取消仍在排队或执行中的导出任务。 */
export function cancelExportJob(id: string, signal?: AbortSignal) {
  return requestOperation(post_common_jobs_by_id_cancel, { path: { id }, data: {}, signal })
}
