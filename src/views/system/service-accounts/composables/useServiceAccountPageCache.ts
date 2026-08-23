import type { ServiceAccount } from '@/api/modules/serviceAccount'
import type { PageResponse } from '@/shared/http/types'
import { queryClient } from '@/shared/query/client'
import type { ServiceAccountIdentity } from './serviceAccountContextTypes'
import { useServiceAccountQueries } from './useServiceAccountQueries'

/** 服务账号列表的本地缓存更新。 */
export function useServiceAccountPageCache(
  queries: ReturnType<typeof useServiceAccountQueries>,
) {
  function updateAccountPage(
    identity: ServiceAccountIdentity,
    account: ServiceAccount,
    mode: 'create' | 'update',
  ): void {
    queryClient.setQueryData<PageResponse<ServiceAccount>>(
      queries.accountsKey(identity),
      current => {
        if (!current) return current
        const existing = current.items.some(item => item.id === account.id)
        let items = current.items.map(item => item.id === account.id ? account : item)
        if (!existing && mode === 'create' && current.page === 1) {
          items = [account, ...items].slice(0, current.page_size)
        }
        const total = mode === 'create' && !existing ? current.total + 1 : current.total
        return {
          ...current,
          items,
          total,
          total_pages: total === 0 ? 0 : Math.ceil(total / current.page_size),
        }
      },
    )
    if (queries.selectedAccount.value?.id === account.id) queries.selectedAccount.value = account
  }

  function removeAccountFromPage(identity: ServiceAccountIdentity, accountId: string): void {
    queryClient.setQueryData<PageResponse<ServiceAccount>>(
      queries.accountsKey(identity),
      current => {
        if (!current) return current
        const total = Math.max(0, current.total - 1)
        return {
          ...current,
          items: current.items.filter(item => item.id !== accountId),
          total,
          total_pages: total === 0 ? 0 : Math.ceil(total / current.page_size),
        }
      },
    )
  }

  return { removeAccountFromPage, updateAccountPage }
}
