import { get_auth_context } from '@/api/generated/operations/core'

export function getAuthContext(signal?: AbortSignal) {
  return get_auth_context({
    signal,
  })
}
