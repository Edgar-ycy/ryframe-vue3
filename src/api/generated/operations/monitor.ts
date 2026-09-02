/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

import { bindJsonOperation, bindTextOperation } from '@/api/operationRequest'

export const delete_monitor_schedules_by_id = bindJsonOperation({"operationId":"delete_monitor_schedules_by_id","method":"delete","path":"/monitor/schedules/{id}"})
export const get_monitor_cache = bindJsonOperation({"operationId":"get_monitor_cache","method":"get","path":"/monitor/cache"})
export const get_monitor_cache_commands = bindJsonOperation({"operationId":"get_monitor_cache_commands","method":"get","path":"/monitor/cache/commands"})
export const get_monitor_db_pool = bindJsonOperation({"operationId":"get_monitor_db_pool","method":"get","path":"/monitor/db-pool"})
export const get_monitor_jobs = bindJsonOperation({"operationId":"get_monitor_jobs","method":"get","path":"/monitor/jobs"})
export const get_monitor_jobs_stats = bindJsonOperation({"operationId":"get_monitor_jobs_stats","method":"get","path":"/monitor/jobs/stats"})
export const get_monitor_metrics = bindTextOperation({"operationId":"get_monitor_metrics","method":"get","path":"/monitor/metrics"})
export const get_monitor_overview = bindJsonOperation({"operationId":"get_monitor_overview","method":"get","path":"/monitor/overview"})
export const get_monitor_overview_trends = bindJsonOperation({"operationId":"get_monitor_overview_trends","method":"get","path":"/monitor/overview/trends"})
export const get_monitor_retention = bindJsonOperation({"operationId":"get_monitor_retention","method":"get","path":"/monitor/retention"})
export const get_monitor_retention_runs = bindJsonOperation({"operationId":"get_monitor_retention_runs","method":"get","path":"/monitor/retention/runs"})
export const get_monitor_runtime = bindJsonOperation({"operationId":"get_monitor_runtime","method":"get","path":"/monitor/runtime"})
export const get_monitor_schedules = bindJsonOperation({"operationId":"get_monitor_schedules","method":"get","path":"/monitor/schedules"})
export const get_monitor_schedules_by_id = bindJsonOperation({"operationId":"get_monitor_schedules_by_id","method":"get","path":"/monitor/schedules/{id}"})
export const get_monitor_schedules_by_id_executions = bindJsonOperation({"operationId":"get_monitor_schedules_by_id_executions","method":"get","path":"/monitor/schedules/{id}/executions"})
export const get_monitor_schedules_targets = bindJsonOperation({"operationId":"get_monitor_schedules_targets","method":"get","path":"/monitor/schedules/targets"})
export const get_monitor_server = bindJsonOperation({"operationId":"get_monitor_server","method":"get","path":"/monitor/server"})
export const post_monitor_jobs_by_id_retry = bindJsonOperation({"operationId":"post_monitor_jobs_by_id_retry","method":"post","path":"/monitor/jobs/{id}/retry"})
export const post_monitor_retention_preview = bindJsonOperation({"operationId":"post_monitor_retention_preview","method":"post","path":"/monitor/retention/preview"})
export const post_monitor_retention_run = bindJsonOperation({"operationId":"post_monitor_retention_run","method":"post","path":"/monitor/retention/run"})
export const post_monitor_schedules = bindJsonOperation({"operationId":"post_monitor_schedules","method":"post","path":"/monitor/schedules"})
export const post_monitor_schedules_by_id_run = bindJsonOperation({"operationId":"post_monitor_schedules_by_id_run","method":"post","path":"/monitor/schedules/{id}/run"})
export const post_monitor_schedules_preview = bindJsonOperation({"operationId":"post_monitor_schedules_preview","method":"post","path":"/monitor/schedules/preview"})
export const put_monitor_schedules_by_id = bindJsonOperation({"operationId":"put_monitor_schedules_by_id","method":"put","path":"/monitor/schedules/{id}"})
export const put_monitor_schedules_by_id_status = bindJsonOperation({"operationId":"put_monitor_schedules_by_id_status","method":"put","path":"/monitor/schedules/{id}/status"})
