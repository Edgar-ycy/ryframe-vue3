import type { PermissionCode } from '@/api/generated/permissions'
import { isBusinessWritePermission } from '@/features/registry'
import { useTenantContextStore } from './store'

/** 系统管理权限始终不受业务库维护状态影响；清单标记的业务写权限统一收口。 */
export function canExecuteFeaturePermission(permissionCode: PermissionCode): boolean {
  const tenantContext = useTenantContextStore()
  if (tenantContext.status !== 'loaded') return false
  return !isBusinessWritePermission(permissionCode) || tenantContext.canWriteBusinessData
}
