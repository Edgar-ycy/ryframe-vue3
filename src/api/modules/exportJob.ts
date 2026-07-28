import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema } from '@/api/contract'

export type ExportJob = ApiSchema<'ExportJobVo'>

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `export-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 创建导出任务。每次用户操作都使用独立幂等键，网络重试由 HTTP 层安全复用。 */
export function requestExportJob(url: string, filters: unknown) {
  return request<ExportJob>({
    url,
    method: 'post',
    data: filters,
    headers: { 'Idempotency-Key': idempotencyKey() },
  })
}

/** 查询导出任务的最新状态。 */
export function getExportJob(id: string) {
  return request<ExportJob>({ url: `/common/jobs/${id}`, method: 'get' })
}

/** 下载已完成且未过期的导出文件。 */
export function downloadExportJob(id: string) {
  return requestBlob({ url: `/common/jobs/${id}/download`, method: 'get' })
}

/** 取消仍在排队或执行中的导出任务。 */
export function cancelExportJob(id: string) {
  return request<ExportJob>({ url: `/common/jobs/${id}/cancel`, method: 'post', data: {} })
}
