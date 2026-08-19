/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export type OperationId =
  | "delete_auth_sessions_by_sid"
  | "delete_monitor_schedules_by_id"
  | "delete_profile_service_delegations_by_id"
  | "delete_system_configs_by_id"
  | "delete_system_configs_cache"
  | "delete_system_depts_by_id"
  | "delete_system_dict_data_by_id"
  | "delete_system_dict_types_by_id"
  | "delete_system_menus_by_id"
  | "delete_system_notices_by_id"
  | "delete_system_online_by_sid"
  | "delete_system_perms_by_id"
  | "delete_system_posts_by_id"
  | "delete_system_roles_batch_by_ids"
  | "delete_system_roles_by_id"
  | "delete_system_service_accounts_by_id"
  | "delete_system_service_accounts_by_id_credentials_by_credential_id"
  | "delete_system_service_delegations_by_id"
  | "delete_system_users_batch_by_ids"
  | "delete_system_users_by_id"
  | "get_agent_v1_capabilities"
  | "get_agent_v1_directory_departments"
  | "get_agent_v1_directory_posts"
  | "get_agent_v1_directory_users"
  | "get_agent_v1_reference_dictionaries_by_type_code"
  | "get_auth_captcha_config"
  | "get_auth_captcha_generate"
  | "get_auth_captcha_image"
  | "get_auth_context"
  | "get_auth_csrf"
  | "get_auth_profile"
  | "get_auth_sessions"
  | "get_common_file_download"
  | "get_common_jobs"
  | "get_common_jobs_by_id"
  | "get_common_jobs_by_id_download"
  | "get_common_jobs_notifications_unread_count"
  | "get_monitor_cache"
  | "get_monitor_cache_commands"
  | "get_monitor_db_pool"
  | "get_monitor_jobs"
  | "get_monitor_jobs_stats"
  | "get_monitor_metrics"
  | "get_monitor_overview"
  | "get_monitor_overview_trends"
  | "get_monitor_retention"
  | "get_monitor_retention_runs"
  | "get_monitor_runtime"
  | "get_monitor_schedules"
  | "get_monitor_schedules_by_id"
  | "get_monitor_schedules_by_id_executions"
  | "get_monitor_schedules_targets"
  | "get_monitor_server"
  | "get_platform_capabilities"
  | "get_platform_data_targets"
  | "get_platform_data_targets_by_target_key"
  | "get_platform_data_targets_by_target_key_backup_points"
  | "get_platform_product_plans"
  | "get_platform_product_plans_by_plan_id"
  | "get_platform_product_plans_by_plan_id_versions"
  | "get_platform_tenant_data_migrations_by_migration_id"
  | "get_platform_tenants"
  | "get_platform_tenants_by_tenant_id"
  | "get_platform_tenants_by_tenant_id_data_migrations"
  | "get_platform_tenants_by_tenant_id_data_placement"
  | "get_platform_tenants_by_tenant_id_product_context"
  | "get_platform_tenants_by_tenant_id_usage"
  | "get_platform_tenants_page"
  | "get_profile_service_delegations"
  | "get_profile_service_delegations_capabilities"
  | "get_system_authorization_diagnostics_users_by_id"
  | "get_system_config_packages"
  | "get_system_config_packages_by_id"
  | "get_system_config_packages_by_id_download"
  | "get_system_config_transfers"
  | "get_system_config_transfers_by_id"
  | "get_system_config_transfers_by_id_items"
  | "get_system_configs"
  | "get_system_configs_by_id"
  | "get_system_configs_key_by_key"
  | "get_system_depts"
  | "get_system_depts_by_id"
  | "get_system_depts_tree"
  | "get_system_dict_data"
  | "get_system_dict_data_type_by_dict_type"
  | "get_system_dict_types"
  | "get_system_loginlogs"
  | "get_system_menus"
  | "get_system_menus_by_id"
  | "get_system_menus_tree"
  | "get_system_messages"
  | "get_system_messages_unread_count"
  | "get_system_notices"
  | "get_system_notices_by_id"
  | "get_system_online"
  | "get_system_operlogs"
  | "get_system_perms_by_id"
  | "get_system_perms_tree"
  | "get_system_posts"
  | "get_system_posts_by_id"
  | "get_system_roles"
  | "get_system_roles_by_id"
  | "get_system_roles_by_id_permissions"
  | "get_system_roles_options"
  | "get_system_service_access_audits"
  | "get_system_service_accounts"
  | "get_system_service_accounts_by_id"
  | "get_system_service_accounts_by_id_credentials"
  | "get_system_service_accounts_by_id_roles"
  | "get_system_service_delegations"
  | "get_system_user_imports"
  | "get_system_user_imports_by_id"
  | "get_system_user_imports_by_id_report"
  | "get_system_user_imports_by_id_rows"
  | "get_system_users"
  | "get_system_users_by_id"
  | "get_system_users_import_template"
  | "get_system_users_options"
  | "get_version"
  | "post_auth_captcha_verify"
  | "post_auth_login"
  | "post_auth_logout"
  | "post_auth_password_reset_complete"
  | "post_auth_refresh"
  | "post_auth_sessions_revoke_others"
  | "post_auth_ws_ticket"
  | "post_common_jobs_by_id_cancel"
  | "post_common_jobs_notifications_read"
  | "post_common_upload"
  | "post_common_upload_avatar"
  | "post_common_upload_image"
  | "post_monitor_jobs_by_id_retry"
  | "post_monitor_retention_preview"
  | "post_monitor_retention_run"
  | "post_monitor_schedules"
  | "post_monitor_schedules_by_id_run"
  | "post_monitor_schedules_preview"
  | "post_platform_product_plans"
  | "post_platform_product_plans_by_plan_id_versions"
  | "post_platform_product_plans_by_plan_id_versions_by_version_publish"
  | "post_platform_product_plans_by_plan_id_versions_by_version_retire"
  | "post_platform_tenant_data_migrations_by_migration_id_cancel"
  | "post_platform_tenant_data_migrations_by_migration_id_finalize"
  | "post_platform_tenants"
  | "post_platform_tenants_by_tenant_id_data_migration_previews"
  | "post_platform_tenants_by_tenant_id_data_migrations"
  | "post_platform_tenants_by_tenant_id_product_change_previews"
  | "post_platform_tenants_by_tenant_id_product_changes"
  | "post_profile_service_delegations"
  | "post_system_config_packages"
  | "post_system_config_transfers_by_id_apply"
  | "post_system_config_transfers_by_id_preview"
  | "post_system_config_transfers_by_id_rollback"
  | "post_system_config_transfers_from_package"
  | "post_system_config_transfers_upload"
  | "post_system_configs"
  | "post_system_configs_exports"
  | "post_system_depts"
  | "post_system_dict_data"
  | "post_system_dict_types"
  | "post_system_dict_types_exports"
  | "post_system_loginlogs_exports"
  | "post_system_menus"
  | "post_system_messages"
  | "post_system_messages_ack"
  | "post_system_messages_delete"
  | "post_system_notices"
  | "post_system_notices_by_id_publish_message"
  | "post_system_operlogs_exports"
  | "post_system_perms"
  | "post_system_perms_sync"
  | "post_system_posts"
  | "post_system_posts_exports"
  | "post_system_roles"
  | "post_system_roles_exports"
  | "post_system_service_accounts"
  | "post_system_service_accounts_by_id_credentials"
  | "post_system_user_imports"
  | "post_system_user_imports_by_id_cancel"
  | "post_system_users"
  | "post_system_users_by_id_password_reset_requests"
  | "post_system_users_exports"
  | "put_auth_profile"
  | "put_auth_profile_avatar"
  | "put_auth_profile_password"
  | "put_monitor_schedules_by_id"
  | "put_monitor_schedules_by_id_status"
  | "put_platform_product_plans_by_plan_id"
  | "put_platform_product_plans_by_plan_id_versions_by_version_draft"
  | "put_platform_tenants_by_tenant_id"
  | "put_platform_tenants_by_tenant_id_status"
  | "put_system_configs_by_id"
  | "put_system_depts_by_id"
  | "put_system_dict_data_by_id"
  | "put_system_dict_types_by_id"
  | "put_system_menus_by_id"
  | "put_system_messages_by_id_read"
  | "put_system_messages_read_all"
  | "put_system_notices_by_id"
  | "put_system_perms_by_id"
  | "put_system_posts_by_id"
  | "put_system_roles_by_id"
  | "put_system_roles_by_id_data_scope"
  | "put_system_roles_by_id_permissions"
  | "put_system_service_accounts_by_id"
  | "put_system_service_accounts_by_id_roles"
  | "put_system_service_accounts_by_id_status"
  | "put_system_users_by_id"
  | "put_system_users_by_id_roles"
  | "put_system_users_by_id_status"

export type OperationDescriptor<Name extends OperationId = OperationId> = Readonly<{
  operationId: Name
  method: 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace'
  path: string
}>

export const delete_auth_sessions_by_sid = {"operationId":"delete_auth_sessions_by_sid","method":"delete","path":"/auth/sessions/{sid}"} as const satisfies OperationDescriptor<"delete_auth_sessions_by_sid">

export const delete_monitor_schedules_by_id = {"operationId":"delete_monitor_schedules_by_id","method":"delete","path":"/monitor/schedules/{id}"} as const satisfies OperationDescriptor<"delete_monitor_schedules_by_id">

export const delete_profile_service_delegations_by_id = {"operationId":"delete_profile_service_delegations_by_id","method":"delete","path":"/profile/service-delegations/{id}"} as const satisfies OperationDescriptor<"delete_profile_service_delegations_by_id">

export const delete_system_configs_by_id = {"operationId":"delete_system_configs_by_id","method":"delete","path":"/system/configs/{id}"} as const satisfies OperationDescriptor<"delete_system_configs_by_id">

export const delete_system_configs_cache = {"operationId":"delete_system_configs_cache","method":"delete","path":"/system/configs/cache"} as const satisfies OperationDescriptor<"delete_system_configs_cache">

export const delete_system_depts_by_id = {"operationId":"delete_system_depts_by_id","method":"delete","path":"/system/depts/{id}"} as const satisfies OperationDescriptor<"delete_system_depts_by_id">

export const delete_system_dict_data_by_id = {"operationId":"delete_system_dict_data_by_id","method":"delete","path":"/system/dict/data/{id}"} as const satisfies OperationDescriptor<"delete_system_dict_data_by_id">

export const delete_system_dict_types_by_id = {"operationId":"delete_system_dict_types_by_id","method":"delete","path":"/system/dict/types/{id}"} as const satisfies OperationDescriptor<"delete_system_dict_types_by_id">

export const delete_system_menus_by_id = {"operationId":"delete_system_menus_by_id","method":"delete","path":"/system/menus/{id}"} as const satisfies OperationDescriptor<"delete_system_menus_by_id">

export const delete_system_notices_by_id = {"operationId":"delete_system_notices_by_id","method":"delete","path":"/system/notices/{id}"} as const satisfies OperationDescriptor<"delete_system_notices_by_id">

export const delete_system_online_by_sid = {"operationId":"delete_system_online_by_sid","method":"delete","path":"/system/online/{sid}"} as const satisfies OperationDescriptor<"delete_system_online_by_sid">

export const delete_system_perms_by_id = {"operationId":"delete_system_perms_by_id","method":"delete","path":"/system/perms/{id}"} as const satisfies OperationDescriptor<"delete_system_perms_by_id">

export const delete_system_posts_by_id = {"operationId":"delete_system_posts_by_id","method":"delete","path":"/system/posts/{id}"} as const satisfies OperationDescriptor<"delete_system_posts_by_id">

export const delete_system_roles_batch_by_ids = {"operationId":"delete_system_roles_batch_by_ids","method":"delete","path":"/system/roles/batch/{ids}"} as const satisfies OperationDescriptor<"delete_system_roles_batch_by_ids">

export const delete_system_roles_by_id = {"operationId":"delete_system_roles_by_id","method":"delete","path":"/system/roles/{id}"} as const satisfies OperationDescriptor<"delete_system_roles_by_id">

export const delete_system_service_accounts_by_id = {"operationId":"delete_system_service_accounts_by_id","method":"delete","path":"/system/service-accounts/{id}"} as const satisfies OperationDescriptor<"delete_system_service_accounts_by_id">

export const delete_system_service_accounts_by_id_credentials_by_credential_id = {"operationId":"delete_system_service_accounts_by_id_credentials_by_credential_id","method":"delete","path":"/system/service-accounts/{id}/credentials/{credential_id}"} as const satisfies OperationDescriptor<"delete_system_service_accounts_by_id_credentials_by_credential_id">

export const delete_system_service_delegations_by_id = {"operationId":"delete_system_service_delegations_by_id","method":"delete","path":"/system/service-delegations/{id}"} as const satisfies OperationDescriptor<"delete_system_service_delegations_by_id">

export const delete_system_users_batch_by_ids = {"operationId":"delete_system_users_batch_by_ids","method":"delete","path":"/system/users/batch/{ids}"} as const satisfies OperationDescriptor<"delete_system_users_batch_by_ids">

export const delete_system_users_by_id = {"operationId":"delete_system_users_by_id","method":"delete","path":"/system/users/{id}"} as const satisfies OperationDescriptor<"delete_system_users_by_id">

export const get_agent_v1_capabilities = {"operationId":"get_agent_v1_capabilities","method":"get","path":"/agent/v1/capabilities"} as const satisfies OperationDescriptor<"get_agent_v1_capabilities">

export const get_agent_v1_directory_departments = {"operationId":"get_agent_v1_directory_departments","method":"get","path":"/agent/v1/directory/departments"} as const satisfies OperationDescriptor<"get_agent_v1_directory_departments">

export const get_agent_v1_directory_posts = {"operationId":"get_agent_v1_directory_posts","method":"get","path":"/agent/v1/directory/posts"} as const satisfies OperationDescriptor<"get_agent_v1_directory_posts">

export const get_agent_v1_directory_users = {"operationId":"get_agent_v1_directory_users","method":"get","path":"/agent/v1/directory/users"} as const satisfies OperationDescriptor<"get_agent_v1_directory_users">

export const get_agent_v1_reference_dictionaries_by_type_code = {"operationId":"get_agent_v1_reference_dictionaries_by_type_code","method":"get","path":"/agent/v1/reference/dictionaries/{type_code}"} as const satisfies OperationDescriptor<"get_agent_v1_reference_dictionaries_by_type_code">

export const get_auth_captcha_config = {"operationId":"get_auth_captcha_config","method":"get","path":"/auth/captcha/config"} as const satisfies OperationDescriptor<"get_auth_captcha_config">

export const get_auth_captcha_generate = {"operationId":"get_auth_captcha_generate","method":"get","path":"/auth/captcha/generate"} as const satisfies OperationDescriptor<"get_auth_captcha_generate">

export const get_auth_captcha_image = {"operationId":"get_auth_captcha_image","method":"get","path":"/auth/captcha/image"} as const satisfies OperationDescriptor<"get_auth_captcha_image">

export const get_auth_context = {"operationId":"get_auth_context","method":"get","path":"/auth/context"} as const satisfies OperationDescriptor<"get_auth_context">

export const get_auth_csrf = {"operationId":"get_auth_csrf","method":"get","path":"/auth/csrf"} as const satisfies OperationDescriptor<"get_auth_csrf">

export const get_auth_profile = {"operationId":"get_auth_profile","method":"get","path":"/auth/profile"} as const satisfies OperationDescriptor<"get_auth_profile">

export const get_auth_sessions = {"operationId":"get_auth_sessions","method":"get","path":"/auth/sessions"} as const satisfies OperationDescriptor<"get_auth_sessions">

export const get_common_file_download = {"operationId":"get_common_file_download","method":"get","path":"/common/file/download"} as const satisfies OperationDescriptor<"get_common_file_download">

export const get_common_jobs = {"operationId":"get_common_jobs","method":"get","path":"/common/jobs"} as const satisfies OperationDescriptor<"get_common_jobs">

export const get_common_jobs_by_id = {"operationId":"get_common_jobs_by_id","method":"get","path":"/common/jobs/{id}"} as const satisfies OperationDescriptor<"get_common_jobs_by_id">

export const get_common_jobs_by_id_download = {"operationId":"get_common_jobs_by_id_download","method":"get","path":"/common/jobs/{id}/download"} as const satisfies OperationDescriptor<"get_common_jobs_by_id_download">

export const get_common_jobs_notifications_unread_count = {"operationId":"get_common_jobs_notifications_unread_count","method":"get","path":"/common/jobs/notifications/unread-count"} as const satisfies OperationDescriptor<"get_common_jobs_notifications_unread_count">

export const get_monitor_cache = {"operationId":"get_monitor_cache","method":"get","path":"/monitor/cache"} as const satisfies OperationDescriptor<"get_monitor_cache">

export const get_monitor_cache_commands = {"operationId":"get_monitor_cache_commands","method":"get","path":"/monitor/cache/commands"} as const satisfies OperationDescriptor<"get_monitor_cache_commands">

export const get_monitor_db_pool = {"operationId":"get_monitor_db_pool","method":"get","path":"/monitor/db-pool"} as const satisfies OperationDescriptor<"get_monitor_db_pool">

export const get_monitor_jobs = {"operationId":"get_monitor_jobs","method":"get","path":"/monitor/jobs"} as const satisfies OperationDescriptor<"get_monitor_jobs">

export const get_monitor_jobs_stats = {"operationId":"get_monitor_jobs_stats","method":"get","path":"/monitor/jobs/stats"} as const satisfies OperationDescriptor<"get_monitor_jobs_stats">

export const get_monitor_metrics = {"operationId":"get_monitor_metrics","method":"get","path":"/monitor/metrics"} as const satisfies OperationDescriptor<"get_monitor_metrics">

export const get_monitor_overview = {"operationId":"get_monitor_overview","method":"get","path":"/monitor/overview"} as const satisfies OperationDescriptor<"get_monitor_overview">

export const get_monitor_overview_trends = {"operationId":"get_monitor_overview_trends","method":"get","path":"/monitor/overview/trends"} as const satisfies OperationDescriptor<"get_monitor_overview_trends">

export const get_monitor_retention = {"operationId":"get_monitor_retention","method":"get","path":"/monitor/retention"} as const satisfies OperationDescriptor<"get_monitor_retention">

export const get_monitor_retention_runs = {"operationId":"get_monitor_retention_runs","method":"get","path":"/monitor/retention/runs"} as const satisfies OperationDescriptor<"get_monitor_retention_runs">

export const get_monitor_runtime = {"operationId":"get_monitor_runtime","method":"get","path":"/monitor/runtime"} as const satisfies OperationDescriptor<"get_monitor_runtime">

export const get_monitor_schedules = {"operationId":"get_monitor_schedules","method":"get","path":"/monitor/schedules"} as const satisfies OperationDescriptor<"get_monitor_schedules">

export const get_monitor_schedules_by_id = {"operationId":"get_monitor_schedules_by_id","method":"get","path":"/monitor/schedules/{id}"} as const satisfies OperationDescriptor<"get_monitor_schedules_by_id">

export const get_monitor_schedules_by_id_executions = {"operationId":"get_monitor_schedules_by_id_executions","method":"get","path":"/monitor/schedules/{id}/executions"} as const satisfies OperationDescriptor<"get_monitor_schedules_by_id_executions">

export const get_monitor_schedules_targets = {"operationId":"get_monitor_schedules_targets","method":"get","path":"/monitor/schedules/targets"} as const satisfies OperationDescriptor<"get_monitor_schedules_targets">

export const get_monitor_server = {"operationId":"get_monitor_server","method":"get","path":"/monitor/server"} as const satisfies OperationDescriptor<"get_monitor_server">

export const get_platform_capabilities = {"operationId":"get_platform_capabilities","method":"get","path":"/platform/capabilities"} as const satisfies OperationDescriptor<"get_platform_capabilities">

export const get_platform_data_targets = {"operationId":"get_platform_data_targets","method":"get","path":"/platform/data-targets"} as const satisfies OperationDescriptor<"get_platform_data_targets">

export const get_platform_data_targets_by_target_key = {"operationId":"get_platform_data_targets_by_target_key","method":"get","path":"/platform/data-targets/{target_key}"} as const satisfies OperationDescriptor<"get_platform_data_targets_by_target_key">

export const get_platform_data_targets_by_target_key_backup_points = {"operationId":"get_platform_data_targets_by_target_key_backup_points","method":"get","path":"/platform/data-targets/{target_key}/backup-points"} as const satisfies OperationDescriptor<"get_platform_data_targets_by_target_key_backup_points">

export const get_platform_product_plans = {"operationId":"get_platform_product_plans","method":"get","path":"/platform/product-plans"} as const satisfies OperationDescriptor<"get_platform_product_plans">

export const get_platform_product_plans_by_plan_id = {"operationId":"get_platform_product_plans_by_plan_id","method":"get","path":"/platform/product-plans/{plan_id}"} as const satisfies OperationDescriptor<"get_platform_product_plans_by_plan_id">

export const get_platform_product_plans_by_plan_id_versions = {"operationId":"get_platform_product_plans_by_plan_id_versions","method":"get","path":"/platform/product-plans/{plan_id}/versions"} as const satisfies OperationDescriptor<"get_platform_product_plans_by_plan_id_versions">

export const get_platform_tenant_data_migrations_by_migration_id = {"operationId":"get_platform_tenant_data_migrations_by_migration_id","method":"get","path":"/platform/tenant-data-migrations/{migration_id}"} as const satisfies OperationDescriptor<"get_platform_tenant_data_migrations_by_migration_id">

export const get_platform_tenants = {"operationId":"get_platform_tenants","method":"get","path":"/platform/tenants"} as const satisfies OperationDescriptor<"get_platform_tenants">

export const get_platform_tenants_by_tenant_id = {"operationId":"get_platform_tenants_by_tenant_id","method":"get","path":"/platform/tenants/{tenant_id}"} as const satisfies OperationDescriptor<"get_platform_tenants_by_tenant_id">

export const get_platform_tenants_by_tenant_id_data_migrations = {"operationId":"get_platform_tenants_by_tenant_id_data_migrations","method":"get","path":"/platform/tenants/{tenant_id}/data-migrations"} as const satisfies OperationDescriptor<"get_platform_tenants_by_tenant_id_data_migrations">

export const get_platform_tenants_by_tenant_id_data_placement = {"operationId":"get_platform_tenants_by_tenant_id_data_placement","method":"get","path":"/platform/tenants/{tenant_id}/data-placement"} as const satisfies OperationDescriptor<"get_platform_tenants_by_tenant_id_data_placement">

export const get_platform_tenants_by_tenant_id_product_context = {"operationId":"get_platform_tenants_by_tenant_id_product_context","method":"get","path":"/platform/tenants/{tenant_id}/product-context"} as const satisfies OperationDescriptor<"get_platform_tenants_by_tenant_id_product_context">

export const get_platform_tenants_by_tenant_id_usage = {"operationId":"get_platform_tenants_by_tenant_id_usage","method":"get","path":"/platform/tenants/{tenant_id}/usage"} as const satisfies OperationDescriptor<"get_platform_tenants_by_tenant_id_usage">

export const get_platform_tenants_page = {"operationId":"get_platform_tenants_page","method":"get","path":"/platform/tenants/page"} as const satisfies OperationDescriptor<"get_platform_tenants_page">

export const get_profile_service_delegations = {"operationId":"get_profile_service_delegations","method":"get","path":"/profile/service-delegations"} as const satisfies OperationDescriptor<"get_profile_service_delegations">

export const get_profile_service_delegations_capabilities = {"operationId":"get_profile_service_delegations_capabilities","method":"get","path":"/profile/service-delegations/capabilities"} as const satisfies OperationDescriptor<"get_profile_service_delegations_capabilities">

export const get_system_authorization_diagnostics_users_by_id = {"operationId":"get_system_authorization_diagnostics_users_by_id","method":"get","path":"/system/authorization-diagnostics/users/{id}"} as const satisfies OperationDescriptor<"get_system_authorization_diagnostics_users_by_id">

export const get_system_config_packages = {"operationId":"get_system_config_packages","method":"get","path":"/system/config-packages"} as const satisfies OperationDescriptor<"get_system_config_packages">

export const get_system_config_packages_by_id = {"operationId":"get_system_config_packages_by_id","method":"get","path":"/system/config-packages/{id}"} as const satisfies OperationDescriptor<"get_system_config_packages_by_id">

export const get_system_config_packages_by_id_download = {"operationId":"get_system_config_packages_by_id_download","method":"get","path":"/system/config-packages/{id}/download"} as const satisfies OperationDescriptor<"get_system_config_packages_by_id_download">

export const get_system_config_transfers = {"operationId":"get_system_config_transfers","method":"get","path":"/system/config-transfers"} as const satisfies OperationDescriptor<"get_system_config_transfers">

export const get_system_config_transfers_by_id = {"operationId":"get_system_config_transfers_by_id","method":"get","path":"/system/config-transfers/{id}"} as const satisfies OperationDescriptor<"get_system_config_transfers_by_id">

export const get_system_config_transfers_by_id_items = {"operationId":"get_system_config_transfers_by_id_items","method":"get","path":"/system/config-transfers/{id}/items"} as const satisfies OperationDescriptor<"get_system_config_transfers_by_id_items">

export const get_system_configs = {"operationId":"get_system_configs","method":"get","path":"/system/configs"} as const satisfies OperationDescriptor<"get_system_configs">

export const get_system_configs_by_id = {"operationId":"get_system_configs_by_id","method":"get","path":"/system/configs/{id}"} as const satisfies OperationDescriptor<"get_system_configs_by_id">

export const get_system_configs_key_by_key = {"operationId":"get_system_configs_key_by_key","method":"get","path":"/system/configs/key/{key}"} as const satisfies OperationDescriptor<"get_system_configs_key_by_key">

export const get_system_depts = {"operationId":"get_system_depts","method":"get","path":"/system/depts"} as const satisfies OperationDescriptor<"get_system_depts">

export const get_system_depts_by_id = {"operationId":"get_system_depts_by_id","method":"get","path":"/system/depts/{id}"} as const satisfies OperationDescriptor<"get_system_depts_by_id">

export const get_system_depts_tree = {"operationId":"get_system_depts_tree","method":"get","path":"/system/depts/tree"} as const satisfies OperationDescriptor<"get_system_depts_tree">

export const get_system_dict_data = {"operationId":"get_system_dict_data","method":"get","path":"/system/dict/data"} as const satisfies OperationDescriptor<"get_system_dict_data">

export const get_system_dict_data_type_by_dict_type = {"operationId":"get_system_dict_data_type_by_dict_type","method":"get","path":"/system/dict/data/type/{dict_type}"} as const satisfies OperationDescriptor<"get_system_dict_data_type_by_dict_type">

export const get_system_dict_types = {"operationId":"get_system_dict_types","method":"get","path":"/system/dict/types"} as const satisfies OperationDescriptor<"get_system_dict_types">

export const get_system_loginlogs = {"operationId":"get_system_loginlogs","method":"get","path":"/system/loginlogs"} as const satisfies OperationDescriptor<"get_system_loginlogs">

export const get_system_menus = {"operationId":"get_system_menus","method":"get","path":"/system/menus"} as const satisfies OperationDescriptor<"get_system_menus">

export const get_system_menus_by_id = {"operationId":"get_system_menus_by_id","method":"get","path":"/system/menus/{id}"} as const satisfies OperationDescriptor<"get_system_menus_by_id">

export const get_system_menus_tree = {"operationId":"get_system_menus_tree","method":"get","path":"/system/menus/tree"} as const satisfies OperationDescriptor<"get_system_menus_tree">

export const get_system_messages = {"operationId":"get_system_messages","method":"get","path":"/system/messages"} as const satisfies OperationDescriptor<"get_system_messages">

export const get_system_messages_unread_count = {"operationId":"get_system_messages_unread_count","method":"get","path":"/system/messages/unread-count"} as const satisfies OperationDescriptor<"get_system_messages_unread_count">

export const get_system_notices = {"operationId":"get_system_notices","method":"get","path":"/system/notices"} as const satisfies OperationDescriptor<"get_system_notices">

export const get_system_notices_by_id = {"operationId":"get_system_notices_by_id","method":"get","path":"/system/notices/{id}"} as const satisfies OperationDescriptor<"get_system_notices_by_id">

export const get_system_online = {"operationId":"get_system_online","method":"get","path":"/system/online"} as const satisfies OperationDescriptor<"get_system_online">

export const get_system_operlogs = {"operationId":"get_system_operlogs","method":"get","path":"/system/operlogs"} as const satisfies OperationDescriptor<"get_system_operlogs">

export const get_system_perms_by_id = {"operationId":"get_system_perms_by_id","method":"get","path":"/system/perms/{id}"} as const satisfies OperationDescriptor<"get_system_perms_by_id">

export const get_system_perms_tree = {"operationId":"get_system_perms_tree","method":"get","path":"/system/perms/tree"} as const satisfies OperationDescriptor<"get_system_perms_tree">

export const get_system_posts = {"operationId":"get_system_posts","method":"get","path":"/system/posts"} as const satisfies OperationDescriptor<"get_system_posts">

export const get_system_posts_by_id = {"operationId":"get_system_posts_by_id","method":"get","path":"/system/posts/{id}"} as const satisfies OperationDescriptor<"get_system_posts_by_id">

export const get_system_roles = {"operationId":"get_system_roles","method":"get","path":"/system/roles"} as const satisfies OperationDescriptor<"get_system_roles">

export const get_system_roles_by_id = {"operationId":"get_system_roles_by_id","method":"get","path":"/system/roles/{id}"} as const satisfies OperationDescriptor<"get_system_roles_by_id">

export const get_system_roles_by_id_permissions = {"operationId":"get_system_roles_by_id_permissions","method":"get","path":"/system/roles/{id}/permissions"} as const satisfies OperationDescriptor<"get_system_roles_by_id_permissions">

export const get_system_roles_options = {"operationId":"get_system_roles_options","method":"get","path":"/system/roles/options"} as const satisfies OperationDescriptor<"get_system_roles_options">

export const get_system_service_access_audits = {"operationId":"get_system_service_access_audits","method":"get","path":"/system/service-access-audits"} as const satisfies OperationDescriptor<"get_system_service_access_audits">

export const get_system_service_accounts = {"operationId":"get_system_service_accounts","method":"get","path":"/system/service-accounts"} as const satisfies OperationDescriptor<"get_system_service_accounts">

export const get_system_service_accounts_by_id = {"operationId":"get_system_service_accounts_by_id","method":"get","path":"/system/service-accounts/{id}"} as const satisfies OperationDescriptor<"get_system_service_accounts_by_id">

export const get_system_service_accounts_by_id_credentials = {"operationId":"get_system_service_accounts_by_id_credentials","method":"get","path":"/system/service-accounts/{id}/credentials"} as const satisfies OperationDescriptor<"get_system_service_accounts_by_id_credentials">

export const get_system_service_accounts_by_id_roles = {"operationId":"get_system_service_accounts_by_id_roles","method":"get","path":"/system/service-accounts/{id}/roles"} as const satisfies OperationDescriptor<"get_system_service_accounts_by_id_roles">

export const get_system_service_delegations = {"operationId":"get_system_service_delegations","method":"get","path":"/system/service-delegations"} as const satisfies OperationDescriptor<"get_system_service_delegations">

export const get_system_user_imports = {"operationId":"get_system_user_imports","method":"get","path":"/system/user-imports"} as const satisfies OperationDescriptor<"get_system_user_imports">

export const get_system_user_imports_by_id = {"operationId":"get_system_user_imports_by_id","method":"get","path":"/system/user-imports/{id}"} as const satisfies OperationDescriptor<"get_system_user_imports_by_id">

export const get_system_user_imports_by_id_report = {"operationId":"get_system_user_imports_by_id_report","method":"get","path":"/system/user-imports/{id}/report"} as const satisfies OperationDescriptor<"get_system_user_imports_by_id_report">

export const get_system_user_imports_by_id_rows = {"operationId":"get_system_user_imports_by_id_rows","method":"get","path":"/system/user-imports/{id}/rows"} as const satisfies OperationDescriptor<"get_system_user_imports_by_id_rows">

export const get_system_users = {"operationId":"get_system_users","method":"get","path":"/system/users"} as const satisfies OperationDescriptor<"get_system_users">

export const get_system_users_by_id = {"operationId":"get_system_users_by_id","method":"get","path":"/system/users/{id}"} as const satisfies OperationDescriptor<"get_system_users_by_id">

export const get_system_users_import_template = {"operationId":"get_system_users_import_template","method":"get","path":"/system/users/import-template"} as const satisfies OperationDescriptor<"get_system_users_import_template">

export const get_system_users_options = {"operationId":"get_system_users_options","method":"get","path":"/system/users/options"} as const satisfies OperationDescriptor<"get_system_users_options">

export const get_version = {"operationId":"get_version","method":"get","path":"/version"} as const satisfies OperationDescriptor<"get_version">

export const post_auth_captcha_verify = {"operationId":"post_auth_captcha_verify","method":"post","path":"/auth/captcha/verify"} as const satisfies OperationDescriptor<"post_auth_captcha_verify">

export const post_auth_login = {"operationId":"post_auth_login","method":"post","path":"/auth/login"} as const satisfies OperationDescriptor<"post_auth_login">

export const post_auth_logout = {"operationId":"post_auth_logout","method":"post","path":"/auth/logout"} as const satisfies OperationDescriptor<"post_auth_logout">

export const post_auth_password_reset_complete = {"operationId":"post_auth_password_reset_complete","method":"post","path":"/auth/password-reset/complete"} as const satisfies OperationDescriptor<"post_auth_password_reset_complete">

export const post_auth_refresh = {"operationId":"post_auth_refresh","method":"post","path":"/auth/refresh"} as const satisfies OperationDescriptor<"post_auth_refresh">

export const post_auth_sessions_revoke_others = {"operationId":"post_auth_sessions_revoke_others","method":"post","path":"/auth/sessions/revoke-others"} as const satisfies OperationDescriptor<"post_auth_sessions_revoke_others">

export const post_auth_ws_ticket = {"operationId":"post_auth_ws_ticket","method":"post","path":"/auth/ws-ticket"} as const satisfies OperationDescriptor<"post_auth_ws_ticket">

export const post_common_jobs_by_id_cancel = {"operationId":"post_common_jobs_by_id_cancel","method":"post","path":"/common/jobs/{id}/cancel"} as const satisfies OperationDescriptor<"post_common_jobs_by_id_cancel">

export const post_common_jobs_notifications_read = {"operationId":"post_common_jobs_notifications_read","method":"post","path":"/common/jobs/notifications/read"} as const satisfies OperationDescriptor<"post_common_jobs_notifications_read">

export const post_common_upload = {"operationId":"post_common_upload","method":"post","path":"/common/upload"} as const satisfies OperationDescriptor<"post_common_upload">

export const post_common_upload_avatar = {"operationId":"post_common_upload_avatar","method":"post","path":"/common/upload/avatar"} as const satisfies OperationDescriptor<"post_common_upload_avatar">

export const post_common_upload_image = {"operationId":"post_common_upload_image","method":"post","path":"/common/upload/image"} as const satisfies OperationDescriptor<"post_common_upload_image">

export const post_monitor_jobs_by_id_retry = {"operationId":"post_monitor_jobs_by_id_retry","method":"post","path":"/monitor/jobs/{id}/retry"} as const satisfies OperationDescriptor<"post_monitor_jobs_by_id_retry">

export const post_monitor_retention_preview = {"operationId":"post_monitor_retention_preview","method":"post","path":"/monitor/retention/preview"} as const satisfies OperationDescriptor<"post_monitor_retention_preview">

export const post_monitor_retention_run = {"operationId":"post_monitor_retention_run","method":"post","path":"/monitor/retention/run"} as const satisfies OperationDescriptor<"post_monitor_retention_run">

export const post_monitor_schedules = {"operationId":"post_monitor_schedules","method":"post","path":"/monitor/schedules"} as const satisfies OperationDescriptor<"post_monitor_schedules">

export const post_monitor_schedules_by_id_run = {"operationId":"post_monitor_schedules_by_id_run","method":"post","path":"/monitor/schedules/{id}/run"} as const satisfies OperationDescriptor<"post_monitor_schedules_by_id_run">

export const post_monitor_schedules_preview = {"operationId":"post_monitor_schedules_preview","method":"post","path":"/monitor/schedules/preview"} as const satisfies OperationDescriptor<"post_monitor_schedules_preview">

export const post_platform_product_plans = {"operationId":"post_platform_product_plans","method":"post","path":"/platform/product-plans"} as const satisfies OperationDescriptor<"post_platform_product_plans">

export const post_platform_product_plans_by_plan_id_versions = {"operationId":"post_platform_product_plans_by_plan_id_versions","method":"post","path":"/platform/product-plans/{plan_id}/versions"} as const satisfies OperationDescriptor<"post_platform_product_plans_by_plan_id_versions">

export const post_platform_product_plans_by_plan_id_versions_by_version_publish = {"operationId":"post_platform_product_plans_by_plan_id_versions_by_version_publish","method":"post","path":"/platform/product-plans/{plan_id}/versions/{version}/publish"} as const satisfies OperationDescriptor<"post_platform_product_plans_by_plan_id_versions_by_version_publish">

export const post_platform_product_plans_by_plan_id_versions_by_version_retire = {"operationId":"post_platform_product_plans_by_plan_id_versions_by_version_retire","method":"post","path":"/platform/product-plans/{plan_id}/versions/{version}/retire"} as const satisfies OperationDescriptor<"post_platform_product_plans_by_plan_id_versions_by_version_retire">

export const post_platform_tenant_data_migrations_by_migration_id_cancel = {"operationId":"post_platform_tenant_data_migrations_by_migration_id_cancel","method":"post","path":"/platform/tenant-data-migrations/{migration_id}/cancel"} as const satisfies OperationDescriptor<"post_platform_tenant_data_migrations_by_migration_id_cancel">

export const post_platform_tenant_data_migrations_by_migration_id_finalize = {"operationId":"post_platform_tenant_data_migrations_by_migration_id_finalize","method":"post","path":"/platform/tenant-data-migrations/{migration_id}/finalize"} as const satisfies OperationDescriptor<"post_platform_tenant_data_migrations_by_migration_id_finalize">

export const post_platform_tenants = {"operationId":"post_platform_tenants","method":"post","path":"/platform/tenants"} as const satisfies OperationDescriptor<"post_platform_tenants">

export const post_platform_tenants_by_tenant_id_data_migration_previews = {"operationId":"post_platform_tenants_by_tenant_id_data_migration_previews","method":"post","path":"/platform/tenants/{tenant_id}/data-migration-previews"} as const satisfies OperationDescriptor<"post_platform_tenants_by_tenant_id_data_migration_previews">

export const post_platform_tenants_by_tenant_id_data_migrations = {"operationId":"post_platform_tenants_by_tenant_id_data_migrations","method":"post","path":"/platform/tenants/{tenant_id}/data-migrations"} as const satisfies OperationDescriptor<"post_platform_tenants_by_tenant_id_data_migrations">

export const post_platform_tenants_by_tenant_id_product_change_previews = {"operationId":"post_platform_tenants_by_tenant_id_product_change_previews","method":"post","path":"/platform/tenants/{tenant_id}/product-change-previews"} as const satisfies OperationDescriptor<"post_platform_tenants_by_tenant_id_product_change_previews">

export const post_platform_tenants_by_tenant_id_product_changes = {"operationId":"post_platform_tenants_by_tenant_id_product_changes","method":"post","path":"/platform/tenants/{tenant_id}/product-changes"} as const satisfies OperationDescriptor<"post_platform_tenants_by_tenant_id_product_changes">

export const post_profile_service_delegations = {"operationId":"post_profile_service_delegations","method":"post","path":"/profile/service-delegations"} as const satisfies OperationDescriptor<"post_profile_service_delegations">

export const post_system_config_packages = {"operationId":"post_system_config_packages","method":"post","path":"/system/config-packages"} as const satisfies OperationDescriptor<"post_system_config_packages">

export const post_system_config_transfers_by_id_apply = {"operationId":"post_system_config_transfers_by_id_apply","method":"post","path":"/system/config-transfers/{id}/apply"} as const satisfies OperationDescriptor<"post_system_config_transfers_by_id_apply">

export const post_system_config_transfers_by_id_preview = {"operationId":"post_system_config_transfers_by_id_preview","method":"post","path":"/system/config-transfers/{id}/preview"} as const satisfies OperationDescriptor<"post_system_config_transfers_by_id_preview">

export const post_system_config_transfers_by_id_rollback = {"operationId":"post_system_config_transfers_by_id_rollback","method":"post","path":"/system/config-transfers/{id}/rollback"} as const satisfies OperationDescriptor<"post_system_config_transfers_by_id_rollback">

export const post_system_config_transfers_from_package = {"operationId":"post_system_config_transfers_from_package","method":"post","path":"/system/config-transfers/from-package"} as const satisfies OperationDescriptor<"post_system_config_transfers_from_package">

export const post_system_config_transfers_upload = {"operationId":"post_system_config_transfers_upload","method":"post","path":"/system/config-transfers/upload"} as const satisfies OperationDescriptor<"post_system_config_transfers_upload">

export const post_system_configs = {"operationId":"post_system_configs","method":"post","path":"/system/configs"} as const satisfies OperationDescriptor<"post_system_configs">

export const post_system_configs_exports = {"operationId":"post_system_configs_exports","method":"post","path":"/system/configs/exports"} as const satisfies OperationDescriptor<"post_system_configs_exports">

export const post_system_depts = {"operationId":"post_system_depts","method":"post","path":"/system/depts"} as const satisfies OperationDescriptor<"post_system_depts">

export const post_system_dict_data = {"operationId":"post_system_dict_data","method":"post","path":"/system/dict/data"} as const satisfies OperationDescriptor<"post_system_dict_data">

export const post_system_dict_types = {"operationId":"post_system_dict_types","method":"post","path":"/system/dict/types"} as const satisfies OperationDescriptor<"post_system_dict_types">

export const post_system_dict_types_exports = {"operationId":"post_system_dict_types_exports","method":"post","path":"/system/dict/types/exports"} as const satisfies OperationDescriptor<"post_system_dict_types_exports">

export const post_system_loginlogs_exports = {"operationId":"post_system_loginlogs_exports","method":"post","path":"/system/loginlogs/exports"} as const satisfies OperationDescriptor<"post_system_loginlogs_exports">

export const post_system_menus = {"operationId":"post_system_menus","method":"post","path":"/system/menus"} as const satisfies OperationDescriptor<"post_system_menus">

export const post_system_messages = {"operationId":"post_system_messages","method":"post","path":"/system/messages"} as const satisfies OperationDescriptor<"post_system_messages">

export const post_system_messages_ack = {"operationId":"post_system_messages_ack","method":"post","path":"/system/messages/ack"} as const satisfies OperationDescriptor<"post_system_messages_ack">

export const post_system_messages_delete = {"operationId":"post_system_messages_delete","method":"post","path":"/system/messages/delete"} as const satisfies OperationDescriptor<"post_system_messages_delete">

export const post_system_notices = {"operationId":"post_system_notices","method":"post","path":"/system/notices"} as const satisfies OperationDescriptor<"post_system_notices">

export const post_system_notices_by_id_publish_message = {"operationId":"post_system_notices_by_id_publish_message","method":"post","path":"/system/notices/{id}/publish-message"} as const satisfies OperationDescriptor<"post_system_notices_by_id_publish_message">

export const post_system_operlogs_exports = {"operationId":"post_system_operlogs_exports","method":"post","path":"/system/operlogs/exports"} as const satisfies OperationDescriptor<"post_system_operlogs_exports">

export const post_system_perms = {"operationId":"post_system_perms","method":"post","path":"/system/perms"} as const satisfies OperationDescriptor<"post_system_perms">

export const post_system_perms_sync = {"operationId":"post_system_perms_sync","method":"post","path":"/system/perms/sync"} as const satisfies OperationDescriptor<"post_system_perms_sync">

export const post_system_posts = {"operationId":"post_system_posts","method":"post","path":"/system/posts"} as const satisfies OperationDescriptor<"post_system_posts">

export const post_system_posts_exports = {"operationId":"post_system_posts_exports","method":"post","path":"/system/posts/exports"} as const satisfies OperationDescriptor<"post_system_posts_exports">

export const post_system_roles = {"operationId":"post_system_roles","method":"post","path":"/system/roles"} as const satisfies OperationDescriptor<"post_system_roles">

export const post_system_roles_exports = {"operationId":"post_system_roles_exports","method":"post","path":"/system/roles/exports"} as const satisfies OperationDescriptor<"post_system_roles_exports">

export const post_system_service_accounts = {"operationId":"post_system_service_accounts","method":"post","path":"/system/service-accounts"} as const satisfies OperationDescriptor<"post_system_service_accounts">

export const post_system_service_accounts_by_id_credentials = {"operationId":"post_system_service_accounts_by_id_credentials","method":"post","path":"/system/service-accounts/{id}/credentials"} as const satisfies OperationDescriptor<"post_system_service_accounts_by_id_credentials">

export const post_system_user_imports = {"operationId":"post_system_user_imports","method":"post","path":"/system/user-imports"} as const satisfies OperationDescriptor<"post_system_user_imports">

export const post_system_user_imports_by_id_cancel = {"operationId":"post_system_user_imports_by_id_cancel","method":"post","path":"/system/user-imports/{id}/cancel"} as const satisfies OperationDescriptor<"post_system_user_imports_by_id_cancel">

export const post_system_users = {"operationId":"post_system_users","method":"post","path":"/system/users"} as const satisfies OperationDescriptor<"post_system_users">

export const post_system_users_by_id_password_reset_requests = {"operationId":"post_system_users_by_id_password_reset_requests","method":"post","path":"/system/users/{id}/password-reset-requests"} as const satisfies OperationDescriptor<"post_system_users_by_id_password_reset_requests">

export const post_system_users_exports = {"operationId":"post_system_users_exports","method":"post","path":"/system/users/exports"} as const satisfies OperationDescriptor<"post_system_users_exports">

export const put_auth_profile = {"operationId":"put_auth_profile","method":"put","path":"/auth/profile"} as const satisfies OperationDescriptor<"put_auth_profile">

export const put_auth_profile_avatar = {"operationId":"put_auth_profile_avatar","method":"put","path":"/auth/profile/avatar"} as const satisfies OperationDescriptor<"put_auth_profile_avatar">

export const put_auth_profile_password = {"operationId":"put_auth_profile_password","method":"put","path":"/auth/profile/password"} as const satisfies OperationDescriptor<"put_auth_profile_password">

export const put_monitor_schedules_by_id = {"operationId":"put_monitor_schedules_by_id","method":"put","path":"/monitor/schedules/{id}"} as const satisfies OperationDescriptor<"put_monitor_schedules_by_id">

export const put_monitor_schedules_by_id_status = {"operationId":"put_monitor_schedules_by_id_status","method":"put","path":"/monitor/schedules/{id}/status"} as const satisfies OperationDescriptor<"put_monitor_schedules_by_id_status">

export const put_platform_product_plans_by_plan_id = {"operationId":"put_platform_product_plans_by_plan_id","method":"put","path":"/platform/product-plans/{plan_id}"} as const satisfies OperationDescriptor<"put_platform_product_plans_by_plan_id">

export const put_platform_product_plans_by_plan_id_versions_by_version_draft = {"operationId":"put_platform_product_plans_by_plan_id_versions_by_version_draft","method":"put","path":"/platform/product-plans/{plan_id}/versions/{version}/draft"} as const satisfies OperationDescriptor<"put_platform_product_plans_by_plan_id_versions_by_version_draft">

export const put_platform_tenants_by_tenant_id = {"operationId":"put_platform_tenants_by_tenant_id","method":"put","path":"/platform/tenants/{tenant_id}"} as const satisfies OperationDescriptor<"put_platform_tenants_by_tenant_id">

export const put_platform_tenants_by_tenant_id_status = {"operationId":"put_platform_tenants_by_tenant_id_status","method":"put","path":"/platform/tenants/{tenant_id}/status"} as const satisfies OperationDescriptor<"put_platform_tenants_by_tenant_id_status">

export const put_system_configs_by_id = {"operationId":"put_system_configs_by_id","method":"put","path":"/system/configs/{id}"} as const satisfies OperationDescriptor<"put_system_configs_by_id">

export const put_system_depts_by_id = {"operationId":"put_system_depts_by_id","method":"put","path":"/system/depts/{id}"} as const satisfies OperationDescriptor<"put_system_depts_by_id">

export const put_system_dict_data_by_id = {"operationId":"put_system_dict_data_by_id","method":"put","path":"/system/dict/data/{id}"} as const satisfies OperationDescriptor<"put_system_dict_data_by_id">

export const put_system_dict_types_by_id = {"operationId":"put_system_dict_types_by_id","method":"put","path":"/system/dict/types/{id}"} as const satisfies OperationDescriptor<"put_system_dict_types_by_id">

export const put_system_menus_by_id = {"operationId":"put_system_menus_by_id","method":"put","path":"/system/menus/{id}"} as const satisfies OperationDescriptor<"put_system_menus_by_id">

export const put_system_messages_by_id_read = {"operationId":"put_system_messages_by_id_read","method":"put","path":"/system/messages/{id}/read"} as const satisfies OperationDescriptor<"put_system_messages_by_id_read">

export const put_system_messages_read_all = {"operationId":"put_system_messages_read_all","method":"put","path":"/system/messages/read-all"} as const satisfies OperationDescriptor<"put_system_messages_read_all">

export const put_system_notices_by_id = {"operationId":"put_system_notices_by_id","method":"put","path":"/system/notices/{id}"} as const satisfies OperationDescriptor<"put_system_notices_by_id">

export const put_system_perms_by_id = {"operationId":"put_system_perms_by_id","method":"put","path":"/system/perms/{id}"} as const satisfies OperationDescriptor<"put_system_perms_by_id">

export const put_system_posts_by_id = {"operationId":"put_system_posts_by_id","method":"put","path":"/system/posts/{id}"} as const satisfies OperationDescriptor<"put_system_posts_by_id">

export const put_system_roles_by_id = {"operationId":"put_system_roles_by_id","method":"put","path":"/system/roles/{id}"} as const satisfies OperationDescriptor<"put_system_roles_by_id">

export const put_system_roles_by_id_data_scope = {"operationId":"put_system_roles_by_id_data_scope","method":"put","path":"/system/roles/{id}/data-scope"} as const satisfies OperationDescriptor<"put_system_roles_by_id_data_scope">

export const put_system_roles_by_id_permissions = {"operationId":"put_system_roles_by_id_permissions","method":"put","path":"/system/roles/{id}/permissions"} as const satisfies OperationDescriptor<"put_system_roles_by_id_permissions">

export const put_system_service_accounts_by_id = {"operationId":"put_system_service_accounts_by_id","method":"put","path":"/system/service-accounts/{id}"} as const satisfies OperationDescriptor<"put_system_service_accounts_by_id">

export const put_system_service_accounts_by_id_roles = {"operationId":"put_system_service_accounts_by_id_roles","method":"put","path":"/system/service-accounts/{id}/roles"} as const satisfies OperationDescriptor<"put_system_service_accounts_by_id_roles">

export const put_system_service_accounts_by_id_status = {"operationId":"put_system_service_accounts_by_id_status","method":"put","path":"/system/service-accounts/{id}/status"} as const satisfies OperationDescriptor<"put_system_service_accounts_by_id_status">

export const put_system_users_by_id = {"operationId":"put_system_users_by_id","method":"put","path":"/system/users/{id}"} as const satisfies OperationDescriptor<"put_system_users_by_id">

export const put_system_users_by_id_roles = {"operationId":"put_system_users_by_id_roles","method":"put","path":"/system/users/{id}/roles"} as const satisfies OperationDescriptor<"put_system_users_by_id_roles">

export const put_system_users_by_id_status = {"operationId":"put_system_users_by_id_status","method":"put","path":"/system/users/{id}/status"} as const satisfies OperationDescriptor<"put_system_users_by_id_status">
