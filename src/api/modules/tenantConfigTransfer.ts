import type {
  ApiSchema,
  OperationJsonBody,
  OperationQuery,
} from '@/api/contract'
import {
  requestBlobOperation,
  requestMultipartOperation,
  requestOperation,
} from '@/api/operationRequest'

export type TenantConfigBundle = ApiSchema<'TenantConfigBundleVo'>
export type TenantConfigBundleSummary = ApiSchema<'TenantConfigBundleSummaryVo'>
export type TenantConfigTransfer = ApiSchema<'TenantConfigTransferVo'>
export type TenantConfigTransferItem = ApiSchema<'TenantConfigTransferItemVo'>
export type TenantConfigPackageQuery = OperationQuery<'get_system_config_packages'>
export type TenantConfigTransferQuery = OperationQuery<'get_system_config_transfers'>
export type TenantConfigTransferItemQuery =
  OperationQuery<'get_system_config_transfers_by_id_items'>
export type ApplyTenantConfigTransferInput =
  OperationJsonBody<'post_system_config_transfers_by_id_apply'>

/** 分页读取当前租户可见的配置包。 */
export function listTenantConfigPackages(
  params: TenantConfigPackageQuery,
  signal?: AbortSignal,
) {
  return requestOperation('get_system_config_packages', { params, signal })
}

/** 创建当前租户配置包的异步导出任务。 */
export function createTenantConfigPackage(
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation('post_system_config_packages', {
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}

/** 读取单个配置包的最新状态。 */
export function getTenantConfigPackage(id: string, signal?: AbortSignal) {
  return requestOperation('get_system_config_packages_by_id', {
    path: { id },
    signal,
  })
}

/** 由用户显式下载已经生成且仍有效的配置包。 */
export function downloadTenantConfigPackage(id: string, signal?: AbortSignal) {
  return requestBlobOperation('get_system_config_packages_by_id_download', {
    path: { id },
    signal,
  })
}

/** 分页读取当前租户的配置迁移记录。 */
export function listTenantConfigTransfers(
  params: TenantConfigTransferQuery,
  signal?: AbortSignal,
) {
  return requestOperation('get_system_config_transfers', { params, signal })
}

/** 使用当前租户已经持有的配置包创建迁移。 */
export function createTenantConfigTransferFromPackage(
  bundleId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation('post_system_config_transfers_from_package', {
    data: { bundle_id: bundleId },
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}

/** 上传严格的单文件配置包并创建迁移。 */
export function uploadTenantConfigTransfer(
  file: File,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  const data = new FormData()
  data.append('file', file)
  return requestMultipartOperation('post_system_config_transfers_upload', {
    data,
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
    timeout: 120_000,
  })
}

/** 读取单个配置迁移的强一致最新状态。 */
export function getTenantConfigTransfer(id: string, signal?: AbortSignal) {
  return requestOperation('get_system_config_transfers_by_id', {
    path: { id },
    signal,
  })
}

/** 分页读取配置迁移的逐项预览或执行结果。 */
export function listTenantConfigTransferItems(
  id: string,
  params: TenantConfigTransferItemQuery,
  signal?: AbortSignal,
) {
  return requestOperation('get_system_config_transfers_by_id_items', {
    path: { id },
    params,
    signal,
  })
}

/** 提交配置迁移预览任务。 */
export function previewTenantConfigTransfer(
  id: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation('post_system_config_transfers_by_id_preview', {
    data: {},
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { id },
    signal,
  })
}

/** 使用预览返回的版本栅栏和计划摘要提交应用任务。 */
export function applyTenantConfigTransfer(
  id: string,
  input: ApplyTenantConfigTransferInput,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation('post_system_config_transfers_by_id_apply', {
    data: input,
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { id },
    signal,
  })
}

/** 在服务端允许的窗口内提交完整回滚任务。 */
export function rollbackTenantConfigTransfer(
  id: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return requestOperation('post_system_config_transfers_by_id_rollback', {
    data: {},
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { id },
    signal,
  })
}
