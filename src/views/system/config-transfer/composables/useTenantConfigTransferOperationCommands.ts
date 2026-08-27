import { ref } from 'vue'
import {
  applyTenantConfigTransfer,
  downloadTenantConfigPackage,
  getTenantConfigPackage,
  previewTenantConfigTransfer,
  rollbackTenantConfigTransfer,
  type TenantConfigBundle,
  type TenantConfigTransfer,
} from '@/api/modules/tenantConfigTransfer'
import { downloadBlobDirect } from '@/hooks/useDownload'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { TENANT_CONFIG_TRANSFERS_RESOURCE } from '../queryResources'
import { useTenantConfigTransferCommandContext } from './useTenantConfigTransferCommandContext'

interface TransferOperationCommand {
  controller: AbortController
  idempotencyKey: string
  kind: 'preview' | 'apply' | 'rollback'
  transfer: TenantConfigTransfer
}

function safePackageFilename(bundle: TenantConfigBundle): string {
  const tenant = bundle.source_tenant_key.replace(/[^a-zA-Z0-9._-]+/gu, '-') || 'tenant'
  const timestamp = bundle.created_at.replace(/[^0-9]+/gu, '').slice(0, 14)
  return `${tenant}-${timestamp || 'config'}.ryframe-config.zip`
}

/** 配置迁移的预览、应用、回滚、冲突对账和下载命令。 */
export function useTenantConfigTransferOperationCommands(
  context: ReturnType<typeof useTenantConfigTransferCommandContext>,
) {
  const downloadingPackageId = ref<string>()
  const operationMutation = useServerStateMutation<TenantConfigTransfer, TransferOperationCommand>(
    TENANT_CONFIG_TRANSFERS_RESOURCE,
    {
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        const { transfer } = command
        if (command.kind === 'preview') {
          return requireOperationData(
            await previewTenantConfigTransfer(
              transfer.id,
              command.idempotencyKey,
              command.controller.signal,
            ),
          )
        }
        if (command.kind === 'rollback') {
          return requireOperationData(
            await rollbackTenantConfigTransfer(
              transfer.id,
              command.idempotencyKey,
              command.controller.signal,
            ),
          )
        }
        if (!transfer.plan_hash) {
          throw new HttpError('配置迁移缺少预览计划摘要', { status: 409, kind: 'http' })
        }
        return requireOperationData(
          await applyTenantConfigTransfer(
            transfer.id,
            {
              plan_hash: transfer.plan_hash,
              target_authorization_epoch: transfer.target_authorization_epoch,
              target_configuration_version: transfer.target_configuration_version,
            },
            command.idempotencyKey,
            command.controller.signal,
          ),
        )
      },
    },
  )

  async function runTransferOperation(
    kind: TransferOperationCommand['kind'],
    transfer: TenantConfigTransfer,
  ): Promise<TenantConfigTransfer> {
    if (operationMutation.pending.value) {
      throw new HttpError('配置迁移操作正在提交', { status: 409, kind: 'http' })
    }
    const identity = context.requireIdentity()
    const guard = context.requireOperationContext()
    const suffix =
      kind === 'preview'
        ? ''
        : `:${transfer.plan_hash ?? ''}:${transfer.target_configuration_version}:${transfer.target_authorization_epoch}`
    const signature = `${kind}:${transfer.id}${suffix}`
    try {
      const latest = await context.runIdempotent(
        identity,
        guard,
        signature,
        `tenant-config-${kind}`,
        (idempotencyKey, controller) =>
          operationMutation.mutateAsync({
            kind,
            transfer,
            idempotencyKey,
            controller,
          }),
      )
      await context.cancelListBeforeMerge(identity, guard, 'transfer')
      context.mergeTransfer(identity, latest)
      context.scheduleActiveCycle()
      return latest
    } catch (error) {
      await context.reconcileTransferError(identity, guard, transfer.id, error)
      throw error
    }
  }

  async function downloadPackage(bundle: TenantConfigBundle): Promise<void> {
    if (downloadingPackageId.value) return
    const identity = context.requireIdentity()
    const guard = context.requireOperationContext()
    const controller = context.operationScope.beginController()
    downloadingPackageId.value = bundle.id
    try {
      const blob = await downloadTenantConfigPackage(bundle.id, controller.signal)
      context.ensureOperationContext(identity, guard)
      downloadBlobDirect(blob, safePackageFilename(bundle))
    } catch (error) {
      if (
        context.operationContextMatches(identity, guard) &&
        error instanceof HttpError &&
        [403, 404, 409].includes(error.status ?? 0)
      ) {
        try {
          context.mergePackage(
            identity,
            requireOperationData(await getTenantConfigPackage(bundle.id, controller.signal)),
          )
        } catch {
          await context.packagesQuery.refetch({ throwOnError: false })
        }
      }
      throw error
    } finally {
      context.operationScope.finishController(controller)
      if (downloadingPackageId.value === bundle.id) downloadingPackageId.value = undefined
    }
  }

  return {
    applyPending: operationMutation.pending,
    applyTransfer: (transfer: TenantConfigTransfer) => runTransferOperation('apply', transfer),
    downloadPackage,
    downloadingPackageId,
    operationKind: operationMutation.variables,
    previewTransfer: (transfer: TenantConfigTransfer) => runTransferOperation('preview', transfer),
    rollbackTransfer: (transfer: TenantConfigTransfer) =>
      runTransferOperation('rollback', transfer),
  }
}
