import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import {
  get_platform_tenants_by_tenant_id_config_packages,
  get_platform_tenants_by_tenant_id_config_packages_by_id,
  get_platform_tenants_by_tenant_id_config_packages_by_id_download,
  get_platform_tenants_by_tenant_id_config_transfers,
  get_platform_tenants_by_tenant_id_config_transfers_by_id,
  get_platform_tenants_by_tenant_id_config_transfers_by_id_items,
  post_platform_tenants_by_tenant_id_config_packages,
  post_platform_tenants_by_tenant_id_config_transfers_by_id_apply,
  post_platform_tenants_by_tenant_id_config_transfers_by_id_preview,
  post_platform_tenants_by_tenant_id_config_transfers_by_id_rollback,
  post_platform_tenants_by_tenant_id_config_transfers_from_package,
  post_platform_tenants_by_tenant_id_config_transfers_upload,
} from '@/api/generated/operations/platform'

export type TenantConfigBundle = ApiSchema<'TenantConfigBundleVo'>
export type TenantConfigBundleSummary = ApiSchema<'TenantConfigBundleSummaryVo'>
export type TenantConfigTransfer = ApiSchema<'TenantConfigTransferVo'>
export type TenantConfigTransferItem = ApiSchema<'TenantConfigTransferItemVo'>
export type TenantConfigPackageQuery =
  OperationQuery<'get_platform_tenants_by_tenant_id_config_packages'>
export type TenantConfigTransferQuery =
  OperationQuery<'get_platform_tenants_by_tenant_id_config_transfers'>
export type TenantConfigTransferItemQuery =
  OperationQuery<'get_platform_tenants_by_tenant_id_config_transfers_by_id_items'>
export type ApplyTenantConfigTransferInput =
  OperationJsonBody<'post_platform_tenants_by_tenant_id_config_transfers_by_id_apply'>

/** 分页读取选定租户可见的配置包。 */
export function listTenantConfigPackages(
  tenantId: string,
  params: TenantConfigPackageQuery,
  signal?: AbortSignal,
) {
  return get_platform_tenants_by_tenant_id_config_packages({
    path: { tenant_id: tenantId },
    params,
    signal,
  })
}

/** 创建选定租户配置包的异步导出任务。 */
export function createTenantConfigPackage(
  tenantId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return post_platform_tenants_by_tenant_id_config_packages({
    path: { tenant_id: tenantId },
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}

/** 读取单个配置包的最新状态。 */
export function getTenantConfigPackage(tenantId: string, id: string, signal?: AbortSignal) {
  return get_platform_tenants_by_tenant_id_config_packages_by_id({
    path: { tenant_id: tenantId, id },
    signal,
  })
}

/** 由用户显式下载已经生成且仍有效的配置包。 */
export function downloadTenantConfigPackage(tenantId: string, id: string, signal?: AbortSignal) {
  return get_platform_tenants_by_tenant_id_config_packages_by_id_download({
    path: { tenant_id: tenantId, id },
    signal,
  })
}

/** 分页读取选定租户的配置迁移记录。 */
export function listTenantConfigTransfers(
  tenantId: string,
  params: TenantConfigTransferQuery,
  signal?: AbortSignal,
) {
  return get_platform_tenants_by_tenant_id_config_transfers({
    path: { tenant_id: tenantId },
    params,
    signal,
  })
}

/** 使用选定租户已经持有的配置包创建迁移。 */
export function createTenantConfigTransferFromPackage(
  tenantId: string,
  bundleId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return post_platform_tenants_by_tenant_id_config_transfers_from_package({
    path: { tenant_id: tenantId },
    data: { bundle_id: bundleId },
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })
}

/** 上传严格的单文件配置包并创建迁移。 */
export function uploadTenantConfigTransfer(
  tenantId: string,
  file: File,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  const data = new FormData()
  data.append('file', file)
  return post_platform_tenants_by_tenant_id_config_transfers_upload({
    path: { tenant_id: tenantId },
    data,
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
    timeout: 120_000,
  })
}

/** 读取单个配置迁移的强一致最新状态。 */
export function getTenantConfigTransfer(tenantId: string, id: string, signal?: AbortSignal) {
  return get_platform_tenants_by_tenant_id_config_transfers_by_id({
    path: { tenant_id: tenantId, id },
    signal,
  })
}

/** 分页读取配置迁移的逐项预览或执行结果。 */
export function listTenantConfigTransferItems(
  tenantId: string,
  id: string,
  params: TenantConfigTransferItemQuery,
  signal?: AbortSignal,
) {
  return get_platform_tenants_by_tenant_id_config_transfers_by_id_items({
    path: { tenant_id: tenantId, id },
    params,
    signal,
  })
}

/** 提交配置迁移预览任务。 */
export function previewTenantConfigTransfer(
  tenantId: string,
  id: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return post_platform_tenants_by_tenant_id_config_transfers_by_id_preview({
    data: {},
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { tenant_id: tenantId, id },
    signal,
  })
}

/** 使用预览返回的版本栅栏和计划摘要提交应用任务。 */
export function applyTenantConfigTransfer(
  tenantId: string,
  id: string,
  input: ApplyTenantConfigTransferInput,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return post_platform_tenants_by_tenant_id_config_transfers_by_id_apply({
    data: input,
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { tenant_id: tenantId, id },
    signal,
  })
}

/** 在服务端允许的窗口内提交完整回滚任务。 */
export function rollbackTenantConfigTransfer(
  tenantId: string,
  id: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return post_platform_tenants_by_tenant_id_config_transfers_by_id_rollback({
    data: {},
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { tenant_id: tenantId, id },
    signal,
  })
}
