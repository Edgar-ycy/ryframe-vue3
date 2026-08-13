import { nextTick } from 'vue'
import {
  copyServiceAccountQuery,
  sameServiceAccountPageQuery,
  useServiceAccountContext,
} from './useServiceAccountContext'

/** 服务访问审计的显式分页查询。 */
export function useServiceAccountAudits(context: ReturnType<typeof useServiceAccountContext>) {
  const {
    activeAuditsQueryParams, auditsQuery, auditsQueryParams,
    canListAudits, currentIdentity, pageActive,
  } = context

  async function fetchAudits(): Promise<void> {
    if (!pageActive.value || !currentIdentity() || !canListAudits.value) return
    const next = copyServiceAccountQuery(auditsQueryParams)
    if (!sameServiceAccountPageQuery(next, activeAuditsQueryParams)) {
      Object.assign(activeAuditsQueryParams, next)
      await nextTick()
    }
    await auditsQuery.refetch({ throwOnError: true })
  }

  return { fetchAudits }
}
