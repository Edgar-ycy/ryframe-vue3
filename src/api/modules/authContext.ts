import { requestOperation } from '@/api/operationRequest'
import { get_auth_context } from '@/api/generated/operations'

export function getAuthContext(signal?: AbortSignal) {
  return requestOperation(get_auth_context, {
    signal,
  })
}
