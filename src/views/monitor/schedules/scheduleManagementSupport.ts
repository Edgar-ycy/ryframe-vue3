import type {
  CreateScheduleBody,
  JobScheduleRecord,
  ScheduleQuery,
  UpdateScheduleBody,
} from '@/api/modules/monitor'
import type { ServerStateScope } from '@/shared/query/scope'

export type ScheduleSavePayload = CreateScheduleBody | UpdateScheduleBody
export type CreateScheduleCommand = { data: CreateScheduleBody; scope: ServerStateScope }
export type UpdateScheduleCommand = {
  id: string
  data: UpdateScheduleBody
  scope: ServerStateScope
}
export type ScheduleStatusCommand = {
  row: JobScheduleRecord
  enabled: boolean
  scope: ServerStateScope
}
export type ScheduleRowCommand = { row: JobScheduleRecord; scope: ServerStateScope }
export type RunSchedulePayload = ScheduleRowCommand & { idempotencyKey: string }

export const BUILT_IN_TARGET_LABELS: Record<string, string> = {
  'system.export_result_cleanup': 'monitor.schedules.targetExportResultCleanup',
  'system.message_retention_cleanup': 'monitor.schedules.targetMessageRetentionCleanup',
}

export function normalizeQueryParams(params: ScheduleQuery): ScheduleQuery {
  const name = params.name?.trim()
  const handlerKey = params.handler_key?.trim()
  return {
    ...params,
    name: name || undefined,
    handler_key: handlerKey || undefined,
    enabled: typeof params.enabled === 'boolean' ? params.enabled : undefined,
  }
}

export function isUpdatePayload(payload: ScheduleSavePayload): payload is UpdateScheduleBody {
  return 'version' in payload
}
