import { ref } from 'vue'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import type { ServerStateScope } from '@/shared/query/scope'

interface DelegationIntent {
  idempotencyKey: string
  signature: string
}

/** 管理个人委托命令的控制器、忙碌状态与会话范围幂等键所有权。 */
export function createServiceDelegationOperationState() {
  const createPending = ref(false)
  const revokingId = ref<string>()
  const controllers = new Set<AbortController>()
  const intentKeys = new Map<string, string>()
  let createController: AbortController | undefined
  let revokeController: AbortController | undefined

  function begin(): AbortController {
    const controller = new AbortController()
    controllers.add(controller)
    return controller
  }

  function beginCreate(): AbortController {
    const controller = begin()
    createController = controller
    createPending.value = true
    return controller
  }

  function beginRevoke(id: string): AbortController {
    const controller = begin()
    revokeController = controller
    revokingId.value = id
    return controller
  }

  function finishCreate(controller: AbortController): void {
    controllers.delete(controller)
    if (createController !== controller) return
    createController = undefined
    createPending.value = false
  }

  function finishRevoke(controller: AbortController): void {
    controllers.delete(controller)
    if (revokeController !== controller) return
    revokeController = undefined
    revokingId.value = undefined
  }

  function intent(scope: ServerStateScope, input: unknown): DelegationIntent {
    const signature = `${scope.tenantId}\u0000${scope.subjectId}\u0000${scope.sessionEpoch}\u0000${JSON.stringify(input)}`
    return {
      signature,
      idempotencyKey:
        intentKeys.get(signature) ?? createIdempotencyKey('profile-service-delegation'),
    }
  }

  function completeIntent(value: DelegationIntent): void {
    intentKeys.delete(value.signature)
  }

  function failIntent(value: DelegationIntent, error: unknown, scopeCurrent: boolean): void {
    if (scopeCurrent && shouldReuseIdempotencyKey(error)) {
      intentKeys.set(value.signature, value.idempotencyKey)
    } else {
      intentKeys.delete(value.signature)
    }
  }

  function invalidate(clearIntents: boolean): void {
    for (const controller of controllers) controller.abort()
    controllers.clear()
    if (clearIntents) intentKeys.clear()
    createController = undefined
    revokeController = undefined
    createPending.value = false
    revokingId.value = undefined
  }

  return {
    beginCreate,
    beginRevoke,
    completeIntent,
    createPending,
    failIntent,
    finishCreate,
    finishRevoke,
    intent,
    invalidate,
    revokingId,
  }
}
