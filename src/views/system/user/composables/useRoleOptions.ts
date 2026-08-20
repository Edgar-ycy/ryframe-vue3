import { computed, onScopeDispose, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { listRoleOptions } from '@/api/modules/role'
import type { SelectOption, SelectOptionList } from '@/api/modules/option'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const ROLE_OPTION_LIMIT = 50
const SEARCH_DEBOUNCE_MS = 275

/**
 * 提供租户隔离的角色远程搜索，并保留当前已选但不在本次搜索结果中的角色。
 */
export function useRoleOptions(
  enabled: MaybeRefOrGetter<boolean>,
  selectedOptions: MaybeRefOrGetter<SelectOption[]> = () => [],
) {
  const userStore = useUserStore()
  const searchText = ref('')
  const debouncedSearchText = ref('')
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  function currentParams() {
    return {
      q: debouncedSearchText.value || undefined,
      limit: ROLE_OPTION_LIMIT,
      purpose: 'user_assignment' as const,
    }
  }

  const rolesQuery = useTenantQuery<SelectOptionList>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated' && toValue(enabled),
    'role-options',
    currentParams,
    async (signal) => {
      const response = await listRoleOptions(currentParams(), signal)
      return response.data ?? { items: [], has_more: false }
    },
  )

  const options = computed(() => {
    const merged = new Map<string, SelectOption>()
    for (const option of rolesQuery.data.value?.items ?? []) merged.set(option.value, option)
    for (const option of toValue(selectedOptions)) {
      if (!merged.has(option.value)) merged.set(option.value, option)
    }
    return [...merged.values()]
  })

  function remoteMethod(value: string): void {
    searchText.value = value.trim()
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debouncedSearchText.value = searchText.value
      debounceTimer = undefined
    }, SEARCH_DEBOUNCE_MS)
  }

  function resetSearch(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = undefined
    searchText.value = ''
    debouncedSearchText.value = ''
  }

  onScopeDispose(resetSearch)

  return {
    loading: rolesQuery.isFetching,
    options,
    remoteMethod,
    resetSearch,
  }
}
