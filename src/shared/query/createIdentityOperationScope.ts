import { createIdempotencyKey } from '@/shared/http/idempotency'

export type IdentityOperationGuard = string

interface IdentityOperationScopeOptions<Identity> {
  currentIdentity: () => Identity | undefined
  isActive: () => boolean
  sameIdentity: (left: Identity | undefined, right: Identity | undefined) => boolean
}

/**
 * 管理与登录身份和 KeepAlive 页面生命周期绑定的命令上下文。
 * 它只负责代次、请求中止与失效通知，不持有任何服务端状态。
 */
export function createIdentityOperationScope<Identity>(
  options: IdentityOperationScopeOptions<Identity>,
) {
  const nonce = createIdempotencyKey('identity-operation-context')
  const controllers = new Set<AbortController>()
  const invalidationCallbacks = new Set<() => void>()
  let generation = 0

  function capture(): IdentityOperationGuard | undefined {
    return options.isActive() && options.currentIdentity() ? `${nonce}:${generation}` : undefined
  }

  function matches(guard: IdentityOperationGuard | undefined): boolean {
    return (
      guard !== undefined &&
      options.isActive() &&
      options.currentIdentity() !== undefined &&
      guard === `${nonce}:${generation}`
    )
  }

  function isCurrentIdentity(identity: Identity): boolean {
    return options.sameIdentity(identity, options.currentIdentity())
  }

  function beginController(): AbortController {
    const controller = new AbortController()
    controllers.add(controller)
    return controller
  }

  function finishController(controller: AbortController): void {
    controllers.delete(controller)
  }

  function onInvalidated(callback: () => void): () => void {
    invalidationCallbacks.add(callback)
    return () => invalidationCallbacks.delete(callback)
  }

  function invalidate(): void {
    generation += 1
    for (const controller of controllers) controller.abort()
    controllers.clear()
    for (const callback of invalidationCallbacks) {
      try {
        callback()
      } catch {
        // 单个展示层回调异常不能阻断其余请求取消与安全材料清理。
      }
    }
  }

  function dispose(): void {
    invalidate()
    invalidationCallbacks.clear()
  }

  return {
    beginController,
    capture,
    dispose,
    finishController,
    invalidate,
    isCurrentIdentity,
    matches,
    onInvalidated,
  }
}
