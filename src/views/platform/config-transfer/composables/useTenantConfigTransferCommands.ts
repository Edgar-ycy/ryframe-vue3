import {
  useTenantConfigTransferCommandContext,
  type TenantConfigTransferCommandsOptions,
} from './useTenantConfigTransferCommandContext'
import { useTenantConfigTransferCreationCommands } from './useTenantConfigTransferCreationCommands'
import { useTenantConfigTransferOperationCommands } from './useTenantConfigTransferOperationCommands'

/** 配置迁移命令的稳定组合入口。 */
export function useTenantConfigTransferCommands(options: TenantConfigTransferCommandsOptions) {
  const context = useTenantConfigTransferCommandContext(options)
  const creation = useTenantConfigTransferCreationCommands(context)
  const operations = useTenantConfigTransferOperationCommands(context)

  return {
    ...creation,
    ...operations,
    clearPendingIntents: context.clearPendingIntents,
    ensureOperationContext: context.ensureOperationContext,
    mergeTransfer: context.mergeTransfer,
    removeTransfer: context.removeTransfer,
    requireIdentity: context.requireIdentity,
    requireOperationContext: context.requireOperationContext,
  }
}
