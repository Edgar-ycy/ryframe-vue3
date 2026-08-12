import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema } from '@/api/contract'

export type ExportJob = ApiSchema<'ExportJobVo'>

/** 创建导出任务；幂等键由上层按同一导出意图复用。 */
export function requestExportJob(
  url: string,
  filters: unknown,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return request<ExportJob>({
    url,
    method: 'post',
    data: filters,
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}

/** 查询当前申请人最近一百条导出任务。 */
export function listExportJobs(signal?: AbortSignal) {
  return request<ExportJob[]>({ url: '/common/jobs', method: 'get', signal })
}

/** 查询导出任务的最新状态。 */
export function getExportJob(id: string, signal?: AbortSignal) {
  return request<ExportJob>({ url: `/common/jobs/${id}`, method: 'get', signal })
}

/** 下载已完成且未过期的导出文件。 */
export function downloadExportJob(id: string, signal?: AbortSignal) {
  return requestBlob({ url: `/common/jobs/${id}/download`, method: 'get', signal })
}

/** 取消仍在排队或执行中的导出任务。 */
export function cancelExportJob(id: string, signal?: AbortSignal) {
  return request<ExportJob>({
    url: `/common/jobs/${id}/cancel`,
    method: 'post',
    data: {},
    signal,
  })
}
