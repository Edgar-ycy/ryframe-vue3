import { computed, ref } from 'vue'
import { usePermission } from '@/hooks/usePermission'
import { HttpError } from '@/shared/http/client'
import { getServerStateScope, isServerStateScopeCurrent } from '@/shared/query/client'
import { createIdentityOperationScope } from '@/shared/query/createIdentityOperationScope'
import { SERVICE_ACCOUNTS_CAPABILITY } from '@/features/service-accounts/manifest'
import { useTenantContextStore } from '@/stores/tenantContext'
import { useUserStore } from '@/stores/user'
import {
  sameServiceAccountScope,
  type ServiceAccountScope,
  type ServiceAccountIdentityGuard,
} from './serviceAccountContextTypes'

/** 服务账号页面的身份、能力、权限与操作守卫。 */
export function useServiceAccountIdentityContext() {
  const userStore = useUserStore()
  const tenantContext = useTenantContextStore()
  const { hasPermission } = usePermission()
  const pageActive = ref(true)
  const featureAvailable = computed(() => tenantContext.hasCapability(SERVICE_ACCOUNTS_CAPABILITY))
  const canListAccounts = computed(() => hasPermission('system:service-account:list'))
  const canAddAccount = computed(() => hasPermission('system:service-account:add'))
  const canEditAccount = computed(() => hasPermission('system:service-account:edit'))
  const canRemoveAccount = computed(() => hasPermission('system:service-account:remove'))
  const canListDepartments = computed(() => hasPermission('system:dept:list'))
  const canListRoles = computed(() => hasPermission('system:role:list'))
  const canManageRoles = computed(
    () => hasPermission('system:service-account:role') && canListRoles.value,
  )
  const canRotateKey = computed(() => hasPermission('system:service-account:key-rotate'))
  const canRevokeKey = computed(() => hasPermission('system:service-account:key-revoke'))
  const canListDelegations = computed(() => hasPermission('system:service-delegation:list'))
  const canRevokeDelegation = computed(() => hasPermission('system:service-delegation:revoke'))
  const canListAudits = computed(() => hasPermission('system:service-access-audit:list'))

  function currentIdentity(): ServiceAccountScope | undefined {
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
    sameIdentity: sameServiceAccountScope,
  })

  function requireIdentity(): ServiceAccountScope {
    const identity = currentIdentity()
    if (!identity) throw new HttpError('当前登录身份已失效', { status: 401, kind: 'http' })
    return identity
  }

  function ensureCurrentIdentity(scope: ServiceAccountScope): void {
    if (!isServerStateScopeCurrent(scope)) {
      throw new HttpError('登录身份已经切换', { kind: 'cancelled' })
    }
  }

  /** 捕获不包含租户或用户信息的当前上下文守卫。 */
  function captureIdentity(): ServiceAccountIdentityGuard | undefined {
    return operationScope.capture()
  }

  function identityMatches(snapshot: ServiceAccountIdentityGuard | undefined): boolean {
    return operationScope.matches(snapshot)
  }

  function requireOperationContext(
    snapshot: ServiceAccountIdentityGuard | undefined,
  ): ServiceAccountIdentityGuard {
    if (!identityMatches(snapshot) || snapshot === undefined) {
      throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    }
    return snapshot
  }

  function ensureOperationContext(
    identity: ServiceAccountScope,
    snapshot: ServiceAccountIdentityGuard,
  ): void {
    ensureCurrentIdentity(identity)
    requireOperationContext(snapshot)
  }

  /** 注册身份失效回调，供 UI 同步关闭并清空一次性安全材料。 */
  function onIdentityChanged(callback: () => void): () => void {
    return operationScope.onInvalidated(callback)
  }

  function beginController(): AbortController {
    return operationScope.beginController()
  }

  function finishController(controller: AbortController): void {
    operationScope.finishController(controller)
  }

  return {
    beginController,
    canAddAccount,
    canEditAccount,
    canListAccounts,
    canListAudits,
    canListDepartments,
    canListDelegations,
    canListRoles,
    canManageRoles,
    canRemoveAccount,
    canRevokeDelegation,
    canRevokeKey,
    canRotateKey,
    captureIdentity,
    currentIdentity,
    ensureCurrentIdentity,
    ensureOperationContext,
    featureAvailable,
    finishController,
    identityMatches,
    onIdentityChanged,
    operationScope,
    pageActive,
    requireIdentity,
    requireOperationContext,
  }
}
