import { computed, reactive, ref } from 'vue'
import {
  getTenantCapacity,
  listTenantCapacities,
  type TenantCapacity,
  type TenantCapacityPage,
} from '@/api/modules/tenant'
import { usePermission } from '@/hooks/usePermission'
import { requireOperationData } from '@/shared/http/client'
import { getServerStateScope, queryClient, serverStateResourcePrefix } from '@/shared/query/client'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { TENANT_CAPACITY_DETAIL_RESOURCE, TENANT_CAPACITY_PAGE_RESOURCE } from './queryResources'
import {
  buildTenantCapacityPageQuery,
  emptyTenantCapacityFilters,
  normalizePositiveInteger,
  normalizeTenantCapacityFilters,
  sameTenantCapacityFilters,
  TENANT_CAPACITY_DEFAULT_PAGE_SIZE,
  TENANT_CAPACITY_MAX_PAGE_SIZE,
  type TenantCapacityFilterState,
} from './tenantCapacityFilters'

/** 平台租户容量页的筛选、分页、详情查询与页面激活状态。 */
export function useTenantCapacityQueries() {
  const userStore = useUserStore()
  const { hasPermission } = usePermission()
  const pageActive = ref(true)
  const page = ref(1)
  const pageSize = ref(TENANT_CAPACITY_DEFAULT_PAGE_SIZE)
  const filters = reactive<TenantCapacityFilterState>(emptyTenantCapacityFilters())
  const appliedFilters = ref<TenantCapacityFilterState>(emptyTenantCapacityFilters())
  const selectedTenantId = ref<string | null>(null)
  const canViewUsage = computed(() => hasPermission('tenant:usage:list'))
  const canListTenants = computed(() => hasPermission('tenant:list'))
  const queryEnabled = computed(
    () =>
      pageActive.value &&
      userStore.sessionStatus === 'authenticated' &&
      userStore.tenantId === 'system' &&
      canListTenants.value,
  )

  const tenantPageQuery = useServerStateQuery<TenantCapacityPage>(
    queryEnabled,
    TENANT_CAPACITY_PAGE_RESOURCE,
    () => ({
      scope: 'page',
      include_usage: canViewUsage.value,
      query: buildTenantCapacityPageQuery(
        appliedFilters.value,
        page.value,
        pageSize.value,
        canViewUsage.value,
      ),
    }),
    async (signal) =>
      requireOperationData(
        await listTenantCapacities(
          buildTenantCapacityPageQuery(
            appliedFilters.value,
            page.value,
            pageSize.value,
            canViewUsage.value,
          ),
          signal,
        ),
      ),
    {
      staleTime: 0,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      meta: { errorMode: 'silent' },
    },
  )

  const detailQuery = useServerStateQuery<TenantCapacity>(
    () => queryEnabled.value && selectedTenantId.value !== null,
    TENANT_CAPACITY_DETAIL_RESOURCE,
    () => ({
      tenant_id: selectedTenantId.value,
      include_usage: canViewUsage.value,
    }),
    async (signal) => {
      const tenantId = selectedTenantId.value
      if (!tenantId) throw new Error('租户详情查询缺少租户标识')
      return requireOperationData(await getTenantCapacity(tenantId, signal))
    },
    {
      staleTime: 0,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      meta: { errorMode: 'silent' },
    },
  )

  async function applyFilters(): Promise<void> {
    const next = normalizeTenantCapacityFilters(filters)
    const changed = !sameTenantCapacityFilters(next, appliedFilters.value) || page.value !== 1
    appliedFilters.value = next
    page.value = 1
    if (!changed && queryEnabled.value) {
      await tenantPageQuery.refetch({ throwOnError: true })
    }
  }

  async function resetFilters(): Promise<void> {
    const next = emptyTenantCapacityFilters()
    const changed = !sameTenantCapacityFilters(next, appliedFilters.value) || page.value !== 1
    Object.assign(filters, next)
    appliedFilters.value = next
    page.value = 1
    if (!changed && queryEnabled.value) {
      await tenantPageQuery.refetch({ throwOnError: true })
    }
  }

  function changePage(nextPage: number): void {
    page.value = normalizePositiveInteger(nextPage, 1)
  }

  function changePageSize(nextPageSize: number): void {
    pageSize.value = normalizePositiveInteger(
      nextPageSize,
      TENANT_CAPACITY_DEFAULT_PAGE_SIZE,
      TENANT_CAPACITY_MAX_PAGE_SIZE,
    )
    page.value = 1
  }

  async function refresh(): Promise<void> {
    if (!queryEnabled.value) return
    await tenantPageQuery.refetch({ throwOnError: true })
  }

  async function openDetail(tenantId: string): Promise<void> {
    const normalizedTenantId = tenantId.trim()
    if (!normalizedTenantId) return
    const sameTenant = selectedTenantId.value === normalizedTenantId
    selectedTenantId.value = normalizedTenantId
    if (sameTenant && queryEnabled.value) {
      await detailQuery.refetch({ throwOnError: true })
    }
  }

  async function closeDetail(): Promise<void> {
    selectedTenantId.value = null
    const scope = getServerStateScope()
    if (!scope) return
    await queryClient.cancelQueries({
      queryKey: serverStateResourcePrefix(scope, TENANT_CAPACITY_DETAIL_RESOURCE),
    })
  }

  async function refreshDetail(): Promise<void> {
    if (!queryEnabled.value || !selectedTenantId.value) return
    await detailQuery.refetch({ throwOnError: true })
  }

  async function setPageActive(active: boolean): Promise<void> {
    if (pageActive.value === active) return
    pageActive.value = active
    const scope = getServerStateScope()
    if (!scope) return
    if (!active) {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: serverStateResourcePrefix(scope, TENANT_CAPACITY_PAGE_RESOURCE),
        }),
        queryClient.cancelQueries({
          queryKey: serverStateResourcePrefix(scope, TENANT_CAPACITY_DETAIL_RESOURCE),
        }),
      ])
      return
    }
    await Promise.all([refresh(), refreshDetail()])
  }

  return {
    appliedFilters,
    applyFilters,
    canViewUsage,
    changePage,
    changePageSize,
    closeDetail,
    detail: detailQuery.data,
    detailLoading: detailQuery.isPending,
    detailQuery,
    detailRefreshing: detailQuery.isFetching,
    filters,
    loading: tenantPageQuery.isPending,
    openDetail,
    page,
    pageActive,
    pageSize,
    queryEnabled,
    refresh,
    refreshDetail,
    resetFilters,
    selectedTenantId,
    setPageActive,
    tenantPage: tenantPageQuery.data,
    tenantPageQuery,
    refreshing: tenantPageQuery.isFetching,
    userStore,
  }
}
