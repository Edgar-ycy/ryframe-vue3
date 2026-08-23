import { nextTick } from 'vue'
import {
  getTenantConfigTransfer,
  type TenantConfigTransfer,
} from '@/api/modules/tenantConfigTransfer'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { queryClient } from '@/shared/query/client'
import type { IdentityOperationGuard } from '@/shared/query/createIdentityOperationScope'
import { isActiveTenantConfigTransfer } from '../presentation'
import { useTenantConfigTransferQueries, type TenantConfigIdentity } from './useTenantConfigTransferQueries'

interface CommandOperationScope {
  beginController: () => AbortController
  capture: () => IdentityOperationGuard | undefined
  finishController: (controller: AbortController) => void
  matches: (guard: IdentityOperationGuard | undefined) => boolean
}

export interface TenantConfigTransferCommandsOptions {
  abortActiveCycle: () => void
  currentIdentity: () => TenantConfigIdentity | undefined
  isCurrentIdentity: (identity: TenantConfigIdentity) => boolean
  operationScope: CommandOperationScope
  queries: ReturnType<typeof useTenantConfigTransferQueries>
  scheduleActiveCycle: () => void
}

/** 配置迁移命令共享的身份守卫、缓存协调和幂等上下文。 */
export function useTenantConfigTransferCommandContext(options: TenantConfigTransferCommandsOptions) {
  const pendingIntentKeys = new Map<string, string>()
  const { queries } = options
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
  } = queries

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
      const latest = requireOperationData(await getTenantConfigTransfer(transferId, controller.signal))
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

  function clearPendingIntents(): void {
    pendingIntentKeys.clear()
  }

  return {
    cancelListBeforeMerge,
    clearPendingIntents,
    currentIdentity: options.currentIdentity,
    ensureOperationContext,
    mergePackage,
    mergeTransfer,
    operationContextMatches,
    operationScope: options.operationScope,
    packageQueryParams,
    packagesQuery,
    queries,
    reconcileTransferError,
    removeTransfer,
    requireIdentity,
    requireOperationContext,
    runIdempotent,
    scheduleActiveCycle: options.scheduleActiveCycle,
    selectFirstListPage,
    selectedTransfer,
  }
}
