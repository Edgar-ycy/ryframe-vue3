import type { MaybeRefOrGetter } from 'vue'
import type { ExportJob } from '@/api/modules/exportJob'

export const ACTIVE_REFRESH_INTERVAL_MS = 5_000
export const MAX_CONCURRENT_DETAILS = 4

export interface ExportJobTransition {
  previous: ExportJob
  current: ExportJob
}

export interface ExportJobTrackerOptions {
  enabled?: MaybeRefOrGetter<boolean>
  onTransition?: (previous: ExportJob, current: ExportJob) => void
}
