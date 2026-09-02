import type { ApiSchema, OperationJsonBody } from '@/api/contract'
import {
  delete_profile_service_delegations_by_id,
  get_profile_service_delegations,
  get_profile_service_delegations_capabilities,
  post_profile_service_delegations,
} from '@/api/generated/operations/core'

export type ProfileServiceDelegation = ApiSchema<'ServiceDelegationVo'>
export type CreatedProfileServiceDelegation = ApiSchema<'CreatedServiceDelegationVo'>
export type ProfileServiceDelegationTarget = ApiSchema<'ServiceDelegationTargetResponse'>
export type ProfileServiceCapability = ApiSchema<'ServiceCapabilityVo'>
export type CreateProfileServiceDelegationInput =
  OperationJsonBody<'post_profile_service_delegations'>

/** 读取当前用户本人创建的委托。 */
export function listProfileServiceDelegations(signal?: AbortSignal) {
  return get_profile_service_delegations({ signal })
}

/** 读取当前用户与服务账号共同拥有的可委托能力。 */
export function listProfileServiceDelegationTargets(signal?: AbortSignal) {
  return get_profile_service_delegations_capabilities({ signal })
}

/** 创建本人委托；完整令牌只可能出现在本次返回值中。 */
export function createProfileServiceDelegation(
  data: CreateProfileServiceDelegationInput,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return post_profile_service_delegations({
    data,
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}

/** 撤销当前用户本人创建的委托。 */
export function revokeProfileServiceDelegation(id: string, signal?: AbortSignal) {
  return delete_profile_service_delegations_by_id({
    path: { id },
    signal,
  })
}
