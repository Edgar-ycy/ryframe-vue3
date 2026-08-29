import { nextTick, ref } from 'vue'
import {
  getTenantConfigPackage,
  getTenantConfigTransfer,
  type TenantConfigBundle,
  type TenantConfigTransfer,
} from '@/api/modules/tenantConfigTransfer'
import { usePermission } from '@/hooks/usePermission'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { getServerStateScope } from '@/shared/query/client'
import {
  createIdentityOperationScope,
  type IdentityOperationGuard,
} from '@/shared/query/createIdentityOperationScope'
import { sameServerStateScope } from '@/shared/query/scope'
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
    if (userStore.sessionStatus !== 'authenticated' || !userStore.tenantId || !userStore.userId)
      return undefined
    const active = getServerStateScope()
    if (
      !active ||
      active.tenantId !== userStore.tenantId ||
      active.subjectId !== String(userStore.userId)
    )
      return undefined
    return {
      tenantId: active.tenantId,
      subjectId: active.subjectId,
      sessionEpoch: active.sessionEpoch,
    }
  }

  const operationScope = createIdentityOperationScope({
    currentIdentity,
    isActive: () => pageActive.value,
    sameIdentity: sameServerStateScope,
  })
  let packageSelectionController: AbortController | undefined
  let packageSelectionGeneration = 0
  let transferSelectionController: AbortController | undefined
  let transferSelectionGeneration = 0
  operationScope.onInvalidated(() => {
    packageSelectionController = undefined
    packageSelectionGeneration += 1
    transferSelectionController = undefined
    transferSelectionGeneration += 1
  })
  const isCurrentIdentity = (identity: TenantConfigIdentity) =>
    operationScope.isCurrentIdentity(identity)
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

  async function selectPackage(
    bundle: TenantConfigBundle | undefined,
    expectedGuard?: IdentityOperationGuard,
  ): Promise<void> {
    const identity = commands.requireIdentity()
    const guard = expectedGuard ?? commands.requireOperationContext()
    commands.ensureOperationContext(identity, guard)
    packageSelectionController?.abort()
    const controller = operationScope.beginController()
    packageSelectionController = controller
    packageSelectionGeneration += 1
    const generation = packageSelectionGeneration
    const ensureSelectionCurrent = (): void => {
      commands.ensureOperationContext(identity, guard)
      if (
        controller.signal.aborted ||
        packageSelectionController !== controller ||
        packageSelectionGeneration !== generation
      ) {
        throw new HttpError('配置包选择已被更新操作取代', { kind: 'cancelled' })
      }
    }
    try {
      ensureSelectionCurrent()
      queries.selectedPackage.value = bundle
      if (!bundle || !canListPackages()) return
      const latest = requireOperationData(
        await getTenantConfigPackage(bundle.id, controller.signal),
      )
      ensureSelectionCurrent()
      queries.mergePackage(identity, latest)
    } finally {
      operationScope.finishController(controller)
      if (packageSelectionController === controller) packageSelectionController = undefined
    }
  }

  async function selectTransfer(
    transfer: TenantConfigTransfer | undefined,
    expectedGuard?: IdentityOperationGuard,
  ): Promise<void> {
    const identity = commands.requireIdentity()
    const guard = expectedGuard ?? commands.requireOperationContext()
    commands.ensureOperationContext(identity, guard)
    transferSelectionController?.abort()
    const controller = operationScope.beginController()
    transferSelectionController = controller
    transferSelectionGeneration += 1
    const generation = transferSelectionGeneration
    const ensureSelectionCurrent = (): void => {
      commands.ensureOperationContext(identity, guard)
      if (
        controller.signal.aborted ||
        transferSelectionController !== controller ||
        transferSelectionGeneration !== generation
      ) {
        throw new HttpError('配置迁移选择已被更新操作取代', { kind: 'cancelled' })
      }
    }
    try {
      ensureSelectionCurrent()
      queries.selectedTransfer.value = transfer
      queries.itemQueryParams.value.page = 1
      if (!transfer) return
      const latest = requireOperationData(
        await getTenantConfigTransfer(transfer.id, controller.signal),
      )
      ensureSelectionCurrent()
      commands.mergeTransfer(identity, latest)
      await nextTick()
      ensureSelectionCurrent()
      await queries.itemsQuery.refetch({ throwOnError: false })
      ensureSelectionCurrent()
    } finally {
      operationScope.finishController(controller)
      if (transferSelectionController === controller) transferSelectionController = undefined
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
    captureIdentity: operationScope.capture,
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
    identityMatches: operationScope.matches,
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
