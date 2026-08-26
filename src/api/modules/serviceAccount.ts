import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import { requestOperation } from '@/api/operationRequest'
import {
  delete_system_service_accounts_by_id,
  delete_system_service_accounts_by_id_credentials_by_credential_id,
  delete_system_service_delegations_by_id,
  get_system_service_access_audits,
  get_system_service_accounts,
  get_system_service_accounts_by_id,
  get_system_service_accounts_by_id_credentials,
  get_system_service_accounts_by_id_roles,
  get_system_service_delegations,
  post_system_service_accounts,
  post_system_service_accounts_by_id_credentials,
  put_system_service_accounts_by_id,
  put_system_service_accounts_by_id_roles,
  put_system_service_accounts_by_id_status,
} from '@/api/generated/operations'

export type ServiceAccount = ApiSchema<'ServiceAccountVo'>
export type ServiceAccountDetail = ApiSchema<'ServiceAccountDetailVo'>
export type ServiceAccountStatus = ApiSchema<'ServiceAccountStatusDto'>
export type ServiceCredential = ApiSchema<'ServiceCredentialVo'>
export type CreatedServiceCredential = ApiSchema<'CreatedServiceCredentialVo'>
export type ServiceDelegation = ApiSchema<'ServiceDelegationVo'>
export type ServiceAccessAudit = ApiSchema<'ServiceAccessAuditVo'>

export type ServiceAccountQuery = OperationQuery<'get_system_service_accounts'>
export type ServiceDelegationQuery = OperationQuery<'get_system_service_delegations'>
export type ServiceAccessAuditQuery = OperationQuery<'get_system_service_access_audits'>
export type CreateServiceAccountInput = OperationJsonBody<'post_system_service_accounts'>
export type UpdateServiceAccountInput = OperationJsonBody<'put_system_service_accounts_by_id'>
export type CreateServiceCredentialInput =
  OperationJsonBody<'post_system_service_accounts_by_id_credentials'>

/** 分页读取当前租户的服务账号。 */
export function listServiceAccounts(params: ServiceAccountQuery, signal?: AbortSignal) {
  return requestOperation(get_system_service_accounts, { params, signal })
}

/** 创建当前租户的机器主体。 */
export function createServiceAccount(data: CreateServiceAccountInput, signal?: AbortSignal) {
  return requestOperation(post_system_service_accounts, { data, signal })
}

/** 读取服务账号及其角色快照。 */
export function getServiceAccount(id: string, signal?: AbortSignal) {
  return requestOperation(get_system_service_accounts_by_id, {
    path: { id },
    signal,
  })
}

/** 更新服务账号的非身份字段。 */
export function updateServiceAccount(
  id: string,
  data: UpdateServiceAccountInput,
  signal?: AbortSignal,
) {
  return requestOperation(put_system_service_accounts_by_id, {
    data,
    path: { id },
    signal,
  })
}

/** 启用或停用服务账号。 */
export function updateServiceAccountStatus(
  id: string,
  status: ServiceAccountStatus,
  signal?: AbortSignal,
) {
  return requestOperation(put_system_service_accounts_by_id_status, {
    data: { status },
    path: { id },
    signal,
  })
}

/** 软删除服务账号。 */
export function deleteServiceAccount(id: string, signal?: AbortSignal) {
  return requestOperation(delete_system_service_accounts_by_id, {
    path: { id },
    signal,
  })
}

/** 读取服务账号已绑定的普通角色 ID。 */
export function listServiceAccountRoles(id: string, signal?: AbortSignal) {
  return requestOperation(get_system_service_accounts_by_id_roles, {
    path: { id },
    signal,
  })
}

/** 原子替换服务账号的普通角色；服务端拒绝超级角色。 */
export function replaceServiceAccountRoles(
  id: string,
  roleIds: readonly string[],
  signal?: AbortSignal,
) {
  return requestOperation(put_system_service_accounts_by_id_roles, {
    data: { role_ids: [...roleIds] },
    path: { id },
    signal,
  })
}

/** 读取 API Key 元数据，响应不包含 Secret。 */
export function listServiceCredentials(id: string, signal?: AbortSignal) {
  return requestOperation(get_system_service_accounts_by_id_credentials, {
    path: { id },
    signal,
  })
}

/** 创建 API Key；完整 Secret 只可能出现在本次返回值中。 */
export function createServiceCredential(
  id: string,
  data: CreateServiceCredentialInput,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation(post_system_service_accounts_by_id_credentials, {
    data,
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { id },
    signal,
  })
}

/** 撤销指定 API Key。 */
export function revokeServiceCredential(id: string, credentialId: string, signal?: AbortSignal) {
  return requestOperation(delete_system_service_accounts_by_id_credentials_by_credential_id, {
    path: { credential_id: credentialId, id },
    signal,
  })
}

/** 分页读取当前租户的服务委托。 */
export function listServiceDelegations(params: ServiceDelegationQuery, signal?: AbortSignal) {
  return requestOperation(get_system_service_delegations, { params, signal })
}

/** 由管理员撤销租户内服务委托。 */
export function revokeServiceDelegation(id: string, signal?: AbortSignal) {
  return requestOperation(delete_system_service_delegations_by_id, {
    path: { id },
    signal,
  })
}

/** 分页读取 Agent 最小访问审计。 */
export function listServiceAccessAudits(params: ServiceAccessAuditQuery, signal?: AbortSignal) {
  return requestOperation(get_system_service_access_audits, { params, signal })
}
