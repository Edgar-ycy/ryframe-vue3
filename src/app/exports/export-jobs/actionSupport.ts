import { HttpError } from '@/shared/http/client'
import type { ServerStateScope } from '@/shared/query/scope'

const activeJobActions = new Set<string>()

function jobActionKey(scope: ServerStateScope, jobId: string): string {
  return `${scope.tenantId}\u0000${scope.subjectId}\u0000${scope.sessionEpoch}\u0000${jobId}`
}

export function reserveJobActions(scope: ServerStateScope, jobIds: readonly string[]): boolean {
  const keys = jobIds.map((jobId) => jobActionKey(scope, jobId))
  if (keys.some((key) => activeJobActions.has(key))) return false
  for (const key of keys) activeJobActions.add(key)
  return true
}

export function releaseJobActions(scope: ServerStateScope, jobIds: readonly string[]): void {
  for (const jobId of jobIds) activeJobActions.delete(jobActionKey(scope, jobId))
}

export function jobActionIsReserved(scope: ServerStateScope, jobId: string): boolean {
  return activeJobActions.has(jobActionKey(scope, jobId))
}

export function deletionRequestKey(scope: ServerStateScope, ids: readonly string[]): string {
  return `${scope.tenantId}\u0000${scope.subjectId}\u0000${scope.sessionEpoch}\u0000${ids.join('\u0000')}`
}

export function normalizeDeletionIds(jobIds: readonly string[], errorMessage: string): string[] {
  const ids = new Set<string>()
  for (const jobId of jobIds) {
    if (!jobId) throw new HttpError(errorMessage, { status: 400 })
    ids.add(jobId)
  }
  if (ids.size === 0 || ids.size > 100) throw new HttpError(errorMessage, { status: 400 })
  return Array.from(ids).sort()
}
