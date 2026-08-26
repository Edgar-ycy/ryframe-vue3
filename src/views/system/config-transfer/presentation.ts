import type { TenantConfigBundle, TenantConfigTransfer } from '@/api/modules/tenantConfigTransfer'

type Translate = (key: string) => string

const RESOURCE_LABEL_KEYS: Readonly<Record<string, string>> = {
  department: 'resourceDepartments',
  departments: 'resourceDepartments',
  post: 'resourcePosts',
  posts: 'resourcePosts',
  dict_type: 'resourceDictTypes',
  dict_types: 'resourceDictTypes',
  dictionary_type: 'resourceDictTypes',
  dictionary_types: 'resourceDictTypes',
  dict_datum: 'resourceDictData',
  dict_data: 'resourceDictData',
  dictionary_data: 'resourceDictData',
  config: 'resourceConfigs',
  configs: 'resourceConfigs',
  permission: 'resourcePermissions',
  permissions: 'resourcePermissions',
  menu: 'resourceMenus',
  menus: 'resourceMenus',
  role: 'resourceRoles',
  roles: 'resourceRoles',
  role_permission: 'resourceRolePermissions',
  role_permissions: 'resourceRolePermissions',
  role_department: 'resourceRoleDepartments',
  role_departments: 'resourceRoleDepartments',
  role_dept: 'resourceRoleDepartments',
  role_depts: 'resourceRoleDepartments',
}

const ACTIVE_PACKAGE_STATUSES = new Set(['pending', 'running'])
const ACTIVE_TRANSFER_STATUSES = new Set([
  'preview_pending',
  'previewing',
  'apply_pending',
  'applying',
  'rollback_pending',
  'rolling_back',
])

/** 配置包仍由后台任务生成时需要跟踪详情。 */
export function isActiveTenantConfigPackage(bundle: TenantConfigBundle): boolean {
  return ACTIVE_PACKAGE_STATUSES.has(bundle.status)
}

/** 配置迁移存在后台任务时需要跟踪详情。 */
export function isActiveTenantConfigTransfer(transfer: TenantConfigTransfer): boolean {
  return ACTIVE_TRANSFER_STATUSES.has(transfer.status)
}

/** 后端仅允许就绪、已预览或失败的迁移重新预览。 */
export function canPreviewTenantConfigTransfer(transfer: TenantConfigTransfer): boolean {
  return ['preview_ready', 'previewed', 'failed'].includes(transfer.status)
}

/** 应用必须使用成功预览且没有冲突或阻断的计划。 */
export function canApplyTenantConfigTransfer(transfer: TenantConfigTransfer): boolean {
  return (
    transfer.status === 'previewed' &&
    !!transfer.plan_hash &&
    (transfer.change_counts.blocked ?? 0) === 0 &&
    (transfer.change_counts.conflict ?? 0) === 0
  )
}

/** 浏览器时间只用于提前禁用按钮，服务端仍是回滚窗口的最终裁决者。 */
export function canRollbackTenantConfigTransfer(
  transfer: TenantConfigTransfer,
  now = Date.now(),
): boolean {
  if (transfer.status !== 'applied' || !transfer.rollback_expires_at) return false
  const expiresAt = Date.parse(transfer.rollback_expires_at)
  return Number.isFinite(expiresAt) && expiresAt > now
}

/** 只有生成成功且浏览器判断尚未过期的包才提前启用下载。 */
export function canDownloadTenantConfigPackage(
  bundle: TenantConfigBundle,
  now = Date.now(),
): boolean {
  if (bundle.status !== 'succeeded') return false
  if (!bundle.expires_at) return true
  const expiresAt = Date.parse(bundle.expires_at)
  return Number.isFinite(expiresAt) && expiresAt > now
}

/** 仅保留后端返回的数值型资源计数。 */
export function tenantConfigResourceCounts(bundle: TenantConfigBundle): [string, number][] {
  return Object.entries(bundle.resource_counts).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )
}

/** 将配置资源名称投影为稳定的本地化文案。 */
export function tenantConfigResourceLabel(resource: string, t: Translate): string {
  const key = RESOURCE_LABEL_KEYS[resource]
  return key ? t(`tenantConfigTransfer.${key}`) : resource
}
