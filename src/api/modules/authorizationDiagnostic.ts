import type { ApiSchema } from '@/api/contract'
import { get_system_authorization_diagnostics_users_by_id } from '@/api/generated/operations/system'

export type AuthorizationDiagnostic = ApiSchema<'AuthorizationDiagnosticVo'>

/** 从主库重新计算指定用户的最终授权并返回只读诊断结果。 */
export function getAuthorizationDiagnostic(userId: string, signal?: AbortSignal) {
  return get_system_authorization_diagnostics_users_by_id({
    path: { id: userId },
    signal,
  })
}
