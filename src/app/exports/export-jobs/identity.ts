import { toValue, type MaybeRefOrGetter } from 'vue'
import { getServerStateScope } from '@/shared/query/client'
import { sameServerStateScope, type ServerStateScope } from '@/shared/query/scope'
import { useUserStore } from '@/stores/user'

export function currentExportJobScope(): ServerStateScope | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) return undefined
  const active = getServerStateScope()
  if (!active || active.tenantId !== user.tenantId || active.subjectId !== String(user.userId))
    return undefined
  return {
    tenantId: active.tenantId,
    subjectId: active.subjectId,
    sessionEpoch: active.sessionEpoch,
  }
}

export function sameExportJobScope(left: ServerStateScope, right: ServerStateScope): boolean {
  return sameServerStateScope(left, right)
}

export function shouldEnableExportJobs(enabled: MaybeRefOrGetter<boolean>): boolean {
  return toValue(enabled) && currentExportJobScope() !== undefined
}
