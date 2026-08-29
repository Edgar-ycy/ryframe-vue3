import {
  applyTenantProductChange,
  previewTenantProductChange,
  type CapabilityOverrideInput,
  type ProductChangePreview,
  type TenantProductContext,
} from '@/api/modules/productPlan'
import { requireOperationData } from '@/shared/http/client'
import { assertServerStateScopeCurrent, invalidateServerStateResource } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'

export interface TenantProductPreviewCommand {
  overrides: CapabilityOverrideInput[]
  planVersionId: string
  scope: ServerStateScope
  tenantId: string
}

export type TenantProductApplyCommand = TenantProductPreviewCommand & {
  preview: ProductChangePreview
}

export const TENANT_PRODUCT_CONTEXT_RESOURCE = 'platform-tenant-product-context'

export function invalidateTenantProductContext(scope: ServerStateScope): Promise<void> {
  return invalidateServerStateResource(scope, TENANT_PRODUCT_CONTEXT_RESOURCE)
}

/** 套餐预览和应用只读取调用方捕获的完整不可变快照。 */
export function useTenantProductChangeCommands() {
  const previewMutation = useServerStateMutation<ProductChangePreview, TenantProductPreviewCommand>(
    'platform-tenant-product-change-preview',
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        return requireOperationData(
          await previewTenantProductChange(command.tenantId, {
            plan_version_id: command.planVersionId,
            overrides: command.overrides,
          }),
        )
      },
    },
  )
  const applyMutation = useServerStateMutation<TenantProductContext, TenantProductApplyCommand>(
    TENANT_PRODUCT_CONTEXT_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        return requireOperationData(
          await applyTenantProductChange(command.tenantId, {
            plan_version_id: command.planVersionId,
            overrides: command.overrides,
            plan_hash: command.preview.plan_hash,
            preview_runtime_epoch: command.preview.runtime_epoch,
          }),
        )
      },
    },
  )
  return { applyMutation, previewMutation }
}
