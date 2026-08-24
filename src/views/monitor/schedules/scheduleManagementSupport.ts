import type {
  CreateScheduleBody,
  JobScheduleRecord,
  ScheduleQuery,
  UpdateScheduleBody,
} from '@/api/modules/monitor'

export type ScheduleSavePayload = CreateScheduleBody | UpdateScheduleBody
export type RunSchedulePayload = { row: JobScheduleRecord, idempotencyKey: string }

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

export function isUpdatePayload(
  payload: ScheduleSavePayload,
): payload is UpdateScheduleBody {
  return 'version' in payload
}
