import request from '@/api/request'

const BASE = '/system/jobs'

export interface JobQuery {
  [key: string]: any
  page?: number
  pageSize?: number
}

export interface JobForm {
  [key: string]: any
  name: string
  cron_expr: string
  group_name?: string
  misfire_policy?: string
  concurrent?: string
  status?: string
  remark?: string
}

/** 分页查询定时任务 */
export function listJob(params: JobQuery) {
  return request({ url: `${BASE}/list`, method: 'get', params })
}

/** 创建定时任务 */
export function createJob(data: JobForm) {
  return request({ url: BASE, method: 'post', data })
}

/** 更新定时任务 */
export function updateJob(id: number, data: Partial<JobForm>) {
  return request({ url: `${BASE}/${id}`, method: 'put', data })
}

/** 删除定时任务 */
export function deleteJob(id: number) {
  return request({ url: `${BASE}/${id}`, method: 'delete' })
}

/** 立即触发一次 */
export function runJob(id: number) {
  return request({ url: `${BASE}/${id}/trigger`, method: 'post' })
}

/** 暂停任务 */
export function pauseJob(id: number) {
  return request({ url: `${BASE}/${id}/pause`, method: 'post' })
}

/** 恢复任务 */
export function resumeJob(id: number) {
  return request({ url: `${BASE}/${id}/resume`, method: 'post' })
}

// ========== 调度日志 ==========

export interface JobLogQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  job_name?: string
  status?: string
}

/** 分页查询调度日志 */
export function listJobLog(params: JobLogQuery) {
  return request({ url: `${BASE}/logs`, method: 'get', params })
}

/** 清空调度日志 */
export function clearJobLog() {
  return request({ url: `${BASE}/logs`, method: 'delete' })
}
