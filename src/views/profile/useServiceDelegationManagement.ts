import {
  computed,
  getCurrentScope,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  watch,
} from 'vue'
import {
  createProfileServiceDelegation,
  revokeProfileServiceDelegation,
  type CreateProfileServiceDelegationInput,
  type CreatedProfileServiceDelegation,
  type ProfileServiceDelegation,
} from '@/api/modules/profileServiceDelegation'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey } from '@/shared/http/idempotency'
import {
  getServerStateScope,
  isServerStateScopeCurrent,
  queryClient,
  serverStateResourcePrefix,
  useServerStateScope,
} from '@/shared/query/client'
import { SERVICE_ACCOUNTS_CAPABILITY } from '@/features/service-accounts/manifest'
import { useTenantContextStore } from '@/stores/tenantContext'
import { useUserStore } from '@/stores/user'
import {
  PROFILE_SERVICE_DELEGATIONS_RESOURCE,
  PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE,
  sameIdentity,
  type ProfileDelegationScope,
  type ProfileDelegationIdentityGuard,
} from './serviceDelegationSupport'
import { createServiceDelegationOperationState } from './serviceDelegationOperationState'
import { useServiceDelegationQueries } from './useServiceDelegationQueries'

export type { ProfileDelegationIdentityGuard } from './serviceDelegationSupport'

/** 个人中心服务委托管理；一次性 Token 仅作为创建调用的局部返回值存在。 */
export function useServiceDelegationManagement() {
  const userStore = useUserStore()
  const tenantContext = useTenantContextStore()
  const pageActive = ref(true)
  const operations = createServiceDelegationOperationState()
  const identityChangedCallbacks = new Set<() => void>()
  const contextNonce = createIdempotencyKey('profile-delegation-context')
  let contextGeneration = 0
  let trackedScope = currentIdentity()

  function currentIdentity(): ProfileDelegationScope | undefined {
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

  function requireIdentity(): ProfileDelegationScope {
    const identity = currentIdentity()
    if (!identity) {
      throw new HttpError('当前登录身份已失效', { status: 401, kind: 'http' })
    }
    return identity
  }

  function ensureCurrentIdentity(scope: ProfileDelegationScope): void {
    if (!isServerStateScopeCurrent(scope)) {
      throw new HttpError('登录身份已经切换', { kind: 'cancelled' })
    }
  }

  /** 捕获不包含租户或用户信息的当前上下文守卫。 */
  function captureIdentity(): ProfileDelegationIdentityGuard | undefined {
    return pageActive.value && currentIdentity()
      ? `${contextNonce}:${contextGeneration}`
      : undefined
  }

  function identityMatches(snapshot: ProfileDelegationIdentityGuard | undefined): boolean {
    return (
      snapshot !== undefined &&
      pageActive.value &&
      currentIdentity() !== undefined &&
      snapshot === `${contextNonce}:${contextGeneration}`
    )
  }

  function requireOperationContext(
    snapshot: ProfileDelegationIdentityGuard | undefined,
  ): ProfileDelegationIdentityGuard {
    if (!identityMatches(snapshot)) {
      throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    }
    if (snapshot === undefined) {
      throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    }
    return snapshot
  }

  function ensureOperationContext(
    identity: ProfileDelegationScope,
    snapshot: ProfileDelegationIdentityGuard,
  ): void {
    ensureCurrentIdentity(identity)
    requireOperationContext(snapshot)
  }

  /** 注册身份失效回调，供 UI 同步关闭并清空一次性安全材料。 */
  function onIdentityChanged(callback: () => void): () => void {
    identityChangedCallbacks.add(callback)
    return () => identityChangedCallbacks.delete(callback)
  }

  function notifyIdentityChanged(): void {
    for (const callback of identityChangedCallbacks) {
      try {
        callback()
      } catch {
        // 单个展示层回调异常不能阻断请求取消与旧身份缓存清理。
      }
    }
  }

  const enabled = computed(
    () =>
      pageActive.value &&
      currentIdentity() !== undefined &&
      tenantContext.hasCapability(SERVICE_ACCOUNTS_CAPABILITY),
  )

  const { delegationsKey, delegationsQuery, targetsQuery } = useServiceDelegationQueries(
    enabled,
    currentIdentity,
  )

  const delegations = delegationsQuery.data
  const targets = targetsQuery.data
  const loading = delegationsQuery.isFetching
  const targetsLoading = targetsQuery.isFetching
  const error = delegationsQuery.error

  async function refresh(): Promise<void> {
    if (!enabled.value) return
    await Promise.all([
      delegationsQuery.refetch({ throwOnError: true }),
      targetsQuery.refetch({ throwOnError: true }),
    ])
  }

  async function issueDelegation(
    input: CreateProfileServiceDelegationInput,
    expectedIdentity = captureIdentity(),
  ): Promise<CreatedProfileServiceDelegation> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const intent = operations.intent(identity, input)
    const controller = operations.beginCreate()
    try {
      const result = requireOperationData(
        await createProfileServiceDelegation(input, intent.idempotencyKey, controller.signal),
      )
      ensureOperationContext(identity, operationContext)
      // 只写入不含 Token 的委托元数据；完整 Token 仅返回给发起调用的局部对话框。
      queryClient.setQueryData<readonly ProfileServiceDelegation[]>(
        delegationsKey(identity),
        (current) => [
          result.delegation,
          ...(current ?? []).filter((item) => item.id !== result.delegation.id),
        ],
      )
      operations.completeIntent(intent)
      return result
    } catch (error) {
      operations.failIntent(intent, error, isServerStateScopeCurrent(identity))
      throw error
    } finally {
      operations.finishCreate(controller)
    }
  }

  async function revokeDelegation(
    delegation: ProfileServiceDelegation,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = operations.beginRevoke(delegation.id)
    try {
      await revokeProfileServiceDelegation(delegation.id, controller.signal)
      ensureOperationContext(identity, operationContext)
      queryClient.setQueryData<readonly ProfileServiceDelegation[]>(
        delegationsKey(identity),
        (current) =>
          current?.map((item) =>
            item.id === delegation.id
              ? { ...item, revoked_at: new Date().toISOString(), status: 'revoked' }
              : item,
          ),
      )
      void delegationsQuery.refetch({ throwOnError: false })
      void targetsQuery.refetch({ throwOnError: false })
    } finally {
      operations.finishRevoke(controller)
    }
  }

  function cancelScopeQueries(scope: ProfileDelegationScope, remove: boolean): void {
    for (const resource of [
      PROFILE_SERVICE_DELEGATIONS_RESOURCE,
      PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE,
    ]) {
      const prefix = serverStateResourcePrefix(scope, resource)
      void queryClient.cancelQueries({ queryKey: prefix })
      if (remove) queryClient.removeQueries({ queryKey: prefix })
    }
  }

  const stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      const nextScope = currentIdentity()
      if (sameIdentity(trackedScope, nextScope)) return
      const previousScope = trackedScope
      trackedScope = nextScope
      contextGeneration += 1
      notifyIdentityChanged()
      operations.invalidate(true)
      if (previousScope) cancelScopeQueries(previousScope, true)
    },
    { flush: 'sync' },
  )

  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    void refresh()
  })
  onDeactivated(() => {
    pageActive.value = false
    contextGeneration += 1
    notifyIdentityChanged()
    operations.invalidate(false)
    const scope = currentIdentity()
    if (scope) cancelScopeQueries(scope, false)
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      pageActive.value = false
      contextGeneration += 1
      notifyIdentityChanged()
      operations.invalidate(true)
      identityChangedCallbacks.clear()
      stopScopeWatch()
    })
  }

  return {
    captureIdentity,
    createPending: operations.createPending,
    delegations,
    error,
    issueDelegation,
    identityMatches,
    loading,
    onIdentityChanged,
    onIdentityInvalidated: onIdentityChanged,
    pageActive,
    refresh,
    revokeDelegation,
    revokingId: operations.revokingId,
    targets,
    targetsError: targetsQuery.error,
    targetsLoading,
  }
}
