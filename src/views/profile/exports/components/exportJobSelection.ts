import type { ExportJob } from '@/api/modules/exportJob'

export function terminalExportJobIds(
  jobs: readonly ExportJob[],
  canDelete: (status: string) => boolean,
): string[] {
  return jobs.filter((job) => canDelete(job.status)).map((job) => job.id)
}

export function areAllExportJobsSelected(
  visibleIds: readonly string[],
  selectedIds: readonly string[],
): boolean {
  return visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
}

export function areSomeExportJobsSelected(
  visibleIds: readonly string[],
  selectedIds: readonly string[],
): boolean {
  const selectedCount = visibleIds.filter((id) => selectedIds.includes(id)).length
  return selectedCount > 0 && selectedCount < visibleIds.length
}

export function updateExportJobSelection(
  selectedIds: readonly string[],
  jobId: string,
  checked: boolean,
): string[] {
  if (checked) {
    return selectedIds.includes(jobId) ? [...selectedIds] : [...selectedIds, jobId]
  }
  return selectedIds.filter((id) => id !== jobId)
}

export function updateVisibleExportJobSelection(
  selectedIds: readonly string[],
  visibleIds: readonly string[],
  checked: boolean,
): string[] {
  const visible = new Set(visibleIds)
  if (!checked) return selectedIds.filter((id) => !visible.has(id))

  const next = new Set(selectedIds)
  for (const id of visible) next.add(id)
  return Array.from(next)
}
