import { nextTick, ref } from 'vue'
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
import { HttpError, requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { queryClient } from '@/shared/query/client'
import type { IdentityOperationGuard } from '@/shared/query/createIdentityOperationScope'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useUserStore } from '@/stores/user'
import { isActiveTenantConfigTransfer } from '../presentation'
import {
  TENANT_CONFIG_PACKAGES_RESOURCE,
  TENANT_CONFIG_TRANSFERS_RESOURCE,
} from '../queryResources'
import { tenantConfigTransferFileFingerprint } from './tenantConfigTransferFileFingerprint'
import {
  useTenantConfigTransferQueries,
  type TenantConfigIdentity,
} from './useTenantConfigTransferQueries'

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

interface CommandOperationScope {
  beginController: () => AbortController
  capture: () => IdentityOperationGuard | undefined
  finishController: (controller: AbortController) => void
  matches: (guard: IdentityOperationGuard | undefined) => boolean
}

interface TenantConfigTransferCommandsOptions {
  abortActiveCycle: () => void
  currentIdentity: () => TenantConfigIdentity | undefined
  isCurrentIdentity: (identity: TenantConfigIdentity) => boolean
  operationScope: CommandOperationScope
  queries: ReturnType<typeof useTenantConfigTransferQueries>
  scheduleActiveCycle: () => void
}

function safePackageFilename(bundle: TenantConfigBundle): string {
  const tenant = bundle.source_tenant_key.replace(/[^a-zA-Z0-9._-]+/gu, '-') || 'tenant'
  const timestamp = bundle.created_at.replace(/[^0-9]+/gu, '').slice(0, 14)
  return `${tenant}-${timestamp || 'config'}.ryframe-config.zip`
}

/** 配置迁移的上传、创建、幂等命令、冲突对账与下载操作。 */
export function useTenantConfigTransferCommands(options: TenantConfigTransferCommandsOptions) {
  const userStore = useUserStore()
  const createTransferBusy = ref(false)
  const downloadingPackageId = ref<string>()
  const pendingIntentKeys = new Map<string, string>()
  const {
    activePackageQueryParams,
    activeQueryParams,
    mergePackage,
    mergeTransfer: mergeTransferCache,
    packageListKey,
    packageQueryParams,
    packagesQuery,
    queryParams,
    removeTransfer: removeTransferCache,
    selectedTransfer,
    transferListKey,
    transfersQuery,
  } = options.queries

  function mergeTransfer(identity: TenantConfigIdentity, transfer: TenantConfigTransfer): void {
    mergeTransferCache(identity, transfer)
    if (isActiveTenantConfigTransfer(transfer)) return
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

  const createTransferMutation = useTenantMutation<TenantConfigTransfer, CreateTransferCommand>(
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

  const operationMutation = useTenantMutation<TenantConfigTransfer, TransferOperationCommand>(
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
    const identity = options.currentIdentity()
    if (!identity) throw new HttpError('当前登录身份已经失效', { status: 401, kind: 'http' })
    return identity
  }

  function requireOperationContext(): IdentityOperationGuard {
    const guard = options.operationScope.capture()
    if (!guard) throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    return guard
  }

  function operationContextMatches(
    identity: TenantConfigIdentity,
    guard: IdentityOperationGuard,
  ): boolean {
    return options.isCurrentIdentity(identity) && options.operationScope.matches(guard)
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
    options.abortActiveCycle()
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
    const controller = options.operationScope.beginController()
    try {
      const result = await execute(idempotencyKey, controller)
      ensureOperationContext(identity, guard)
      pendingIntentKeys.delete(signature)
      return result
    }
    catch (error) {
      // 页面失活时服务端结果可能已提交，同一身份保留幂等键供恢复后重试。
      if (options.isCurrentIdentity(identity) && shouldReuseIdempotencyKey(error)) {
        pendingIntentKeys.set(signature, idempotencyKey)
      }
      else {
        pendingIntentKeys.delete(signature)
      }
      throw error
    }
    finally {
      options.operationScope.finishController(controller)
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
    const controller = options.operationScope.beginController()
    try {
      const latest = requireOperationData(await getTenantConfigTransfer(
        transferId,
        controller.signal,
      ))
      ensureOperationContext(identity, guard)
      mergeTransfer(identity, latest)
    }
    catch (detailError) {
      if (
        detailError instanceof HttpError
        && (detailError.status === 403 || detailError.status === 404)
      ) removeTransfer(identity, transferId)
    }
    finally {
      options.operationScope.finishController(controller)
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
    options.scheduleActiveCycle()
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
      options.scheduleActiveCycle()
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
      const transfer = await runIdempotent(
        identity,
        guard,
        `upload:${contentSha256}`,
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
      options.scheduleActiveCycle()
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
      options.scheduleActiveCycle()
      return latest
    }
    catch (error) {
      await reconcileTransferError(identity, guard, transfer.id, error)
      throw error
    }
  }

  async function downloadPackage(bundle: TenantConfigBundle): Promise<void> {
    if (downloadingPackageId.value) return
    const identity = requireIdentity()
    const guard = requireOperationContext()
    const controller = options.operationScope.beginController()
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
      options.operationScope.finishController(controller)
      if (downloadingPackageId.value === bundle.id) downloadingPackageId.value = undefined
    }
  }

  function clearPendingIntents(): void {
    pendingIntentKeys.clear()
  }

  return {
    applyPending: operationMutation.pending,
    applyTransfer: (transfer: TenantConfigTransfer) => runTransferOperation('apply', transfer),
    clearPendingIntents,
    createFromPackage,
    createPackage,
    createPackagePending: packageMutation.pending,
    createTransferPending: createTransferBusy,
    downloadPackage,
    downloadingPackageId,
    ensureOperationContext,
    mergeTransfer,
    operationKind: operationMutation.variables,
    previewTransfer: (transfer: TenantConfigTransfer) => runTransferOperation('preview', transfer),
    removeTransfer,
    requireIdentity,
    requireOperationContext,
    rollbackTransfer: (transfer: TenantConfigTransfer) => runTransferOperation('rollback', transfer),
    uploadPackage,
  }
}
