import { onActivated, onDeactivated } from 'vue'
import {
  createTenant,
  getTenantCapacity,
  listTenantCapacities,
  updateTenant,
  updateTenantStatus,
  type CreateTenantPayload,
  type Tenant,
  type TenantCapacity,
  type TenantCapacityPage,
  type TenantCapacityQuery,
  type TenantCapacityStatus,
  type TenantExpirationStatus,
  type TenantPublicStatus,
  type TenantStatus,
  type UpdateTenantPayload,
} from '@/api/modules/tenant'
import { usePermission } from '@/hooks/usePermission'
import { requireOperationData } from '@/shared/http/client'
import {
  invalidateTenantResource,
  queryClient,
  tenantQueryKey,
} from '@/shared/query/client'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import {
  LEGACY_TENANTS_RESOURCE,
  TENANT_CAPACITY_DETAIL_RESOURCE,
  TENANT_CAPACITY_PAGE_RESOURCE,
  TENANT_USAGE_RESOURCE,
} from './queryResources'

export interface TenantCapacityFilterState {
  tenant_id: string
  name: string
  status: TenantPublicStatus | ''
  expiration_status: TenantExpirationStatus | ''
  capacity_status: TenantCapacityStatus | ''
}

type SaveTenantCommand =
  | { kind: 'create'; data: CreateTenantPayload }
  | { kind: 'update'; tenantId: string; data: UpdateTenantPayload }

type TenantStatusCommand = { tenantId: string; status: TenantStatus }

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function emptyFilters(): TenantCapacityFilterState {
  return {
    tenant_id: '',
    name: '',
    status: '',
    expiration_status: '',
    capacity_status: '',
  }
}

function normalizeFilters(filters: TenantCapacityFilterState): TenantCapacityFilterState {
  return {
    tenant_id: filters.tenant_id.trim(),
    name: filters.name.trim(),
    status: filters.status,
    expiration_status: filters.expiration_status,
    capacity_status: filters.capacity_status,
  }
}

function sameFilters(left: TenantCapacityFilterState, right: TenantCapacityFilterState): boolean {
  return left.tenant_id === right.tenant_id
    && left.name === right.name
    && left.status === right.status
    && left.expiration_status === right.expiration_status
    && left.capacity_status === right.capacity_status
}

function positiveInteger(value: number, fallback: number, maximum?: number): number {
  if (!Number.isFinite(value)) return fallback
  const normalized = Math.max(1, Math.trunc(value))
  return maximum === undefined ? normalized : Math.min(maximum, normalized)
}

function buildPageQuery(
  filters: TenantCapacityFilterState,
  page: number,
  pageSize: number,
  includeUsage: boolean,
): TenantCapacityQuery {
  return {
    page,
    page_size: pageSize,
    tenant_id: filters.tenant_id || undefined,
    name: filters.name || undefined,
    status: filters.status || undefined,
    expiration_status: filters.expiration_status || undefined,
    capacity_status: includeUsage ? filters.capacity_status || undefined : undefined,
  }
}

export function useTenantCapacityManagement() {
  const userStore = useUserStore()
  const { hasPermission } = usePermission()
  const pageActive = ref(true)
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const filters = reactive<TenantCapacityFilterState>(emptyFilters())
  const appliedFilters = ref<TenantCapacityFilterState>(emptyFilters())
  const selectedTenantId = ref<string | null>(null)

  const canViewUsage = computed(() => hasPermission('tenant:usage:list'))
  const canListTenants = computed(() => hasPermission('tenant:list'))
  const queryEnabled = computed(() => (
    pageActive.value
    && userStore.sessionStatus === 'authenticated'
    && userStore.tenantId === 'system'
    && canListTenants.value
  ))

  const tenantPageQuery = useTenantQuery<TenantCapacityPage>(
    () => userStore.tenantId,
    queryEnabled,
    TENANT_CAPACITY_PAGE_RESOURCE,
    () => ({
      scope: 'page',
      include_usage: canViewUsage.value,
      query: buildPageQuery(
        appliedFilters.value,
        page.value,
        pageSize.value,
        canViewUsage.value,
      ),
    }),
    async signal => {
      const response = await listTenantCapacities(
        buildPageQuery(
          appliedFilters.value,
          page.value,
          pageSize.value,
          canViewUsage.value,
        ),
        signal,
      )
      return requireOperationData(response)
    },
    {
      staleTime: 0,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  )

  const detailQuery = useTenantQuery<TenantCapacity>(
    () => userStore.tenantId,
    () => queryEnabled.value && selectedTenantId.value !== null,
    TENANT_CAPACITY_DETAIL_RESOURCE,
    () => ({
      tenant_id: selectedTenantId.value,
      include_usage: canViewUsage.value,
    }),
    async signal => {
      const tenantId = selectedTenantId.value
      if (!tenantId) throw new Error('租户详情查询缺少租户标识')
      const response = await getTenantCapacity(tenantId, signal)
      return requireOperationData(response)
    },
    {
      staleTime: 0,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  )

  const tenantPage = tenantPageQuery.data
  const loading = tenantPageQuery.isPending
  const refreshing = tenantPageQuery.isFetching
  const detail = detailQuery.data
  const detailLoading = detailQuery.isPending
  const detailRefreshing = detailQuery.isFetching

  const saveMutation = useTenantMutation<Tenant, SaveTenantCommand>(
    () => userStore.tenantId,
    TENANT_CAPACITY_PAGE_RESOURCE,
    {
      mutationFn: async command => {
        const response = command.kind === 'create'
          ? await createTenant(command.data)
          : await updateTenant(command.tenantId, command.data)
        return requireOperationData(response)
      },
    },
  )

  const statusMutation = useTenantMutation<void, TenantStatusCommand>(
    () => userStore.tenantId,
    TENANT_CAPACITY_PAGE_RESOURCE,
    {
      mutationFn: async command => {
        await updateTenantStatus(command.tenantId, command.status)
      },
    },
  )

  const savePending = saveMutation.pending
  const statusPending = statusMutation.pending
  const togglingTenantId = computed(() => (
    statusMutation.pending.value
      ? statusMutation.variables.value?.tenantId ?? null
      : null
  ))

  async function applyFilters(): Promise<void> {
    const next = normalizeFilters(filters)
    const changed = !sameFilters(next, appliedFilters.value) || page.value !== 1
    appliedFilters.value = next
    page.value = 1
    if (!changed && queryEnabled.value) {
      await tenantPageQuery.refetch({ throwOnError: true })
    }
  }

  async function resetFilters(): Promise<void> {
    const next = emptyFilters()
    const changed = !sameFilters(next, appliedFilters.value) || page.value !== 1
    Object.assign(filters, next)
    appliedFilters.value = next
    page.value = 1
    if (!changed && queryEnabled.value) {
      await tenantPageQuery.refetch({ throwOnError: true })
    }
  }

  function changePage(nextPage: number): void {
    page.value = positiveInteger(nextPage, 1)
  }

  function changePageSize(nextPageSize: number): void {
    pageSize.value = positiveInteger(nextPageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
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
    const tenantId = userStore.tenantId
    selectedTenantId.value = null
    if (!tenantId) return
    await queryClient.cancelQueries({
      queryKey: tenantQueryKey(tenantId, TENANT_CAPACITY_DETAIL_RESOURCE).slice(0, 3),
    })
  }

  async function refreshDetail(): Promise<void> {
    if (!queryEnabled.value || !selectedTenantId.value) return
    await detailQuery.refetch({ throwOnError: true })
  }

  async function reconcileTenant(affectedTenantId?: string): Promise<void> {
    const systemTenantId = userStore.tenantId
    if (!systemTenantId) return
    await Promise.all([
      invalidateTenantResource(systemTenantId, TENANT_CAPACITY_PAGE_RESOURCE),
      invalidateTenantResource(systemTenantId, TENANT_CAPACITY_DETAIL_RESOURCE),
      invalidateTenantResource(systemTenantId, TENANT_USAGE_RESOURCE),
      invalidateTenantResource(systemTenantId, LEGACY_TENANTS_RESOURCE),
    ])
    if (queryEnabled.value) {
      await tenantPageQuery.refetch({ throwOnError: true })
      if (affectedTenantId && selectedTenantId.value === affectedTenantId) {
        await detailQuery.refetch({ throwOnError: true })
      }
    }
  }

  async function createTenantRecord(data: CreateTenantPayload): Promise<Tenant> {
    const tenant = await saveMutation.mutateAsync({ kind: 'create', data })
    await reconcileTenant(tenant.tenant_id)
    return tenant
  }

  async function updateTenantRecord(
    tenantId: string,
    data: UpdateTenantPayload,
  ): Promise<Tenant> {
    const tenant = await saveMutation.mutateAsync({ kind: 'update', tenantId, data })
    await reconcileTenant(tenantId)
    return tenant
  }

  async function toggleTenantStatus(tenantId: string, status: TenantStatus): Promise<void> {
    await statusMutation.mutateAsync({ tenantId, status })
    await reconcileTenant(tenantId)
  }

  async function setPageActive(active: boolean): Promise<void> {
    if (pageActive.value === active) return
    pageActive.value = active
    const tenantId = userStore.tenantId
    if (!tenantId) return
    if (!active) {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: tenantQueryKey(tenantId, TENANT_CAPACITY_PAGE_RESOURCE).slice(0, 3),
        }),
        queryClient.cancelQueries({
          queryKey: tenantQueryKey(tenantId, TENANT_CAPACITY_DETAIL_RESOURCE).slice(0, 3),
        }),
      ])
      return
    }
    await Promise.all([refresh(), refreshDetail()])
  }

  onActivated(() => {
    void setPageActive(true)
  })
  onDeactivated(() => {
    void setPageActive(false)
  })

  return {
    appliedFilters,
    applyFilters,
    canViewUsage,
    changePage,
    changePageSize,
    closeDetail,
    createTenantRecord,
    detail,
    detailLoading,
    detailRefreshing,
    filters,
    loading,
    openDetail,
    page,
    pageActive,
    pageSize,
    refresh,
    refreshing,
    refreshDetail,
    resetFilters,
    savePending,
    selectedTenantId,
    setPageActive,
    statusPending,
    tenantPage,
    togglingTenantId,
    toggleTenantStatus,
    updateTenantRecord,
  }
}
