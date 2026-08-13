import {
  getCurrentScope,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
} from 'vue'
import {
  applyTenantConfigTransfer,
  createTenantConfigPackage,
  createTenantConfigTransferFromPackage,
  downloadTenantConfigPackage,
  getTenantConfigPackage,
  getTenantConfigTransfer,
  previewTenantConfigTransfer,
  rollbackTenantConfigTransfer,
  type TenantConfigBundle,
  type TenantConfigTransfer,
  uploadTenantConfigTransfer,
} from '@/api/modules/tenantConfigTransfer'
import { downloadBlobDirect } from '@/hooks/useDownload'
import { usePermission } from '@/hooks/usePermission'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import {
  createIdentityOperationScope,
  type IdentityOperationGuard,
} from '@/shared/query/createIdentityOperationScope'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useUserStore } from '@/stores/user'
import {
  isActiveTenantConfigPackage,
  isActiveTenantConfigTransfer,
} from '../presentation'
import { useTenantConfigTransferQueries, type TenantConfigIdentity } from './useTenantConfigTransferQueries'
import {
  TENANT_CONFIG_PACKAGES_RESOURCE,
  TENANT_CONFIG_TRANSFER_ITEMS_RESOURCE,
  TENANT_CONFIG_TRANSFERS_RESOURCE,
} from '../queryResources'
import { tenantConfigTransferFileFingerprint } from './tenantConfigTransferFileFingerprint'

const ACTIVE_REFRESH_INTERVAL_MS = 5_000
const MAX_CONCURRENT_DETAILS = 4

interface PackageCommand {
  controller: AbortController
  idempotencyKey: string
}

type CreateTransferCommand = {
  controller: AbortController
  idempotencyKey: string
} & (
  | { kind: 'from-package', bundleId: string }
  | { kind: 'upload', file: File }
)

interface TransferOperationCommand {
  controller: AbortController
  idempotencyKey: string
  kind: 'preview' | 'apply' | 'rollback'
  transfer: TenantConfigTransfer
}

interface ActiveDetail {
  id: string
  kind: 'package' | 'transfer'
}

function sameIdentity(
  left: TenantConfigIdentity | undefined,
  right: TenantConfigIdentity | undefined,
): boolean {
  return left?.tenantId === right?.tenantId && left?.userId === right?.userId
}

function safePackageFilename(bundle: TenantConfigBundle): string {
  const tenant = bundle.source_tenant_key.replace(/[^a-zA-Z0-9._-]+/gu, '-') || 'tenant'
  const timestamp = bundle.created_at.replace(/[^0-9]+/gu, '').slice(0, 14)
  return `${tenant}-${timestamp || 'config'}.ryframe-config.zip`
}

/**
 * 配置包和配置迁移页面的服务端状态、幂等写操作与低频后台任务跟踪。
 * 列表只响应页面事件刷新，五秒周期只读取当前页中的活跃详情。
 */
export function useTenantConfigTransferManagement() {
  const userStore = useUserStore()
  const { hasPermission } = usePermission()
  const pageActive = ref(true)
  const createTransferBusy = ref(false)
  const downloadingPackageId = ref<string>()
  const pendingIntentKeys = new Map<string, string>()
  let activeTimer: ReturnType<typeof globalThis.setTimeout> | undefined
  let activeCycleController: AbortController | undefined
  let activeCycleRunning = false

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
    sameIdentity,
  })

  function isCurrentIdentity(identity: TenantConfigIdentity): boolean {
    return operationScope.isCurrentIdentity(identity)
  }

  function canListPackages(): boolean {
    return hasPermission('system:config-package:list')
  }

  let trackedIdentity = currentIdentity()
  const {
    activePackageQueryParams,
    activeQueryParams,
    itemQueryParams,
    itemsQuery,
    mergePackage,
    mergeTransfer: mergeTransferCache,
    packageListKey,
    packageQueryParams,
    packagesQuery,
    queryEnabled,
    queryParams,
    removePackage,
    removeTransfer: removeTransferCache,
    samePageQuery,
    selectedPackage,
    selectedTransfer,
    transferListKey,
    transfersQuery,
  } = useTenantConfigTransferQueries({
    pageActive,
    currentIdentity,
    isCurrentIdentity,
    canListPackages,
  })

  function mergeTransfer(
    identity: TenantConfigIdentity,
    transfer: TenantConfigTransfer,
  ): void {
    mergeTransferCache(identity, transfer)
    if (!isActiveTenantConfigTransfer(transfer)) {
      pendingIntentKeys.delete(`preview:${transfer.id}`)
      if (transfer.status === 'applied' || transfer.status === 'failed') {
        for (const signature of pendingIntentKeys.keys()) {
          if (signature.startsWith(`apply:${transfer.id}:`)) pendingIntentKeys.delete(signature)
        }
      }
      if (transfer.status === 'rolled_back' || transfer.status === 'failed') {
        for (const signature of pendingIntentKeys.keys()) {
          if (signature.startsWith(`rollback:${transfer.id}:`)) pendingIntentKeys.delete(signature)
        }
      }
    }
  }

  function removeTransfer(identity: TenantConfigIdentity, transferId: string): void {
    removeTransferCache(identity, transferId)
  }

  const packageMutation = useTenantMutation<TenantConfigBundle, PackageCommand>(
    () => userStore.tenantId,
    TENANT_CONFIG_PACKAGES_RESOURCE,
    {
      mutationFn: async command => requireOperationData(await createTenantConfigPackage(
        command.idempotencyKey,
        command.controller.signal,
      )),
    },
  )

  const createTransferMutation = useTenantMutation<
    TenantConfigTransfer,
    CreateTransferCommand
  >(
    () => userStore.tenantId,
    TENANT_CONFIG_TRANSFERS_RESOURCE,
    {
      mutationFn: async (command) => {
        const response = command.kind === 'upload'
          ? await uploadTenantConfigTransfer(
              command.file,
              command.idempotencyKey,
              command.controller.signal,
            )
          : await createTenantConfigTransferFromPackage(
              command.bundleId,
              command.idempotencyKey,
              command.controller.signal,
            )
        return requireOperationData(response)
      },
    },
  )

  const operationMutation = useTenantMutation<
    TenantConfigTransfer,
    TransferOperationCommand
  >(
    () => userStore.tenantId,
    TENANT_CONFIG_TRANSFERS_RESOURCE,
    {
      mutationFn: async (command) => {
        const { transfer } = command
        if (command.kind === 'preview') {
          return requireOperationData(await previewTenantConfigTransfer(
            transfer.id,
            command.idempotencyKey,
            command.controller.signal,
          ))
        }
        if (command.kind === 'rollback') {
          return requireOperationData(await rollbackTenantConfigTransfer(
            transfer.id,
            command.idempotencyKey,
            command.controller.signal,
          ))
        }
        if (!transfer.plan_hash) {
          throw new HttpError('配置迁移缺少预览计划摘要', { status: 409, kind: 'http' })
        }
        return requireOperationData(await applyTenantConfigTransfer(
          transfer.id,
          {
            plan_hash: transfer.plan_hash,
            target_authorization_epoch: transfer.target_authorization_epoch,
            target_configuration_version: transfer.target_configuration_version,
          },
          command.idempotencyKey,
          command.controller.signal,
        ))
      },
    },
  )

  function requireIdentity(): TenantConfigIdentity {
    const identity = currentIdentity()
    if (!identity) throw new HttpError('当前登录身份已经失效', { status: 401, kind: 'http' })
    return identity
  }

  function beginController(): AbortController {
    return operationScope.beginController()
  }

  function requireOperationContext(): IdentityOperationGuard {
    const guard = operationScope.capture()
    if (!guard) {
      throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    }
    return guard
  }

  function operationContextMatches(
    identity: TenantConfigIdentity,
    guard: IdentityOperationGuard,
  ): boolean {
    return isCurrentIdentity(identity) && operationScope.matches(guard)
  }

  function ensureOperationContext(
    identity: TenantConfigIdentity,
    guard: IdentityOperationGuard,
  ): void {
    if (!operationContextMatches(identity, guard)) {
      throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    }
  }

  async function cancelListBeforeMerge(
    identity: TenantConfigIdentity,
    guard: IdentityOperationGuard,
    kind: 'package' | 'transfer',
  ): Promise<void> {
    const queryKey = kind === 'package' ? packageListKey(identity) : transferListKey(identity)
    await queryClient.cancelQueries({ queryKey, exact: true })
    ensureOperationContext(identity, guard)
    activeCycleController?.abort()
  }

  async function selectFirstListPage(kind: 'package' | 'transfer'): Promise<void> {
    if (kind === 'package') {
      packageQueryParams.value.page = 1
      activePackageQueryParams.value = { ...packageQueryParams.value }
    }
    else {
      queryParams.value.page = 1
      activeQueryParams.value = { ...queryParams.value }
    }
    await nextTick()
  }

  async function runIdempotent<T>(
    identity: TenantConfigIdentity,
    guard: IdentityOperationGuard,
    signature: string,
    prefix: string,
    execute: (idempotencyKey: string, controller: AbortController) => Promise<T>,
  ): Promise<T> {
    const idempotencyKey = pendingIntentKeys.get(signature) ?? createIdempotencyKey(prefix)
    const controller = beginController()
    try {
      const result = await execute(idempotencyKey, controller)
      ensureOperationContext(identity, guard)
      pendingIntentKeys.delete(signature)
      return result
    }
    catch (error) {
      // 页面失活会中止请求，但服务端结果可能已经提交；同一身份保留幂等键供恢复后重试。
      if (isCurrentIdentity(identity) && shouldReuseIdempotencyKey(error)) {
        pendingIntentKeys.set(signature, idempotencyKey)
      }
      else {
        pendingIntentKeys.delete(signature)
      }
      throw error
    }
    finally {
      operationScope.finishController(controller)
    }
  }

  async function reconcileTransferError(
    identity: TenantConfigIdentity,
    guard: IdentityOperationGuard,
    transferId: string,
    error: unknown,
  ): Promise<void> {
    if (!operationContextMatches(identity, guard) || !(error instanceof HttpError)) return
    if (error.kind === 'cancelled') return
    if (error.status === 403 || error.status === 404) {
      removeTransfer(identity, transferId)
      return
    }
    if (error.status !== 409) return
    const controller = beginController()
    try {
      const latest = requireOperationData(await getTenantConfigTransfer(
        transferId,
        controller.signal,
      ))
      ensureOperationContext(identity, guard)
      mergeTransfer(identity, latest)
    }
    catch (detailError) {
      if (detailError instanceof HttpError && (detailError.status === 403 || detailError.status === 404)) {
        removeTransfer(identity, transferId)
      }
    }
    finally {
      operationScope.finishController(controller)
    }
    if (operationContextMatches(identity, guard)) {
      await transfersQuery.refetch({ throwOnError: false })
    }
  }

  async function createPackage(): Promise<TenantConfigBundle> {
    if (packageMutation.pending.value) {
      throw new HttpError('配置包导出正在提交', { status: 409, kind: 'http' })
    }
    const identity = requireIdentity()
    const guard = requireOperationContext()
    const bundle = await runIdempotent(identity, guard, 'package-export', 'tenant-config-export', (
      idempotencyKey,
      controller,
    ) => packageMutation.mutateAsync({ idempotencyKey, controller }))
    await selectFirstListPage('package')
    await cancelListBeforeMerge(identity, guard, 'package')
    mergePackage(identity, bundle)
    scheduleActiveCycle()
    return bundle
  }

  async function createFromPackage(bundle: TenantConfigBundle): Promise<TenantConfigTransfer> {
    if (createTransferBusy.value) {
      throw new HttpError('配置迁移正在创建', { status: 409, kind: 'http' })
    }
    createTransferBusy.value = true
    try {
      const identity = requireIdentity()
      const guard = requireOperationContext()
      const transfer = await runIdempotent(
        identity,
        guard,
        `from-package:${bundle.id}`,
        'tenant-config-from-package',
        (idempotencyKey, controller) => createTransferMutation.mutateAsync({
          kind: 'from-package',
          bundleId: bundle.id,
          idempotencyKey,
          controller,
        }),
      )
      await selectFirstListPage('transfer')
      await cancelListBeforeMerge(identity, guard, 'transfer')
      mergeTransfer(identity, transfer)
      selectedTransfer.value = transfer
      scheduleActiveCycle()
      return transfer
    }
    finally {
      createTransferBusy.value = false
    }
  }

  async function uploadPackage(file: File): Promise<TenantConfigTransfer> {
    if (createTransferBusy.value) {
      throw new HttpError('配置迁移正在创建', { status: 409, kind: 'http' })
    }
    createTransferBusy.value = true
    try {
      const identity = requireIdentity()
      const guard = requireOperationContext()
      const contentSha256 = await tenantConfigTransferFileFingerprint(file)
      ensureOperationContext(identity, guard)
      const signature = `upload:${contentSha256}`
      const transfer = await runIdempotent(
        identity,
        guard,
        signature,
        'tenant-config-upload',
        (idempotencyKey, controller) => createTransferMutation.mutateAsync({
          kind: 'upload',
          file,
          idempotencyKey,
          controller,
        }),
      )
      await selectFirstListPage('transfer')
      await cancelListBeforeMerge(identity, guard, 'transfer')
      mergeTransfer(identity, transfer)
      selectedTransfer.value = transfer
      scheduleActiveCycle()
      return transfer
    }
    finally {
      createTransferBusy.value = false
    }
  }

  async function runTransferOperation(
    kind: TransferOperationCommand['kind'],
    transfer: TenantConfigTransfer,
  ): Promise<TenantConfigTransfer> {
    if (operationMutation.pending.value) {
      throw new HttpError('配置迁移操作正在提交', { status: 409, kind: 'http' })
    }
    const identity = requireIdentity()
    const guard = requireOperationContext()
    const suffix = kind === 'preview'
      ? ''
      : `:${transfer.plan_hash ?? ''}:${transfer.target_configuration_version}:${transfer.target_authorization_epoch}`
    const signature = `${kind}:${transfer.id}${suffix}`
    try {
      const latest = await runIdempotent(
        identity,
        guard,
        signature,
        `tenant-config-${kind}`,
        (idempotencyKey, controller) => operationMutation.mutateAsync({
          kind,
          transfer,
          idempotencyKey,
          controller,
        }),
      )
      await cancelListBeforeMerge(identity, guard, 'transfer')
      mergeTransfer(identity, latest)
      scheduleActiveCycle()
      return latest
    }
    catch (error) {
      await reconcileTransferError(identity, guard, transfer.id, error)
      throw error
    }
  }

  function previewTransfer(transfer: TenantConfigTransfer): Promise<TenantConfigTransfer> {
    return runTransferOperation('preview', transfer)
  }

  function applyTransfer(transfer: TenantConfigTransfer): Promise<TenantConfigTransfer> {
    return runTransferOperation('apply', transfer)
  }

  function rollbackTransfer(transfer: TenantConfigTransfer): Promise<TenantConfigTransfer> {
    return runTransferOperation('rollback', transfer)
  }

  async function downloadPackage(bundle: TenantConfigBundle): Promise<void> {
    if (downloadingPackageId.value) return
    const identity = requireIdentity()
    const guard = requireOperationContext()
    const controller = beginController()
    downloadingPackageId.value = bundle.id
    try {
      const blob = await downloadTenantConfigPackage(bundle.id, controller.signal)
      ensureOperationContext(identity, guard)
      downloadBlobDirect(blob, safePackageFilename(bundle))
    }
    catch (error) {
      if (
        operationContextMatches(identity, guard)
        && error instanceof HttpError
        && [403, 404, 409].includes(error.status ?? 0)
      ) {
        try {
          mergePackage(
            identity,
            requireOperationData(await getTenantConfigPackage(bundle.id, controller.signal)),
          )
        }
        catch {
          await packagesQuery.refetch({ throwOnError: false })
        }
      }
      throw error
    }
    finally {
      operationScope.finishController(controller)
      if (downloadingPackageId.value === bundle.id) downloadingPackageId.value = undefined
    }
  }

  async function refreshPackageDetail(
    identity: TenantConfigIdentity,
    id: string,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      mergePackage(identity, requireOperationData(await getTenantConfigPackage(id, signal)))
    }
    catch (error) {
      if (!isCurrentIdentity(identity) || !(error instanceof HttpError)) return
      if (error.kind === 'cancelled') return
      if (error.status === 403 || error.status === 404) {
        removePackage(identity, id)
      }
      else if (error.status === 409) {
        await packagesQuery.refetch({ throwOnError: false })
      }
    }
  }

  async function refreshTransferDetail(
    identity: TenantConfigIdentity,
    id: string,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      mergeTransfer(identity, requireOperationData(await getTenantConfigTransfer(id, signal)))
    }
    catch (error) {
      if (!isCurrentIdentity(identity) || !(error instanceof HttpError)) return
      if (error.kind === 'cancelled') return
      if (error.status === 403 || error.status === 404) {
        removeTransfer(identity, id)
      }
      else if (error.status === 409) {
        try {
          mergeTransfer(
            identity,
            requireOperationData(await getTenantConfigTransfer(id, signal)),
          )
        }
        catch {
          await transfersQuery.refetch({ throwOnError: false })
        }
      }
    }
  }

  function activeDetails(): ActiveDetail[] {
    return [
      ...(packagesQuery.data.value?.items ?? [])
        .filter(isActiveTenantConfigPackage)
        .map(bundle => ({ kind: 'package' as const, id: bundle.id })),
      ...(transfersQuery.data.value?.items ?? [])
        .filter(isActiveTenantConfigTransfer)
        .map(transfer => ({ kind: 'transfer' as const, id: transfer.id })),
    ]
  }

  function canTrackActiveDetails(): boolean {
    return queryEnabled() && document.visibilityState !== 'hidden'
  }

  function stopActiveCycle(): void {
    if (activeTimer !== undefined) globalThis.clearTimeout(activeTimer)
    activeTimer = undefined
    activeCycleController?.abort()
    activeCycleController = undefined
  }

  async function refreshActiveDetails(): Promise<void> {
    if (!canTrackActiveDetails() || activeCycleRunning) return
    const identity = currentIdentity()
    if (!identity) return
    const details = activeDetails()
    if (details.length === 0) return
    activeCycleRunning = true
    const controller = new AbortController()
    activeCycleController?.abort()
    activeCycleController = controller
    let cursor = 0
    try {
      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_DETAILS, details.length) },
        async () => {
          while (cursor < details.length && !controller.signal.aborted) {
            const detail = details[cursor]
            cursor += 1
            if (!detail) continue
            if (detail.kind === 'package') {
              await refreshPackageDetail(identity, detail.id, controller.signal)
            }
            else {
              await refreshTransferDetail(identity, detail.id, controller.signal)
            }
          }
        },
      )
      await Promise.all(workers)
    }
    finally {
      if (activeCycleController === controller) activeCycleController = undefined
      activeCycleRunning = false
    }
  }

  function scheduleActiveCycle(immediate = false): void {
    if (activeTimer !== undefined) globalThis.clearTimeout(activeTimer)
    activeTimer = undefined
    if (!canTrackActiveDetails() || activeDetails().length === 0) return
    activeTimer = globalThis.setTimeout(async () => {
      activeTimer = undefined
      await refreshActiveDetails()
      scheduleActiveCycle()
    }, immediate ? 0 : ACTIVE_REFRESH_INTERVAL_MS)
  }

  async function refresh(): Promise<void> {
    if (!queryEnabled()) return
    const requests: Promise<unknown>[] = [transfersQuery.refetch({ throwOnError: true })]
    if (canListPackages()) {
      requests.push(packagesQuery.refetch({ throwOnError: true }))
    }
    await Promise.all(requests)
    scheduleActiveCycle(true)
  }

  async function fetchPackages(): Promise<void> {
    if (!canListPackages()) return
    const nextParams = { ...packageQueryParams.value }
    if (!samePageQuery(nextParams, activePackageQueryParams.value)) {
      activePackageQueryParams.value = nextParams
      await nextTick()
    }
    await packagesQuery.refetch({ throwOnError: true })
  }

  async function fetchData(): Promise<void> {
    const nextParams = { ...queryParams.value }
    if (!samePageQuery(nextParams, activeQueryParams.value)) {
      activeQueryParams.value = nextParams
      await nextTick()
    }
    await transfersQuery.refetch({ throwOnError: true })
  }

  async function fetchItems(): Promise<void> {
    if (!selectedTransfer.value) return
    await itemsQuery.refetch({ throwOnError: true })
  }

  function handleSearch(): void {
    queryParams.value.page = 1
    void fetchData()
  }

  function handleReset(): void {
    queryParams.value = { page: 1, page_size: queryParams.value.page_size ?? 10 }
    void fetchData()
  }

  async function selectPackage(bundle: TenantConfigBundle | undefined): Promise<void> {
    selectedPackage.value = bundle
    if (!bundle || !canListPackages()) return
    const identity = requireIdentity()
    const guard = requireOperationContext()
    const controller = beginController()
    try {
      const latest = requireOperationData(await getTenantConfigPackage(bundle.id, controller.signal))
      ensureOperationContext(identity, guard)
      mergePackage(identity, latest)
    }
    finally {
      operationScope.finishController(controller)
    }
  }

  async function selectTransfer(transfer: TenantConfigTransfer | undefined): Promise<void> {
    selectedTransfer.value = transfer
    itemQueryParams.value.page = 1
    if (!transfer) return
    const identity = requireIdentity()
    const guard = requireOperationContext()
    const controller = beginController()
    try {
      const latest = requireOperationData(await getTenantConfigTransfer(
        transfer.id,
        controller.signal,
      ))
      ensureOperationContext(identity, guard)
      mergeTransfer(identity, latest)
      await nextTick()
      ensureOperationContext(identity, guard)
      await itemsQuery.refetch({ throwOnError: false })
    }
    finally {
      operationScope.finishController(controller)
    }
  }

  function handleResumeEvent(): void {
    if (!queryEnabled() || document.visibilityState === 'hidden') return
    void refresh().catch(() => undefined)
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      stopActiveCycle()
      return
    }
    handleResumeEvent()
  }

  function cancelIdentityQueries(identity: TenantConfigIdentity): void {
    for (const resource of [
      TENANT_CONFIG_PACKAGES_RESOURCE,
      TENANT_CONFIG_TRANSFERS_RESOURCE,
      TENANT_CONFIG_TRANSFER_ITEMS_RESOURCE,
    ]) {
      const prefix = ['server-state', identity.tenantId, resource]
      void queryClient.cancelQueries({ queryKey: prefix })
      queryClient.removeQueries({ queryKey: prefix })
    }
  }

  const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
    const identity = currentIdentity()
    if (!identity || !pageActive.value) return
    const key = event.query.queryKey
    if (
      key[0] !== 'server-state'
      || key[1] !== identity.tenantId
      || ![
        TENANT_CONFIG_PACKAGES_RESOURCE,
        TENANT_CONFIG_TRANSFERS_RESOURCE,
      ].includes(String(key[2]))
    ) return
    scheduleActiveCycle()
  })

  const unsubscribeUser = userStore.$subscribe(() => {
    const nextIdentity = currentIdentity()
    if (sameIdentity(trackedIdentity, nextIdentity)) return
    if (trackedIdentity) cancelIdentityQueries(trackedIdentity)
    operationScope.invalidate()
    pendingIntentKeys.clear()
    stopActiveCycle()
    selectedPackage.value = undefined
    selectedTransfer.value = undefined
    trackedIdentity = nextIdentity
    if (nextIdentity && pageActive.value) {
      void nextTick().then(() => refresh()).catch(() => undefined)
    }
  }, { flush: 'sync' })

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    globalThis.addEventListener('focus', handleResumeEvent)
    globalThis.addEventListener('online', handleResumeEvent)
    scheduleActiveCycle()
  })

  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    handleResumeEvent()
  })

  onDeactivated(() => {
    pageActive.value = false
    operationScope.invalidate()
    stopActiveCycle()
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopActiveCycle()
      operationScope.dispose()
      unsubscribeCache()
      unsubscribeUser()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      globalThis.removeEventListener('focus', handleResumeEvent)
      globalThis.removeEventListener('online', handleResumeEvent)
    })
  }

  return {
    applyPending: operationMutation.pending,
    applyTransfer,
    canListPackages,
    createFromPackage,
    createPackage,
    createPackagePending: packageMutation.pending,
    createTransferPending: createTransferBusy,
    downloadPackage,
    downloadingPackageId,
    fetchData,
    fetchItems,
    fetchPackages,
    handleReset,
    handleSearch,
    itemQueryParams,
    items: itemsQuery.data,
    itemsError: itemsQuery.error,
    itemsLoading: itemsQuery.isFetching,
    operationKind: operationMutation.variables,
    packageQueryParams,
    packages: packagesQuery.data,
    packagesError: packagesQuery.error,
    packagesLoading: packagesQuery.isFetching,
    pageActive,
    previewTransfer,
    queryParams,
    refresh,
    rollbackTransfer,
    selectPackage,
    selectedPackage,
    selectedTransfer,
    selectTransfer,
    transfers: transfersQuery.data,
    transfersError: transfersQuery.error,
    transfersLoading: transfersQuery.isFetching,
    uploadPackage,
  }
}
