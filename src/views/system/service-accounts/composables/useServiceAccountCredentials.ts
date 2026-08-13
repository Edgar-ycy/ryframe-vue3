import { ref } from 'vue'
import {
  createServiceCredential,
  revokeServiceCredential,
  type CreateServiceCredentialInput,
  type CreatedServiceCredential,
  type ServiceCredential,
} from '@/api/modules/serviceAccount'
import { requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { queryClient } from '@/shared/query/client'
import {
  sameServiceAccountIdentity,
  useServiceAccountContext,
} from './useServiceAccountContext'

/** Credential 元数据、幂等签发与撤销；一次性 Secret 只经函数结果返回。 */
export function useServiceAccountCredentials(context: ReturnType<typeof useServiceAccountContext>) {
  const {
    beginController, canListAccounts, captureIdentity, credentialsKey, credentialsQuery,
    currentIdentity, ensureOperationContext, finishController, pageActive,
    requireIdentity, requireOperationContext, selectedAccount,
  } = context
  const issueCredentialPending = ref(false)
  const revokingCredentialId = ref<string>()
  const pendingCredentialKeys = new Map<string, string>()

  async function issueCredential(
    accountId: string,
    input: CreateServiceCredentialInput,
    expectedIdentity = captureIdentity(),
  ): Promise<CreatedServiceCredential> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const signature = JSON.stringify({ accountId, input })
    const idempotencyKey = pendingCredentialKeys.get(signature)
      ?? createIdempotencyKey('service-credential')
    const controller = beginController()
    issueCredentialPending.value = true
    try {
      const result = requireOperationData(await createServiceCredential(
        accountId,
        input,
        idempotencyKey,
        controller.signal,
      ))
      ensureOperationContext(identity, operationContext)
      // 只缓存不含 Secret 的元数据；完整结果仅经本次函数返回给局部对话框。
      queryClient.setQueryData<readonly ServiceCredential[]>(
        credentialsKey(identity, accountId),
        current => [
          result.credential,
          ...(current ?? []).filter(item => item.id !== result.credential.id),
        ],
      )
      pendingCredentialKeys.delete(signature)
      return result
    }
    catch (error) {
      if (
        sameServiceAccountIdentity(identity, currentIdentity())
        && shouldReuseIdempotencyKey(error)
      ) {
        pendingCredentialKeys.set(signature, idempotencyKey)
      }
      else {
        pendingCredentialKeys.delete(signature)
      }
      throw error
    }
    finally {
      finishController(controller)
      issueCredentialPending.value = false
    }
  }

  async function fetchCredentials(): Promise<void> {
    if (
      !pageActive.value
      || !currentIdentity()
      || !canListAccounts.value
      || !selectedAccount.value
    ) return
    await credentialsQuery.refetch({ throwOnError: true })
  }

  async function revokeCredential(
    accountId: string,
    credential: ServiceCredential,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    revokingCredentialId.value = credential.id
    try {
      await revokeServiceCredential(accountId, credential.id, controller.signal)
      ensureOperationContext(identity, operationContext)
      queryClient.setQueryData<readonly ServiceCredential[]>(
        credentialsKey(identity, accountId),
        current => current?.map(item => item.id === credential.id
          ? { ...item, revoked_at: new Date().toISOString(), status: 'revoked' }
          : item),
      )
      if (selectedAccount.value?.id === accountId) {
        void credentialsQuery.refetch({ throwOnError: false })
      }
    }
    finally {
      finishController(controller)
      if (revokingCredentialId.value === credential.id) {
        revokingCredentialId.value = undefined
      }
    }
  }

  function clearPendingCredentialKeys(): void {
    pendingCredentialKeys.clear()
  }

  return {
    clearPendingCredentialKeys, fetchCredentials, issueCredential,
    issueCredentialPending, revokeCredential, revokingCredentialId,
  }
}
