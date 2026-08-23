import { useServiceAccountIdentityContext } from './useServiceAccountIdentityContext'
import { useServiceAccountPageCache } from './useServiceAccountPageCache'
import { useServiceAccountQueries } from './useServiceAccountQueries'

export {
  copyServiceAccountQuery,
  sameServiceAccountIdentity,
  sameServiceAccountPageQuery,
} from './serviceAccountContextTypes'
export type {
  ServiceAccountIdentity,
  ServiceAccountIdentityGuard,
  ServiceResourcePageState,
} from './serviceAccountContextTypes'

/** 服务账号管理的稳定组合入口。 */
export function useServiceAccountContext() {
  const identity = useServiceAccountIdentityContext()
  const queries = useServiceAccountQueries(identity)
  const pageCache = useServiceAccountPageCache(queries)

  return { ...identity, ...queries, ...pageCache }
}
