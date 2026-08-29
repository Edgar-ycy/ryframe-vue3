import { ref } from 'vue'
import {
  createTenantConfigPackage,
  createTenantConfigTransferFromPackage,
  uploadTenantConfigTransfer,
  type TenantConfigBundle,
  type TenantConfigTransfer,
} from '@/api/modules/tenantConfigTransfer'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
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
} & ({ kind: 'from-package'; bundleId: string } | { kind: 'upload'; file: File })

/** 配置包导出、从配置包创建和上传创建迁移的命令。 */
export function useTenantConfigTransferCreationCommands(
  context: ReturnType<typeof useTenantConfigTransferCommandContext>,
) {
  const createTransferBusy = ref(false)
  let createTransferToken: symbol | undefined

  context.operationScope.onInvalidated(() => {
    createTransferToken = undefined
    createTransferBusy.value = false
  })
  const packageMutation = useServerStateMutation<TenantConfigBundle, PackageCommand>(
    TENANT_CONFIG_PACKAGES_RESOURCE,
    {
      meta: { errorMode: 'silent' },
      mutationFn: async (command) =>
        requireOperationData(
          await createTenantConfigPackage(command.idempotencyKey, command.controller.signal),
        ),
    },
  )
  const createTransferMutation = useServerStateMutation<
    TenantConfigTransfer,
    CreateTransferCommand
  >(TENANT_CONFIG_TRANSFERS_RESOURCE, {
    meta: { errorMode: 'silent' },
    mutationFn: async (command) => {
      const response =
        command.kind === 'upload'
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
  })

  async function createPackage(): Promise<TenantConfigBundle> {
    if (packageMutation.pending.value) {
      throw new HttpError('配置包导出正在提交', { status: 409, kind: 'http' })
    }
    const identity = context.requireIdentity()
    const guard = context.requireOperationContext()
    const bundle = await context.runIdempotent(
      identity,
      guard,
      'package-export',
      'tenant-config-export',
      (idempotencyKey, controller) => packageMutation.mutateAsync({ idempotencyKey, controller }),
    )
    await context.selectFirstListPage(identity, guard, 'package')
    context.ensureOperationContext(identity, guard)
    await context.cancelListBeforeMerge(identity, guard, 'package')
    context.ensureOperationContext(identity, guard)
    context.mergePackage(identity, bundle)
    context.scheduleActiveCycle()
    return bundle
  }

  async function createFromPackage(bundle: TenantConfigBundle): Promise<TenantConfigTransfer> {
    if (createTransferBusy.value) {
      throw new HttpError('配置迁移正在创建', { status: 409, kind: 'http' })
    }
    const token = Symbol('create-transfer')
    createTransferToken = token
    createTransferBusy.value = true
    try {
      const identity = context.requireIdentity()
      const guard = context.requireOperationContext()
      const transfer = await context.runIdempotent(
        identity,
        guard,
        `from-package:${bundle.id}`,
        'tenant-config-from-package',
        (idempotencyKey, controller) =>
          createTransferMutation.mutateAsync({
            kind: 'from-package',
            bundleId: bundle.id,
            idempotencyKey,
            controller,
          }),
      )
      await context.selectFirstListPage(identity, guard, 'transfer')
      context.ensureOperationContext(identity, guard)
      await context.cancelListBeforeMerge(identity, guard, 'transfer')
      context.ensureOperationContext(identity, guard)
      context.mergeTransfer(identity, transfer)
      context.selectedTransfer.value = transfer
      context.scheduleActiveCycle()
      return transfer
    } finally {
      if (createTransferToken === token) {
        createTransferToken = undefined
        createTransferBusy.value = false
      }
    }
  }

  async function uploadPackage(file: File): Promise<TenantConfigTransfer> {
    if (createTransferBusy.value) {
      throw new HttpError('配置迁移正在创建', { status: 409, kind: 'http' })
    }
    const token = Symbol('upload-transfer')
    createTransferToken = token
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
        (idempotencyKey, controller) =>
          createTransferMutation.mutateAsync({
            kind: 'upload',
            file,
            idempotencyKey,
            controller,
          }),
      )
      await context.selectFirstListPage(identity, guard, 'transfer')
      context.ensureOperationContext(identity, guard)
      await context.cancelListBeforeMerge(identity, guard, 'transfer')
      context.ensureOperationContext(identity, guard)
      context.mergeTransfer(identity, transfer)
      context.selectedTransfer.value = transfer
      context.scheduleActiveCycle()
      return transfer
    } finally {
      if (createTransferToken === token) {
        createTransferToken = undefined
        createTransferBusy.value = false
      }
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
