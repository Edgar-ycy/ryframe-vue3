import { requestOperation } from '@/api/operationRequest'
import {
  get_platform_capabilities,
  get_platform_product_plans,
  get_platform_product_plans_by_plan_id,
  get_platform_product_plans_by_plan_id_versions,
  get_platform_tenants_by_tenant_id_product_context,
  post_platform_product_plans,
  post_platform_product_plans_by_plan_id_versions,
  post_platform_product_plans_by_plan_id_versions_by_version_publish,
  post_platform_product_plans_by_plan_id_versions_by_version_retire,
  post_platform_tenants_by_tenant_id_product_change_previews,
  post_platform_tenants_by_tenant_id_product_changes,
  put_platform_product_plans_by_plan_id,
  put_platform_product_plans_by_plan_id_versions_by_version_draft,
} from '@/api/generated/operations'
import type {
  OperationData,
  OperationJsonBody,
  OperationQuery,
} from '@/api/contract'

export type ProductPlanVersionStatus = OperationData<
  'get_platform_product_plans_by_plan_id_versions'
>[number]['status']
export type ProductCapability = OperationJsonBody<
  'post_platform_product_plans_by_plan_id_versions'
>['capabilities'][number]
export type ProductCapabilityVariant = OperationData<
  'get_platform_capabilities'
>[number]['variants'][number]
export type ProductCapabilityDescriptor = OperationData<'get_platform_capabilities'>[number]
export type EffectiveProductCapability = OperationData<
  'get_platform_tenants_by_tenant_id_product_context'
>['capabilities'][number]
export type CapabilityOverrideInput = NonNullable<OperationJsonBody<
  'post_platform_tenants_by_tenant_id_product_change_previews'
>['overrides']>[number]
export type TenantCapabilityOverride = OperationData<
  'get_platform_tenants_by_tenant_id_product_context'
>['overrides'][number]
export type ProductPlan = OperationData<'get_platform_product_plans'>['items'][number]
export type ProductPlanVersion = OperationData<
  'get_platform_product_plans_by_plan_id_versions'
>[number]
export type TenantProductContext = OperationData<
  'get_platform_tenants_by_tenant_id_product_context'
>
export type ProductCapabilityChange = OperationData<
  'post_platform_tenants_by_tenant_id_product_change_previews'
>['capability_changes'][number]
export type ProductChangePreview = OperationData<
  'post_platform_tenants_by_tenant_id_product_change_previews'
>

export type ProductPlanQuery = OperationQuery<'get_platform_product_plans'>
export type CreateProductPlanInput = OperationJsonBody<'post_platform_product_plans'>
export type UpdateProductPlanInput = OperationJsonBody<'put_platform_product_plans_by_plan_id'>
/** 套餐编辑弹窗的本地表单模型；创建时忽略 status。 */
export type ProductPlanFormInput = CreateProductPlanInput & Pick<UpdateProductPlanInput, 'status'>
export type ProductPlanVersionInput = OperationJsonBody<
  'post_platform_product_plans_by_plan_id_versions'
>
export type ProductChangePreviewInput = OperationJsonBody<
  'post_platform_tenants_by_tenant_id_product_change_previews'
>
export type ApplyProductChangeInput = OperationJsonBody<
  'post_platform_tenants_by_tenant_id_product_changes'
>

export function listProductCapabilities(signal?: AbortSignal) {
  return requestOperation(get_platform_capabilities, { signal })
}

export function listProductPlans(params: ProductPlanQuery, signal?: AbortSignal) {
  return requestOperation(get_platform_product_plans, { params, signal })
}

export function createProductPlan(data: CreateProductPlanInput) {
  return requestOperation(post_platform_product_plans, { data })
}

export function updateProductPlan(planId: string, data: UpdateProductPlanInput) {
  return requestOperation(put_platform_product_plans_by_plan_id, {
    data,
    path: { plan_id: planId },
  })
}

export function getProductPlan(planId: string, signal?: AbortSignal) {
  return requestOperation(get_platform_product_plans_by_plan_id, {
    path: { plan_id: planId },
    signal,
  })
}

export function listProductPlanVersions(planId: string, signal?: AbortSignal) {
  return requestOperation(get_platform_product_plans_by_plan_id_versions, {
    path: { plan_id: planId },
    signal,
  })
}

export function createProductPlanVersion(planId: string, data: ProductPlanVersionInput) {
  return requestOperation(post_platform_product_plans_by_plan_id_versions, {
    data,
    path: { plan_id: planId },
  })
}

export function updateProductPlanVersionDraft(
  planId: string,
  version: number,
  data: ProductPlanVersionInput,
) {
  return requestOperation(put_platform_product_plans_by_plan_id_versions_by_version_draft, {
    data,
    path: { plan_id: planId, version },
  })
}

export function publishProductPlanVersion(planId: string, version: number) {
  return requestOperation(post_platform_product_plans_by_plan_id_versions_by_version_publish, {
    path: { plan_id: planId, version },
  })
}

export function retireProductPlanVersion(planId: string, version: number) {
  return requestOperation(post_platform_product_plans_by_plan_id_versions_by_version_retire, {
    path: { plan_id: planId, version },
  })
}

export function getTenantProductContext(tenantId: string, signal?: AbortSignal) {
  return requestOperation(get_platform_tenants_by_tenant_id_product_context, {
    path: { tenant_id: tenantId },
    signal,
  })
}

export function previewTenantProductChange(
  tenantId: string,
  data: ProductChangePreviewInput,
) {
  return requestOperation(post_platform_tenants_by_tenant_id_product_change_previews, {
    data,
    path: { tenant_id: tenantId },
  })
}

export function applyTenantProductChange(tenantId: string, data: ApplyProductChangeInput) {
  return requestOperation(post_platform_tenants_by_tenant_id_product_changes, {
    data,
    path: { tenant_id: tenantId },
  })
}
