import { ref } from 'vue'
import {
  createTenantConfigPackage,
  createTenantConfigTransferFromPackage,
  uploadTenantConfigTransfer,
  type TenantConfigBundle,
  type TenantConfigTransfer,
} from '@/api/modules/tenantConfigTransfer'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import {
  TENANT_CONFIG_PACKAGES_RESOURCE,
  TENANT_CONFIG_TRANSFERS_RESOURCE,
} from '../queryResources'
import { tenantConfigTransferFileFingerprint } from './tenantConfigTransferFileFingerprint'
import { useTenantConfigTransferCommandContext } from './useTenantConfigTransferCommandContext'

interface PackageCommand {
  controller: AbortController
  idempotencyKey: string
}

type CreateTransferCommand = {
  controller: AbortController
  idempotencyKey: string
} & (
  | { kind: 'from-package', bundleId: string }
  | { kind: 'upload', file: File }
)

/** 配置包导出、从配置包创建和上传创建迁移的命令。 */
export function useTenantConfigTransferCreationCommands(
  context: ReturnType<typeof useTenantConfigTransferCommandContext>,
) {
  const createTransferBusy = ref(false)
  const packageMutation = useTenantMutation<TenantConfigBundle, PackageCommand>(
    () => context.currentIdentity()?.tenantId,
    TENANT_CONFIG_PACKAGES_RESOURCE,
    {
      mutationFn: async command => requireOperationData(await createTenantConfigPackage(
        command.idempotencyKey,
        command.controller.signal,
      )),
    },
  )
  const createTransferMutation = useTenantMutation<TenantConfigTransfer, CreateTransferCommand>(
    () => context.currentIdentity()?.tenantId,
    TENANT_CONFIG_TRANSFERS_RESOURCE,
    {
      mutationFn: async command => {
        const response = command.kind === 'upload'
          ? await uploadTenantConfigTransfer(
              command.file,
              command.idempotencyKey,
              command.controller.signal,
            )
          : await createTenantConfigTransferFromPackage(
              command.bundleId,
              command.idempotencyKey,
              command.controller.signal,
            )
        return requireOperationData(response)
      },
    },
  )

  async function createPackage(): Promise<TenantConfigBundle> {
    if (packageMutation.pending.value) {
      throw new HttpError('配置包导出正在提交', { status: 409, kind: 'http' })
    }
    const identity = context.requireIdentity()
    const guard = context.requireOperationContext()
    const bundle = await context.runIdempotent(identity, guard, 'package-export', 'tenant-config-export', (
      idempotencyKey,
      controller,
    ) => packageMutation.mutateAsync({ idempotencyKey, controller }))
    await context.selectFirstListPage('package')
    await context.cancelListBeforeMerge(identity, guard, 'package')
    context.mergePackage(identity, bundle)
    context.scheduleActiveCycle()
    return bundle
  }

  async function createFromPackage(bundle: TenantConfigBundle): Promise<TenantConfigTransfer> {
    if (createTransferBusy.value) {
      throw new HttpError('配置迁移正在创建', { status: 409, kind: 'http' })
    }
    createTransferBusy.value = true
    try {
      const identity = context.requireIdentity()
      const guard = context.requireOperationContext()
      const transfer = await context.runIdempotent(
        identity,
        guard,
        `from-package:${bundle.id}`,
        'tenant-config-from-package',
        (idempotencyKey, controller) => createTransferMutation.mutateAsync({
          kind: 'from-package',
          bundleId: bundle.id,
          idempotencyKey,
          controller,
        }),
      )
      await context.selectFirstListPage('transfer')
      await context.cancelListBeforeMerge(identity, guard, 'transfer')
      context.mergeTransfer(identity, transfer)
      context.selectedTransfer.value = transfer
      context.scheduleActiveCycle()
      return transfer
    }
    finally {
      createTransferBusy.value = false
    }
  }

  async function uploadPackage(file: File): Promise<TenantConfigTransfer> {
    if (createTransferBusy.value) {
      throw new HttpError('配置迁移正在创建', { status: 409, kind: 'http' })
    }
    createTransferBusy.value = true
    try {
      const identity = context.requireIdentity()
      const guard = context.requireOperationContext()
      const contentSha256 = await tenantConfigTransferFileFingerprint(file)
      context.ensureOperationContext(identity, guard)
      const transfer = await context.runIdempotent(
        identity,
        guard,
        `upload:${contentSha256}`,
        'tenant-config-upload',
        (idempotencyKey, controller) => createTransferMutation.mutateAsync({
          kind: 'upload',
          file,
          idempotencyKey,
          controller,
        }),
      )
      await context.selectFirstListPage('transfer')
      await context.cancelListBeforeMerge(identity, guard, 'transfer')
      context.mergeTransfer(identity, transfer)
      context.selectedTransfer.value = transfer
      context.scheduleActiveCycle()
      return transfer
    }
    finally {
      createTransferBusy.value = false
    }
  }

  return {
    createFromPackage,
    createPackage,
    createPackagePending: packageMutation.pending,
    createTransferPending: createTransferBusy,
    uploadPackage,
  }
}
