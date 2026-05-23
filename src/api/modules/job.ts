import request from '@/api/request'

const BASE = '/system/jobs'

export interface JobQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  job_name?: string
  job_group?: string
  status?: string
}

export interface JobForm {
  [key: string]: any
  job_name: string
  job_group: string
  invoke_target: string
  cron_expression: string
  misfire_policy?: string
  concurrent?: string
  status?: string
  remark?: string
}

/** 分页查询定时任务 */
export function listJob(params: JobQuery) {
  return request({ url: `${BASE}/list`, method: 'get', params })
}

/** 查询定时任务详情 */
export function getJob(id: number) {
  return request({ url: `${BASE}/${id}`, method: 'get' })
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

/** 立即执行一次 */
export function runJob(id: number) {
  return request({ url: `${BASE}/${id}/run`, method: 'put' })
}

/** 暂停任务 */
export function pauseJob(id: number) {
  return request({ url: `${BASE}/${id}/pause`, method: 'put' })
}

/** 恢复任务 */
export function resumeJob(id: number) {
  return request({ url: `${BASE}/${id}/resume`, method: 'put' })
}

// ========== 调度日志 ==========

export interface JobLogQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  job_id?: number
  job_name?: string
  status?: string
}

/** 分页查询调度日志 */
export function listJobLog(params: JobLogQuery) {
  return request({ url: `${BASE}/logs/list`, method: 'get', params })
}

/** 清空调度日志 */
export function clearJobLog() {
  return request({ url: `${BASE}/logs/clean`, method: 'delete' })
}
