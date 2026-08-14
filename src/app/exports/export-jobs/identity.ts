import { toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@/stores/user'
import type { ExportJobIdentity } from '../exportJobCache'

export function currentExportJobIdentity(): ExportJobIdentity | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) return undefined
  return { tenantId: user.tenantId, userId: String(user.userId) }
}

export function sameExportJobIdentity(
  left: ExportJobIdentity,
  right: ExportJobIdentity,
): boolean {
  return left.tenantId === right.tenantId && left.userId === right.userId
}

export function shouldEnableExportJobs(enabled: MaybeRefOrGetter<boolean>): boolean {
  return toValue(enabled) && currentExportJobIdentity() !== undefined
}
