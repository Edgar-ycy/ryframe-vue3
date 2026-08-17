import { isBusinessWritePermission } from '@/features/registry'
import { useTenantContextStore } from '@/app/tenant-context'

/** 系统管理权限始终不受业务库维护状态影响；manifest 标记的业务写权限统一收口。 */
export function canExecuteFeaturePermission(permissionCode: string): boolean {
  const tenantContext = useTenantContextStore()
  if (tenantContext.status !== 'loaded') return false
  return !isBusinessWritePermission(permissionCode)
    || tenantContext.canWriteBusinessData
}
