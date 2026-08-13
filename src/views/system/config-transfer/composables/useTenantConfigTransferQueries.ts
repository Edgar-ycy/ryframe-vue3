import { ref, type Ref } from 'vue'
import type { QueryKey } from '@tanstack/vue-query'
import {
  listTenantConfigPackages,
  listTenantConfigTransferItems,
  listTenantConfigTransfers,
  type TenantConfigBundle,
  type TenantConfigPackageQuery,
  type TenantConfigTransfer,
  type TenantConfigTransferItem,
  type TenantConfigTransferItemQuery,
  type TenantConfigTransferQuery,
} from '@/api/modules/tenantConfigTransfer'
import { requireOperationData } from '@/shared/http/client'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import { queryClient, tenantQueryKey } from '@/shared/query/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import {
  TENANT_CONFIG_PACKAGES_RESOURCE,
  TENANT_CONFIG_TRANSFER_ITEMS_RESOURCE,
  TENANT_CONFIG_TRANSFERS_RESOURCE,
} from '../queryResources'

export interface TenantConfigIdentity {
  tenantId: string
  userId: string
}

interface TenantConfigTransferQueriesOptions {
  pageActive: Ref<boolean>
  currentIdentity: () => TenantConfigIdentity | undefined
  isCurrentIdentity: (identity: TenantConfigIdentity) => boolean
  canListPackages: () => boolean
}

function samePageQuery(
  left: TenantConfigPackageQuery,
  right: TenantConfigPackageQuery,
): boolean {
  return left.page === right.page && left.page_size === right.page_size
}

/** 配置包、迁移及逐项结果的服务端状态与精确缓存操作。 */
export function useTenantConfigTransferQueries(options: TenantConfigTransferQueriesOptions) {
  const userStore = useUserStore()
  const packageQueryParams = ref<TenantConfigPackageQuery>({ page: 1, page_size: 10 })
  const activePackageQueryParams = ref<TenantConfigPackageQuery>({ ...packageQueryParams.value })
  const queryParams = ref<TenantConfigTransferQuery>({ page: 1, page_size: 10 })
  const activeQueryParams = ref<TenantConfigTransferQuery>({ ...queryParams.value })
  const itemQueryParams = ref<TenantConfigTransferItemQuery>({ page: 1, page_size: 20 })
  const selectedPackage = ref<TenantConfigBundle>()
  const selectedTransfer = ref<TenantConfigTransfer>()

  function queryEnabled(): boolean {
    return options.pageActive.value && options.currentIdentity() !== undefined
  }

  function packageListParams(params = activePackageQueryParams.value) {
    return {
      scope: 'list',
      userId: String(userStore.userId || 'anonymous'),
      filters: { ...params },
    }
  }

  function transferListParams(params = activeQueryParams.value) {
    return {
      scope: 'list',
      userId: String(userStore.userId || 'anonymous'),
      filters: { ...params },
    }
  }

  function transferItemParams(
    transferId = selectedTransfer.value?.id ?? 'none',
    params = itemQueryParams.value,
  ) {
    return {
      scope: 'items',
      userId: String(userStore.userId || 'anonymous'),
      transferId,
      filters: { ...params },
    }
  }

  function packageListKey(identity: TenantConfigIdentity): QueryKey {
    return tenantQueryKey(
      identity.tenantId,
      TENANT_CONFIG_PACKAGES_RESOURCE,
      packageListParams(),
    )
  }

  function transferListKey(identity: TenantConfigIdentity): QueryKey {
    return tenantQueryKey(
      identity.tenantId,
      TENANT_CONFIG_TRANSFERS_RESOURCE,
      transferListParams(),
    )
  }

  const packagesQuery = useTenantQuery<PageResponse<TenantConfigBundle>>(
    () => userStore.tenantId,
    () => queryEnabled() && options.canListPackages(),
    TENANT_CONFIG_PACKAGES_RESOURCE,
    packageListParams,
    async signal => requireOperationData(await listTenantConfigPackages(
      { ...activePackageQueryParams.value },
      signal,
    )),
    {
      staleTime: 0,
      refetchInterval: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  const transfersQuery = useTenantQuery<PageResponse<TenantConfigTransfer>>(
    () => userStore.tenantId,
    queryEnabled,
    TENANT_CONFIG_TRANSFERS_RESOURCE,
    transferListParams,
    async signal => requireOperationData(await listTenantConfigTransfers(
      { ...activeQueryParams.value },
      signal,
    )),
    {
      staleTime: 0,
      refetchInterval: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  const itemsQuery = useTenantQuery<PageResponse<TenantConfigTransferItem>>(
    () => userStore.tenantId,
    () => queryEnabled() && selectedTransfer.value !== undefined,
    TENANT_CONFIG_TRANSFER_ITEMS_RESOURCE,
    transferItemParams,
    async (signal) => {
      const transferId = selectedTransfer.value?.id
      if (!transferId) return emptyPageResponse<TenantConfigTransferItem>(itemQueryParams.value)
      return requireOperationData(await listTenantConfigTransferItems(
        transferId,
        { ...itemQueryParams.value },
        signal,
      ))
    },
    {
      staleTime: 0,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  function mergePageRecord<T extends { id: string }>(
    key: QueryKey,
    value: T,
    fallbackQuery: TenantConfigPackageQuery,
  ): void {
    queryClient.setQueryData<PageResponse<T>>(key, (current) => {
      if (!current) {
        return {
          ...emptyPageResponse<T>(fallbackQuery),
          items: [value],
          total: 1,
          total_pages: 1,
        }
      }
      const index = current.items.findIndex(item => item.id === value.id)
      if (index >= 0) {
        const items = [...current.items]
        items[index] = value
        return { ...current, items }
      }
      if (current.page !== 1) return current
      return {
        ...current,
        items: [value, ...current.items].slice(0, current.page_size),
        total: current.total + 1,
        total_pages: Math.max(1, Math.ceil((current.total + 1) / current.page_size)),
      }
    })
  }

  function removePageRecord<T extends { id: string }>(key: QueryKey, id: string): void {
    queryClient.setQueryData<PageResponse<T>>(key, (current) => {
      if (!current || !current.items.some(item => item.id === id)) return current
      const total = Math.max(0, current.total - 1)
      return {
        ...current,
        items: current.items.filter(item => item.id !== id),
        total,
        total_pages: Math.ceil(total / current.page_size),
      }
    })
  }

  function mergePackage(identity: TenantConfigIdentity, bundle: TenantConfigBundle): void {
    if (!options.isCurrentIdentity(identity)) return
    mergePageRecord(packageListKey(identity), bundle, activePackageQueryParams.value)
    if (selectedPackage.value?.id === bundle.id) selectedPackage.value = bundle
  }

  function mergeTransfer(identity: TenantConfigIdentity, transfer: TenantConfigTransfer): void {
    if (!options.isCurrentIdentity(identity)) return
    mergePageRecord(transferListKey(identity), transfer, activeQueryParams.value)
    if (selectedTransfer.value?.id === transfer.id) selectedTransfer.value = transfer
  }

  function removePackage(identity: TenantConfigIdentity, bundleId: string): void {
    if (!options.isCurrentIdentity(identity)) return
    removePageRecord<TenantConfigBundle>(packageListKey(identity), bundleId)
    if (selectedPackage.value?.id === bundleId) selectedPackage.value = undefined
  }

  function removeTransfer(identity: TenantConfigIdentity, transferId: string): void {
    if (!options.isCurrentIdentity(identity)) return
    removePageRecord<TenantConfigTransfer>(transferListKey(identity), transferId)
    if (selectedTransfer.value?.id === transferId) selectedTransfer.value = undefined
  }

  return {
    activePackageQueryParams,
    activeQueryParams,
    itemQueryParams,
    itemsQuery,
    mergePackage,
    mergeTransfer,
    packageListKey,
    packageQueryParams,
    packagesQuery,
    queryEnabled,
    queryParams,
    removePackage,
    removeTransfer,
    samePageQuery,
    selectedPackage,
    selectedTransfer,
    transferListKey,
    transfersQuery,
  }
}
