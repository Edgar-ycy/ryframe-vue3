/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

import { bindJsonOperation } from '@/api/operationRequest'

export const get_platform_capabilities = bindJsonOperation({"operationId":"get_platform_capabilities","method":"get","path":"/platform/capabilities"})
export const get_platform_data_targets = bindJsonOperation({"operationId":"get_platform_data_targets","method":"get","path":"/platform/data-targets"})
export const get_platform_data_targets_by_target_key = bindJsonOperation({"operationId":"get_platform_data_targets_by_target_key","method":"get","path":"/platform/data-targets/{target_key}"})
export const get_platform_data_targets_by_target_key_backup_points = bindJsonOperation({"operationId":"get_platform_data_targets_by_target_key_backup_points","method":"get","path":"/platform/data-targets/{target_key}/backup-points"})
export const get_platform_product_plans = bindJsonOperation({"operationId":"get_platform_product_plans","method":"get","path":"/platform/product-plans"})
export const get_platform_product_plans_by_plan_id = bindJsonOperation({"operationId":"get_platform_product_plans_by_plan_id","method":"get","path":"/platform/product-plans/{plan_id}"})
export const get_platform_product_plans_by_plan_id_versions = bindJsonOperation({"operationId":"get_platform_product_plans_by_plan_id_versions","method":"get","path":"/platform/product-plans/{plan_id}/versions"})
export const get_platform_tenant_data_migrations_by_migration_id = bindJsonOperation({"operationId":"get_platform_tenant_data_migrations_by_migration_id","method":"get","path":"/platform/tenant-data-migrations/{migration_id}"})
export const get_platform_tenants = bindJsonOperation({"operationId":"get_platform_tenants","method":"get","path":"/platform/tenants"})
export const get_platform_tenants_by_tenant_id = bindJsonOperation({"operationId":"get_platform_tenants_by_tenant_id","method":"get","path":"/platform/tenants/{tenant_id}"})
export const get_platform_tenants_by_tenant_id_data_migrations = bindJsonOperation({"operationId":"get_platform_tenants_by_tenant_id_data_migrations","method":"get","path":"/platform/tenants/{tenant_id}/data-migrations"})
export const get_platform_tenants_by_tenant_id_data_placement = bindJsonOperation({"operationId":"get_platform_tenants_by_tenant_id_data_placement","method":"get","path":"/platform/tenants/{tenant_id}/data-placement"})
export const get_platform_tenants_by_tenant_id_product_context = bindJsonOperation({"operationId":"get_platform_tenants_by_tenant_id_product_context","method":"get","path":"/platform/tenants/{tenant_id}/product-context"})
export const get_platform_tenants_by_tenant_id_usage = bindJsonOperation({"operationId":"get_platform_tenants_by_tenant_id_usage","method":"get","path":"/platform/tenants/{tenant_id}/usage"})
export const get_platform_tenants_page = bindJsonOperation({"operationId":"get_platform_tenants_page","method":"get","path":"/platform/tenants/page"})
export const post_platform_product_plans = bindJsonOperation({"operationId":"post_platform_product_plans","method":"post","path":"/platform/product-plans"})
export const post_platform_product_plans_by_plan_id_versions = bindJsonOperation({"operationId":"post_platform_product_plans_by_plan_id_versions","method":"post","path":"/platform/product-plans/{plan_id}/versions"})
export const post_platform_product_plans_by_plan_id_versions_by_version_publish = bindJsonOperation({"operationId":"post_platform_product_plans_by_plan_id_versions_by_version_publish","method":"post","path":"/platform/product-plans/{plan_id}/versions/{version}/publish"})
export const post_platform_product_plans_by_plan_id_versions_by_version_retire = bindJsonOperation({"operationId":"post_platform_product_plans_by_plan_id_versions_by_version_retire","method":"post","path":"/platform/product-plans/{plan_id}/versions/{version}/retire"})
export const post_platform_tenant_data_migrations_by_migration_id_cancel = bindJsonOperation({"operationId":"post_platform_tenant_data_migrations_by_migration_id_cancel","method":"post","path":"/platform/tenant-data-migrations/{migration_id}/cancel"})
export const post_platform_tenant_data_migrations_by_migration_id_finalize = bindJsonOperation({"operationId":"post_platform_tenant_data_migrations_by_migration_id_finalize","method":"post","path":"/platform/tenant-data-migrations/{migration_id}/finalize"})
export const post_platform_tenants = bindJsonOperation({"operationId":"post_platform_tenants","method":"post","path":"/platform/tenants"})
export const post_platform_tenants_by_tenant_id_data_migration_previews = bindJsonOperation({"operationId":"post_platform_tenants_by_tenant_id_data_migration_previews","method":"post","path":"/platform/tenants/{tenant_id}/data-migration-previews"})
export const post_platform_tenants_by_tenant_id_data_migrations = bindJsonOperation({"operationId":"post_platform_tenants_by_tenant_id_data_migrations","method":"post","path":"/platform/tenants/{tenant_id}/data-migrations"})
export const post_platform_tenants_by_tenant_id_product_change_previews = bindJsonOperation({"operationId":"post_platform_tenants_by_tenant_id_product_change_previews","method":"post","path":"/platform/tenants/{tenant_id}/product-change-previews"})
export const post_platform_tenants_by_tenant_id_product_changes = bindJsonOperation({"operationId":"post_platform_tenants_by_tenant_id_product_changes","method":"post","path":"/platform/tenants/{tenant_id}/product-changes"})
export const put_platform_product_plans_by_plan_id = bindJsonOperation({"operationId":"put_platform_product_plans_by_plan_id","method":"put","path":"/platform/product-plans/{plan_id}"})
export const put_platform_product_plans_by_plan_id_versions_by_version_draft = bindJsonOperation({"operationId":"put_platform_product_plans_by_plan_id_versions_by_version_draft","method":"put","path":"/platform/product-plans/{plan_id}/versions/{version}/draft"})
export const put_platform_tenants_by_tenant_id = bindJsonOperation({"operationId":"put_platform_tenants_by_tenant_id","method":"put","path":"/platform/tenants/{tenant_id}"})
export const put_platform_tenants_by_tenant_id_status = bindJsonOperation({"operationId":"put_platform_tenants_by_tenant_id_status","method":"put","path":"/platform/tenants/{tenant_id}/status"})
