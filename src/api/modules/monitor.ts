import request, { requestText } from '@/shared/http/client'
import { requestExportJob } from './exportJob'
import type { ApiSchema, OperationData, OperationJsonBody, OperationQuery } from '@/api/contract'
import { requestOperation } from '@/api/operationRequest'
import {
  delete_monitor_schedules_by_id,
  get_monitor_jobs,
  get_monitor_jobs_stats,
  get_monitor_overview,
  get_monitor_overview_trends,
  get_monitor_retention,
  get_monitor_retention_runs,
  get_monitor_schedules,
  get_monitor_schedules_by_id,
  get_monitor_schedules_by_id_executions,
  get_monitor_schedules_targets,
  post_monitor_jobs_by_id_retry,
  post_monitor_retention_preview,
  post_monitor_retention_run,
  post_monitor_schedules,
  post_monitor_schedules_by_id_run,
  post_monitor_schedules_preview,
  put_monitor_schedules_by_id,
  put_monitor_schedules_by_id_status,
} from '@/api/generated/operations'
import { stripPagination, type PageResponse } from '@/shared/http/types'

// ========== 服务器监控 (/monitor) ==========

export type ServerInfo = ApiSchema<'ServerInfo'>
export type CacheInfo = ApiSchema<'CacheInfo'>
export type CacheCommandStats = OperationData<'get_monitor_cache_commands'>
export type DbPoolInfo = ApiSchema<'DbPoolInfo'>
export type RuntimeStatus = ApiSchema<'RuntimeStatus'>

/** 获取服务器信息。 */
export function getServerInfo(signal?: AbortSignal) {
  return request<ServerInfo>({ url: '/monitor/server', method: 'get', signal })
}

/** 获取缓存统计。 */
export function getCacheInfo(signal?: AbortSignal) {
  return request<CacheInfo>({ url: '/monitor/cache', method: 'get', signal })
}

/** 获取 Redis 命令统计。 */
export function getCacheCommands(signal?: AbortSignal) {
  return request<CacheCommandStats>({
    url: '/monitor/cache/commands',
    method: 'get',
    signal,
  })
}

/** 获取数据库连接池状态。 */
export function getDbPool(signal?: AbortSignal) {
  return request<DbPoolInfo>({ url: '/monitor/db-pool', method: 'get', signal })
}

/** 获取主应用运行时组件状态。 */
export function getRuntimeStatus(signal?: AbortSignal) {
  return request<RuntimeStatus>({ url: '/monitor/runtime', method: 'get', signal })
}

/** 获取 Prometheus 指标文本。 */
export function getMetrics(signal?: AbortSignal) {
  return requestText({ url: '/monitor/metrics', method: 'get', signal })
}

// ========== 操作日志 (/system/operlogs) ==========

export type OperLogQuery = OperationQuery<'get_system_operlogs'>
export type OperLogRecord = ApiSchema<'OperLogVo'>

type LogExportFilters = {
  name?: string
  status?: string
  begin_time?: string
  end_time?: string
}
type OperLogExportQuery = LogExportFilters & OperationJsonBody<'post_system_operlogs_exports'>

/** 分页获取操作日志。 */
export function listOperLog(params: OperLogQuery, signal?: AbortSignal) {
  return request<PageResponse<OperLogRecord>>({
    url: '/system/operlogs',
    method: 'get',
    params,
    signal,
  })
}

/** 导出操作日志。 */
export function exportOperLog(
  params: OperLogExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestExportJob(
    '/system/operlogs/exports',
    stripPagination(params),
    idempotencyKey,
    signal,
  )
}

// ========== 登录日志 (/system/loginlogs) ==========

export type LoginLogQuery = OperationQuery<'get_system_loginlogs'>
type LoginLogExportQuery = LogExportFilters & OperationJsonBody<'post_system_loginlogs_exports'>
export type LoginLogRecord = ApiSchema<'LoginInfoVo'>

/** 分页获取登录日志。 */
export function listLoginLog(params: LoginLogQuery, signal?: AbortSignal) {
  return request<PageResponse<LoginLogRecord>>({
    url: '/system/loginlogs',
    method: 'get',
    params,
    signal,
  })
}

/** 导出登录日志。 */
export function exportLoginLog(
  params: LoginLogExportQuery | undefined,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestExportJob(
    '/system/loginlogs/exports',
    stripPagination(params),
    idempotencyKey,
    signal,
  )
}

// ========== 在线用户 (/system/online) ==========

export type OnlineUserQuery = OperationQuery<'get_system_online'>
export type OnlineUserRecord = ApiSchema<'OnlineUserVo'>

/** 分页获取在线用户。 */
export function listOnlineUser(params: OnlineUserQuery, signal?: AbortSignal) {
  return request<PageResponse<OnlineUserRecord>>({
    url: '/system/online',
    method: 'get',
    params,
    signal,
  })
}

/** 强制指定会话下线。 */
export function forceLogout(sid: string) {
  return request({ url: `/system/online/${encodeURIComponent(sid)}`, method: 'delete' })
}

// ========== 后台任务 (/monitor/jobs) ==========

export type BackgroundJobQuery = OperationQuery<'get_monitor_jobs'>
export type BackgroundJobRecord = ApiSchema<'BackgroundJobVo'>
export type BackgroundJobStats = ApiSchema<'BackgroundJobQueueStats'>

/** 分页获取当前租户可见的后台任务。 */
export function listBackgroundJobs(params: BackgroundJobQuery, signal?: AbortSignal) {
  return requestOperation(get_monitor_jobs, { params, signal })
}

/** 获取当前租户可见的后台任务统计。 */
export function getBackgroundJobStats(signal?: AbortSignal) {
  return requestOperation(get_monitor_jobs_stats, { signal })
}

/** 重新投递指定死信任务。 */
export function retryBackgroundJob(id: string) {
  return requestOperation(post_monitor_jobs_by_id_retry, { path: { id } })
}

// ========== 定时任务 (/monitor/schedules) ==========

export type ScheduleQuery = OperationQuery<'get_monitor_schedules'>
export type ScheduleExecutionQuery = OperationQuery<'get_monitor_schedules_by_id_executions'>
export type CreateScheduleBody = OperationJsonBody<'post_monitor_schedules'>
export type UpdateScheduleBody = OperationJsonBody<'put_monitor_schedules_by_id'>
export type UpdateScheduleStatusBody = OperationJsonBody<'put_monitor_schedules_by_id_status'>
export type ScheduleVersionBody = OperationJsonBody<'delete_monitor_schedules_by_id'>
export type SchedulePreviewBody = OperationJsonBody<'post_monitor_schedules_preview'>
export type JobScheduleRecord = ApiSchema<'JobScheduleVo'>
export type JobScheduleExecutionRecord = ApiSchema<'JobScheduleExecutionVo'>
export type JobSchedulePreview = ApiSchema<'JobSchedulePreview'>
export type JobScheduleOccurrence = ApiSchema<'JobScheduleOccurrence'>
export type ScheduleTargetRecord = ApiSchema<'ScheduleTargetVo'>

/** 获取当前租户可见的调度目标目录。 */
export function listScheduleTargets(signal?: AbortSignal) {
  return requestOperation(get_monitor_schedules_targets, { signal })
}

/** 预览未来五次执行时间。 */
export function previewSchedule(data: SchedulePreviewBody, signal?: AbortSignal) {
  return requestOperation(post_monitor_schedules_preview, { data, signal })
}

/** 分页获取定时任务。 */
export function listSchedules(params: ScheduleQuery, signal?: AbortSignal) {
  return requestOperation(get_monitor_schedules, { params, signal })
}

/** 获取定时任务详情。 */
export function getSchedule(id: string, signal?: AbortSignal) {
  return requestOperation(get_monitor_schedules_by_id, { path: { id }, signal })
}

/** 创建定时任务。 */
export function createSchedule(data: CreateScheduleBody) {
  return requestOperation(post_monitor_schedules, { data })
}

/** 更新定时任务。 */
export function updateSchedule(id: string, data: UpdateScheduleBody) {
  return requestOperation(put_monitor_schedules_by_id, { path: { id }, data })
}

/** 更新定时任务启停状态。 */
export function updateScheduleStatus(id: string, data: UpdateScheduleStatusBody) {
  return requestOperation(put_monitor_schedules_by_id_status, { path: { id }, data })
}

/** 软删除定时任务。 */
export function removeSchedule(id: string, data: ScheduleVersionBody) {
  return requestOperation(delete_monitor_schedules_by_id, { path: { id }, data })
}

/** 立即执行定时任务，幂等键由调用方按一次用户操作生成。 */
export function runSchedule(id: string, idempotencyKey: string) {
  return requestOperation(post_monitor_schedules_by_id_run, {
    path: { id },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

/** 分页获取定时任务执行历史。 */
export function listScheduleExecutions(
  id: string,
  params: ScheduleExecutionQuery,
  signal?: AbortSignal,
) {
  return requestOperation(get_monitor_schedules_by_id_executions, {
    path: { id },
    params,
    signal,
  })
}

// ========== 数据保留 (/monitor/retention) ==========

export type RetentionRunQuery = OperationQuery<'get_monitor_retention_runs'>
export type DataRetentionOverview = ApiSchema<'DataRetentionOverview'>
export type DataRetentionPreview = ApiSchema<'DataRetentionPreview'>
export type DataRetentionRunRecord = ApiSchema<'DataRetentionRunVo'>
export type DataRetentionPolicy = ApiSchema<'DataRetentionPolicy'>

/** 获取当前系统租户生效的数据保留策略。 */
export function getDataRetention(signal?: AbortSignal) {
  return requestOperation(get_monitor_retention, { signal })
}

/** 只统计当前策略可清理的数据，不执行删除。 */
export function previewDataRetention(signal?: AbortSignal) {
  return requestOperation(post_monitor_retention_preview, { data: {}, signal })
}

/** 人工入队一次数据保留任务。 */
export function runDataRetention(idempotencyKey: string) {
  return requestOperation(post_monitor_retention_run, {
    data: {},
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

/** 分页获取数据保留运行记录。 */
export function listDataRetentionRuns(params: RetentionRunQuery, signal?: AbortSignal) {
  return requestOperation(get_monitor_retention_runs, { params, signal })
}

// ========== 运维总览 (/monitor/overview) ==========

export type OverviewRange = '6h' | '24h' | '7d'
export type MonitorOverview = ApiSchema<'MonitorOverviewVo'>
export type MonitorOverviewTrends = ApiSchema<'MonitorOverviewTrendsVo'>
export type MonitorOverviewTrendBucket = ApiSchema<'MonitorOverviewTrendBucketVo'>

/** 获取严格按当前租户聚合的实时运维快照。 */
export function getMonitorOverview(signal?: AbortSignal) {
  return requestOperation(get_monitor_overview, { signal })
}

/** 获取固定时间桶、已补零的租户运维趋势。 */
export function getMonitorOverviewTrends(range: OverviewRange, signal?: AbortSignal) {
  return requestOperation(get_monitor_overview_trends, {
    params: { range },
    signal,
  })
}
