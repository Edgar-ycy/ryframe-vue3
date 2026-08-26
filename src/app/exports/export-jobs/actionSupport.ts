import { HttpError } from '@/shared/http/client'
import type { ExportJobIdentity } from '../exportJobCache'

const activeJobActions = new Set<string>()

function jobActionKey(identity: ExportJobIdentity, jobId: string): string {
  return `${identity.tenantId}\u0000${identity.userId}\u0000${jobId}`
}

export function reserveJobActions(identity: ExportJobIdentity, jobIds: readonly string[]): boolean {
  const keys = jobIds.map((jobId) => jobActionKey(identity, jobId))
  if (keys.some((key) => activeJobActions.has(key))) return false
  for (const key of keys) activeJobActions.add(key)
  return true
}

export function releaseJobActions(identity: ExportJobIdentity, jobIds: readonly string[]): void {
  for (const jobId of jobIds) activeJobActions.delete(jobActionKey(identity, jobId))
}

export function jobActionIsReserved(identity: ExportJobIdentity, jobId: string): boolean {
  return activeJobActions.has(jobActionKey(identity, jobId))
}

export function deletionRequestKey(identity: ExportJobIdentity, ids: readonly string[]): string {
  return `${identity.tenantId}\u0000${identity.userId}\u0000${ids.join('\u0000')}`
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
