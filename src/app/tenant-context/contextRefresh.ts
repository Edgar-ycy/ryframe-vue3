import type { Router } from 'vue-router'
import type { TenantBusinessState } from '@/features/session/contracts'
import { getRouteRuntime } from '@/app/navigation/runtime'
import {
  accessResultPath,
  matchedRouteAccessResult,
  registeredPageAccessResult,
  type RouteAccessContext,
  type RouteAccessResult,
} from '@/features/navigation/routeAccess'
import type { TenantContextObservation } from '@/shared/http/session'
import { invalidateActiveServerStateScope } from '@/shared/query/client'
import { useRuntimeCapabilitiesStore } from '@/stores/runtimeCapabilities'
import { useTagsViewStore } from '@/stores/tagsView'
import { useUserStore } from '@/stores/user'
import { assertSessionEpoch, getSessionEpoch } from '@/app/session/state'
import { ensureTenantContextLoaded, refreshTenantContext } from './coordinator'
import { useTenantContextStore } from '@/stores/tenantContext'

export interface TenantContextChangedFrame {
  v: 1
  type: 'tenant_context_changed'
  authorization_epoch: number
  runtime_epoch: string
  placement_generation: string
  business_data_state: TenantBusinessState
}

let queuedObservation: TenantContextObservation = {}
let refreshPromise: Promise<void> | undefined
let observationGeneration = 0

/** HTTP 四响应头共享入口；只要任一值变化，就合并为一次强一致上下文刷新。 */
export function observeTenantContext(observation: TenantContextObservation): void {
  void scheduleTenantContextRefresh(observation).catch(() => undefined)
}

/** WebSocket 只传版本/状态提示，权限、菜单和能力明细始终重新读取。 */
export function notifyTenantContextChanged(frame: TenantContextChangedFrame): Promise<void> {
  return scheduleTenantContextRefresh({
    authorizationEpoch: String(frame.authorization_epoch),
    runtimeEpoch: frame.runtime_epoch,
    placementGeneration: frame.placement_generation,
    businessDataState: frame.business_data_state,
  })
}

export function resetTenantContextObservation(): void {
  observationGeneration += 1
  queuedObservation = {}
  refreshPromise = undefined
}

export function synchronizeTenantContextUi(options?: {
  skipAuthRefresh?: boolean
  refreshContext?: boolean
}): Promise<void> {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.userId) return Promise.resolve()
  return performTenantContextUiSynchronization(options)
}

function scheduleTenantContextRefresh(observation: TenantContextObservation): Promise<void> {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.userId) return Promise.resolve()
  queuedObservation = { ...queuedObservation, ...observation }
  if (refreshPromise) return refreshPromise

  const generation = observationGeneration
  const pending = drainTenantContextRefreshes(generation).finally(() => {
    if (refreshPromise !== pending) return
    refreshPromise = undefined
    if (generation === observationGeneration && hasObservation(queuedObservation)) {
      void scheduleTenantContextRefresh({}).catch(() => undefined)
    }
  })
  refreshPromise = pending
  return pending
}

async function drainTenantContextRefreshes(generation: number): Promise<void> {
  while (generation === observationGeneration && hasObservation(queuedObservation)) {
    // 让同一事件循环内的多个响应头/实时通知先聚合。
    await Promise.resolve()
    const observation = queuedObservation
    queuedObservation = {}
    const context = useTenantContextStore()
    if (context.status === 'loading') {
      // 响应头可能恰好在一次独立的 /auth/context 请求期间到达。先等待该快照落地，
      // 再比较版本；直接忽略会丢失在请求发出之后发生的上下文变化。
      try {
        await ensureTenantContextLoaded()
      } catch {
        // ensureLoaded 已 fail-closed；后续显式刷新或导航会重试，不能保留旧授权。
        continue
      }
      if (generation !== observationGeneration) return
    }
    if (!tenantContextDiffers(observation)) continue
    await synchronizeTenantContextUi()
  }
}

function tenantContextDiffers(observation: TenantContextObservation): boolean {
  const context = useTenantContextStore()
  // loading 状态已经由 drainTenantContextRefreshes 等待完成，不应在这里吞掉观察值。
  if (context.status === 'loading') return true
  if (context.status !== 'loaded') return true
  return (
    (observation.authorizationEpoch !== undefined &&
      observation.authorizationEpoch !== context.authorizationEpoch) ||
    (observation.runtimeEpoch !== undefined && observation.runtimeEpoch !== context.runtimeEpoch) ||
    (observation.placementGeneration !== undefined &&
      observation.placementGeneration !== context.businessData?.placement_generation) ||
    (observation.businessDataState !== undefined &&
      observation.businessDataState !== context.businessData?.state)
  )
}

async function performTenantContextUiSynchronization(options?: {
  skipAuthRefresh?: boolean
  refreshContext?: boolean
}): Promise<void> {
  let expectedSessionEpoch = getSessionEpoch()
  const user = useUserStore()
  const tenantId = user.tenantId
  const userId = String(user.userId)
  const runtime = getRouteRuntime()
  if (!runtime) return

  if (options?.refreshContext !== false) {
    try {
      await refreshTenantContext()
    } catch (error) {
      // 强一致上下文无法取得时，不能继续保留上一个快照安装的页面与标签。
      // 身份和 token 仍由会话协调器负责恢复，但所有租户授权投影立即失效。
      runtime.resetDynamicRoutes()
      useTagsViewStore().closeAllViews()
      await invalidateActiveServerStateScope()
      if (isSameIdentity(tenantId, userId) && runtime.router.currentRoute.value.path !== '/503') {
        await runtime.router.replace('/503')
      }
      throw error
    }
    expectedSessionEpoch = getSessionEpoch()
  }
  assertSessionEpoch(expectedSessionEpoch)
  if (!isSameIdentity(tenantId, userId)) return
  await runtime.refreshAccessibleRoutes(options)
  assertSessionEpoch(expectedSessionEpoch)
  if (!isSameIdentity(tenantId, userId)) return

  pruneInaccessibleViews(runtime.router)
  const currentPath = runtime.router.currentRoute.value.fullPath
  const accessResult = pathAccessResult(runtime.router, currentPath)
  const replacement = accessResultPath(accessResult)
  if (replacement) await runtime.router.replace(replacement)
  await invalidateActiveServerStateScope()
}

function pruneInaccessibleViews(router: Router): void {
  const tags = useTagsViewStore()
  for (const view of [...tags.visitedViews]) {
    if (pathAccessResult(router, view.path) !== 'allowed') tags.removeView(view)
  }
}

function pathAccessResult(router: Router, path: string): RouteAccessResult {
  const context = currentRouteAccessContext()
  let resolved: ReturnType<Router['resolve']>
  try {
    resolved = router.resolve(path)
  } catch {
    return registeredPageAccessResult(path, context)
  }
  if (
    resolved.matched.length === 0 ||
    resolved.matched.some((record) => record.path === '/:pathMatch(.*)*')
  )
    return registeredPageAccessResult(path, context)

  return matchedRouteAccessResult(
    resolved.matched.map((record) => record.meta),
    context,
  )
}

function currentRouteAccessContext(): RouteAccessContext {
  const user = useUserStore()
  const runtimeCapabilities = useRuntimeCapabilitiesStore()
  const tenantContext = useTenantContextStore()
  return {
    capabilities: tenantContext.capabilityCodes,
    multiTenancyEnabled: runtimeCapabilities.multiTenancyEnabled,
    permissions: user.permissions,
  }
}

function isSameIdentity(tenantId: string, userId: string): boolean {
  const user = useUserStore()
  return (
    user.sessionStatus === 'authenticated' &&
    user.tenantId === tenantId &&
    String(user.userId) === userId
  )
}

function hasObservation(observation: TenantContextObservation): boolean {
  return Object.keys(observation).length > 0
}
