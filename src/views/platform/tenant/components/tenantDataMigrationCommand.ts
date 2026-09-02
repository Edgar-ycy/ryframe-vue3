import {
  createTenantDataMigration,
  previewTenantDataMigration,
  type TenantDataMigration,
  type TenantDataMigrationPreview,
  type TenantDataPlacement,
} from '@/api/modules/tenantData'
import { requireOperationData } from '@/shared/http/client'
import { assertServerStateScopeCurrent, invalidateServerStateResource } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'

export interface TenantMigrationPreviewCommand {
  expectedPlacementGeneration: TenantDataPlacement['placement_generation']
  scope: ServerStateScope
  targetKey: string
  tenantId: string
}

export interface TenantMigrationCreateCommand {
  idempotencyKey: string
  preview: TenantDataMigrationPreview
  scope: ServerStateScope
  tenantId: string
}

export const TENANT_DATA_MIGRATIONS_RESOURCE = 'platform-tenant-data-migrations'
export const TENANT_DATA_PLACEMENT_RESOURCE = 'platform-tenant-data-placement'

export function invalidateTenantMigrationResources(scope: ServerStateScope): Promise<void[]> {
  return Promise.all([
    invalidateServerStateResource(scope, TENANT_DATA_MIGRATIONS_RESOURCE),
    invalidateServerStateResource(scope, TENANT_DATA_PLACEMENT_RESOURCE),
  ])
}

export function tenantMigrationRetryOwner(
  scope: ServerStateScope,
  tenantId: string,
  preview: TenantDataMigrationPreview,
): string {
  return [
    scope.tenantId,
    scope.subjectId,
    scope.sessionEpoch,
    tenantId,
    preview.target_target_key,
    preview.expected_placement_generation,
    preview.plan_hash,
  ].join('\0')
}

/** 迁移预览与创建只接受调用方捕获的不可变命令快照。 */
export function useTenantDataMigrationCommands() {
  const previewMutation = useServerStateMutation<
    TenantDataMigrationPreview,
    TenantMigrationPreviewCommand
  >('platform-tenant-data-migration-preview', {
    invalidateOnSuccess: false,
    meta: { errorMode: 'silent' },
    mutationFn: async (command) => {
      assertServerStateScopeCurrent(command.scope)
      return requireOperationData(
        await previewTenantDataMigration(command.tenantId, {
          target_key: command.targetKey,
          expected_placement_generation: command.expectedPlacementGeneration,
        }),
      )
    },
  })
  const createMutation = useServerStateMutation<TenantDataMigration, TenantMigrationCreateCommand>(
    TENANT_DATA_MIGRATIONS_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        return requireOperationData(
          await createTenantDataMigration(
            command.tenantId,
            {
              target_key: command.preview.target_target_key,
              plan_hash: command.preview.plan_hash,
              expected_placement_generation: command.preview.expected_placement_generation,
            },
            command.idempotencyKey,
          ),
        )
      },
    },
  )
  return { createMutation, previewMutation }
}
