import {
  computed,
  getCurrentScope,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
} from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  createProfileServiceDelegation,
  listProfileServiceDelegations,
  listProfileServiceDelegationTargets,
  revokeProfileServiceDelegation,
  type CreateProfileServiceDelegationInput,
  type CreatedProfileServiceDelegation,
  type ProfileServiceDelegation,
  type ProfileServiceDelegationTarget,
} from '@/api/modules/profileServiceDelegation'
import { HttpError, requireOperationData } from '@/shared/http/client'
import {
  createIdempotencyKey,
  shouldReuseIdempotencyKey,
} from '@/shared/http/idempotency'
import { queryClient, tenantQueryKey } from '@/shared/query/client'
import { SERVICE_ACCOUNTS_CAPABILITY } from '@/features/service-accounts/manifest'
import { useTenantContextStore } from '@/app/tenant-context'
import { useUserStore } from '@/stores/user'

const PROFILE_SERVICE_DELEGATIONS_RESOURCE = 'profile-service-delegations'
const PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE = 'profile-service-delegation-targets'
const QUERY_GC_TIME = 10 * 60_000

interface ProfileDelegationIdentity {
  tenantId: string
  userId: string
}

export type ProfileDelegationIdentityGuard = string

function sameIdentity(
  left: ProfileDelegationIdentity | undefined,
  right: ProfileDelegationIdentity | undefined,
): boolean {
  return left?.tenantId === right?.tenantId && left?.userId === right?.userId
}

/** 个人中心服务委托管理；一次性 Token 仅作为创建调用的局部返回值存在。 */
export function useServiceDelegationManagement() {
  const userStore = useUserStore()
  const tenantContext = useTenantContextStore()
  const pageActive = ref(true)
  const createPending = ref(false)
  const revokingId = ref<string>()
  const pendingControllers = new Set<AbortController>()
  const pendingKeys = new Map<string, string>()
  const identityChangedCallbacks = new Set<() => void>()
  const contextNonce = createIdempotencyKey('profile-delegation-context')
  let contextGeneration = 0
  let trackedIdentity = currentIdentity()

  function currentIdentity(): ProfileDelegationIdentity | undefined {
    if (
      userStore.sessionStatus !== 'authenticated'
      || !userStore.tenantId
      || !userStore.userId
    ) return undefined
    return {
      tenantId: userStore.tenantId,
      userId: String(userStore.userId),
    }
  }

  function requireIdentity(): ProfileDelegationIdentity {
    const identity = currentIdentity()
    if (!identity) {
      throw new HttpError('当前登录身份已失效', { status: 401, kind: 'http' })
    }
    return identity
  }

  function ensureCurrentIdentity(identity: ProfileDelegationIdentity): void {
    if (!sameIdentity(identity, currentIdentity())) {
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
    return snapshot !== undefined
      && pageActive.value
      && currentIdentity() !== undefined
      && snapshot === `${contextNonce}:${contextGeneration}`
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
    identity: ProfileDelegationIdentity,
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
      }
      catch {
        // 单个展示层回调异常不能阻断请求取消与旧身份缓存清理。
      }
    }
  }

  function delegationsKey(identity = currentIdentity()) {
    return tenantQueryKey(identity?.tenantId, PROFILE_SERVICE_DELEGATIONS_RESOURCE, {
      scope: 'self',
      userId: identity?.userId ?? 'anonymous',
    })
  }

  function targetsKey(identity = currentIdentity()) {
    return tenantQueryKey(identity?.tenantId, PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE, {
      scope: 'self',
      userId: identity?.userId ?? 'anonymous',
    })
  }

  const enabled = computed(() => (
    pageActive.value
    && currentIdentity() !== undefined
    && tenantContext.hasCapability(SERVICE_ACCOUNTS_CAPABILITY)
  ))

  const delegationsQuery = useQuery<readonly ProfileServiceDelegation[], HttpError>({
    queryKey: computed(() => delegationsKey()),
    enabled,
    queryFn: async ({ signal }) => requireOperationData(
      await listProfileServiceDelegations(signal),
    ),
    initialData: () => [],
    staleTime: 0,
    gcTime: QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const targetsQuery = useQuery<readonly ProfileServiceDelegationTarget[], HttpError>({
    queryKey: computed(() => targetsKey()),
    enabled,
    queryFn: async ({ signal }) => requireOperationData(
      await listProfileServiceDelegationTargets(signal),
    ),
    initialData: () => [],
    staleTime: 0,
    gcTime: QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const delegations = delegationsQuery.data
  const targets = targetsQuery.data
  const loading = delegationsQuery.isFetching
  const targetsLoading = targetsQuery.isFetching
  const error = delegationsQuery.error

  function beginController(): AbortController {
    const controller = new AbortController()
    pendingControllers.add(controller)
    return controller
  }

  function finishController(controller: AbortController): void {
    pendingControllers.delete(controller)
  }

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
    const signature = JSON.stringify(input)
    const idempotencyKey = pendingKeys.get(signature)
      ?? createIdempotencyKey('profile-service-delegation')
    const controller = beginController()
    createPending.value = true
    try {
      const result = requireOperationData(await createProfileServiceDelegation(
        input,
        idempotencyKey,
        controller.signal,
      ))
      ensureOperationContext(identity, operationContext)
      // 只写入不含 Token 的委托元数据；完整 Token 仅返回给发起调用的局部对话框。
      queryClient.setQueryData<readonly ProfileServiceDelegation[]>(
        delegationsKey(identity),
        current => [
          result.delegation,
          ...(current ?? []).filter(item => item.id !== result.delegation.id),
        ],
      )
      pendingKeys.delete(signature)
      return result
    }
    catch (error) {
      if (sameIdentity(identity, currentIdentity()) && shouldReuseIdempotencyKey(error)) {
        pendingKeys.set(signature, idempotencyKey)
      }
      else {
        pendingKeys.delete(signature)
      }
      throw error
    }
    finally {
      finishController(controller)
      createPending.value = false
    }
  }

  async function revokeDelegation(
    delegation: ProfileServiceDelegation,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    revokingId.value = delegation.id
    try {
      await revokeProfileServiceDelegation(delegation.id, controller.signal)
      ensureOperationContext(identity, operationContext)
      queryClient.setQueryData<readonly ProfileServiceDelegation[]>(
        delegationsKey(identity),
        current => current?.map(item => item.id === delegation.id
          ? { ...item, revoked_at: new Date().toISOString(), status: 'revoked' }
          : item),
      )
      void delegationsQuery.refetch({ throwOnError: false })
      void targetsQuery.refetch({ throwOnError: false })
    }
    finally {
      finishController(controller)
      if (revokingId.value === delegation.id) revokingId.value = undefined
    }
  }

  function cancelIdentityQueries(
    identity: ProfileDelegationIdentity,
    remove: boolean,
  ): void {
    for (const resource of [
      PROFILE_SERVICE_DELEGATIONS_RESOURCE,
      PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE,
    ]) {
      const prefix = ['server-state', identity.tenantId, resource]
      void queryClient.cancelQueries({ queryKey: prefix })
      if (remove) queryClient.removeQueries({ queryKey: prefix })
    }
  }

  const unsubscribeUser = userStore.$subscribe(() => {
    const nextIdentity = currentIdentity()
    if (sameIdentity(trackedIdentity, nextIdentity)) return
    const previousIdentity = trackedIdentity
    trackedIdentity = nextIdentity
    contextGeneration += 1
    notifyIdentityChanged()
    for (const controller of pendingControllers) controller.abort()
    pendingControllers.clear()
    pendingKeys.clear()
    if (previousIdentity) cancelIdentityQueries(previousIdentity, true)
  }, { flush: 'sync' })

  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    void refresh()
  })
  onDeactivated(() => {
    pageActive.value = false
    contextGeneration += 1
    notifyIdentityChanged()
    for (const controller of pendingControllers) controller.abort()
    pendingControllers.clear()
    const identity = currentIdentity()
    if (identity) cancelIdentityQueries(identity, false)
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      pageActive.value = false
      contextGeneration += 1
      notifyIdentityChanged()
      for (const controller of pendingControllers) controller.abort()
      pendingControllers.clear()
      pendingKeys.clear()
      identityChangedCallbacks.clear()
      unsubscribeUser()
    })
  }

  return {
    captureIdentity,
    createPending,
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
    revokingId,
    targets,
    targetsError: targetsQuery.error,
    targetsLoading,
  }
}
