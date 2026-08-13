import { nextTick, ref } from 'vue'
import {
  getTenantConfigPackage,
  getTenantConfigTransfer,
  type TenantConfigBundle,
  type TenantConfigTransfer,
} from '@/api/modules/tenantConfigTransfer'
import { usePermission } from '@/hooks/usePermission'
import { requireOperationData } from '@/shared/http/client'
import { createIdentityOperationScope } from '@/shared/query/createIdentityOperationScope'
import { useUserStore } from '@/stores/user'
import { useTenantConfigTransferActiveTracking } from './useTenantConfigTransferActiveTracking'
import { useTenantConfigTransferCommands } from './useTenantConfigTransferCommands'
import { useTenantConfigTransferLifecycle } from './useTenantConfigTransferLifecycle'
import {
  useTenantConfigTransferQueries,
  type TenantConfigIdentity,
} from './useTenantConfigTransferQueries'

/** 配置迁移页面的薄协调层，公开返回结构保持稳定。 */
export function useTenantConfigTransferManagement() {
  const userStore = useUserStore()
  const { hasPermission } = usePermission()
  const pageActive = ref(true)

  function currentIdentity(): TenantConfigIdentity | undefined {
    if (
      userStore.sessionStatus !== 'authenticated'
      || !userStore.tenantId
      || !userStore.userId
    ) return undefined
    return { tenantId: userStore.tenantId, userId: String(userStore.userId) }
  }

  const operationScope = createIdentityOperationScope({
    currentIdentity,
    isActive: () => pageActive.value,
    sameIdentity: (left, right) => (
      left?.tenantId === right?.tenantId && left?.userId === right?.userId
    ),
  })
  const isCurrentIdentity = (identity: TenantConfigIdentity) => (
    operationScope.isCurrentIdentity(identity)
  )
  const canListPackages = () => hasPermission('system:config-package:list')
  const queries = useTenantConfigTransferQueries({
    pageActive,
    currentIdentity,
    isCurrentIdentity,
    canListPackages,
  })
  const commands = useTenantConfigTransferCommands({
    abortActiveCycle: () => activeTracking.abortActiveRequest(),
    currentIdentity,
    isCurrentIdentity,
    operationScope,
    queries,
    scheduleActiveCycle: () => activeTracking.scheduleActiveCycle(),
  })
  const activeTracking = useTenantConfigTransferActiveTracking({
    currentIdentity,
    isCurrentIdentity,
    mergeTransfer: commands.mergeTransfer,
    queries,
  })
  async function refresh(): Promise<void> {
    if (!queries.queryEnabled()) return
    const requests: Promise<unknown>[] = [queries.transfersQuery.refetch({ throwOnError: true })]
    if (canListPackages()) {
      requests.push(queries.packagesQuery.refetch({ throwOnError: true }))
    }
    await Promise.all(requests)
    activeTracking.scheduleActiveCycle(true)
  }

  async function fetchPackages(): Promise<void> {
    if (!canListPackages()) return
    const nextParams = { ...queries.packageQueryParams.value }
    if (!queries.samePageQuery(nextParams, queries.activePackageQueryParams.value)) {
      queries.activePackageQueryParams.value = nextParams
      await nextTick()
    }
    await queries.packagesQuery.refetch({ throwOnError: true })
  }

  async function fetchData(): Promise<void> {
    const nextParams = { ...queries.queryParams.value }
    if (!queries.samePageQuery(nextParams, queries.activeQueryParams.value)) {
      queries.activeQueryParams.value = nextParams
      await nextTick()
    }
    await queries.transfersQuery.refetch({ throwOnError: true })
  }

  async function fetchItems(): Promise<void> {
    if (!queries.selectedTransfer.value) return
    await queries.itemsQuery.refetch({ throwOnError: true })
  }

  function handleSearch(): void {
    queries.queryParams.value.page = 1
    void fetchData()
  }

  function handleReset(): void {
    queries.queryParams.value = {
      page: 1,
      page_size: queries.queryParams.value.page_size ?? 10,
    }
    void fetchData()
  }

  async function selectPackage(bundle: TenantConfigBundle | undefined): Promise<void> {
    queries.selectedPackage.value = bundle
    if (!bundle || !canListPackages()) return
    const identity = commands.requireIdentity()
    const guard = commands.requireOperationContext()
    const controller = operationScope.beginController()
    try {
      const latest = requireOperationData(await getTenantConfigPackage(bundle.id, controller.signal))
      commands.ensureOperationContext(identity, guard)
      queries.mergePackage(identity, latest)
    }
    finally {
      operationScope.finishController(controller)
    }
  }

  async function selectTransfer(transfer: TenantConfigTransfer | undefined): Promise<void> {
    queries.selectedTransfer.value = transfer
    queries.itemQueryParams.value.page = 1
    if (!transfer) return
    const identity = commands.requireIdentity()
    const guard = commands.requireOperationContext()
    const controller = operationScope.beginController()
    try {
      const latest = requireOperationData(await getTenantConfigTransfer(
        transfer.id,
        controller.signal,
      ))
      commands.ensureOperationContext(identity, guard)
      commands.mergeTransfer(identity, latest)
      await nextTick()
      commands.ensureOperationContext(identity, guard)
      await queries.itemsQuery.refetch({ throwOnError: false })
    }
    finally {
      operationScope.finishController(controller)
    }
  }

  useTenantConfigTransferLifecycle({
    activeTracking,
    clearPendingIntents: commands.clearPendingIntents,
    currentIdentity,
    operationScope,
    pageActive,
    refresh,
    resetSelection: () => {
      queries.selectedPackage.value = undefined
      queries.selectedTransfer.value = undefined
    },
  })

  return {
    applyPending: commands.applyPending,
    applyTransfer: commands.applyTransfer,
    canListPackages,
    createFromPackage: commands.createFromPackage,
    createPackage: commands.createPackage,
    createPackagePending: commands.createPackagePending,
    createTransferPending: commands.createTransferPending,
    downloadPackage: commands.downloadPackage,
    downloadingPackageId: commands.downloadingPackageId,
    fetchData,
    fetchItems,
    fetchPackages,
    handleReset,
    handleSearch,
    itemQueryParams: queries.itemQueryParams,
    items: queries.itemsQuery.data,
    itemsError: queries.itemsQuery.error,
    itemsLoading: queries.itemsQuery.isFetching,
    operationKind: commands.operationKind,
    packageQueryParams: queries.packageQueryParams,
    packages: queries.packagesQuery.data,
    packagesError: queries.packagesQuery.error,
    packagesLoading: queries.packagesQuery.isFetching,
    pageActive,
    previewTransfer: commands.previewTransfer,
    queryParams: queries.queryParams,
    refresh,
    rollbackTransfer: commands.rollbackTransfer,
    selectPackage,
    selectedPackage: queries.selectedPackage,
    selectedTransfer: queries.selectedTransfer,
    selectTransfer,
    transfers: queries.transfersQuery.data,
    transfersError: queries.transfersQuery.error,
    transfersLoading: queries.transfersQuery.isFetching,
    uploadPackage: commands.uploadPackage,
  }
}
