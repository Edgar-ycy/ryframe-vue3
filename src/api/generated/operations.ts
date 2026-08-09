/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export const operationManifest = {
  "delete_monitor_schedules_by_id": {
    "method": "delete",
    "path": "/monitor/schedules/{id}"
  },
  "delete_system_configs_by_id": {
    "method": "delete",
    "path": "/system/configs/{id}"
  },
  "delete_system_configs_cache": {
    "method": "delete",
    "path": "/system/configs/cache"
  },
  "delete_system_depts_by_id": {
    "method": "delete",
    "path": "/system/depts/{id}"
  },
  "delete_system_dict_data_by_id": {
    "method": "delete",
    "path": "/system/dict/data/{id}"
  },
  "delete_system_dict_types_by_id": {
    "method": "delete",
    "path": "/system/dict/types/{id}"
  },
  "delete_system_menus_by_id": {
    "method": "delete",
    "path": "/system/menus/{id}"
  },
  "delete_system_notices_by_id": {
    "method": "delete",
    "path": "/system/notices/{id}"
  },
  "delete_system_online_by_sid": {
    "method": "delete",
    "path": "/system/online/{sid}"
  },
  "delete_system_perms_by_id": {
    "method": "delete",
    "path": "/system/perms/{id}"
  },
  "delete_system_posts_by_id": {
    "method": "delete",
    "path": "/system/posts/{id}"
  },
  "delete_system_roles_batch_by_ids": {
    "method": "delete",
    "path": "/system/roles/batch/{ids}"
  },
  "delete_system_roles_by_id": {
    "method": "delete",
    "path": "/system/roles/{id}"
  },
  "delete_system_users_batch_by_ids": {
    "method": "delete",
    "path": "/system/users/batch/{ids}"
  },
  "delete_system_users_by_id": {
    "method": "delete",
    "path": "/system/users/{id}"
  },
  "get_auth_captcha_config": {
    "method": "get",
    "path": "/auth/captcha/config"
  },
  "get_auth_captcha_generate": {
    "method": "get",
    "path": "/auth/captcha/generate"
  },
  "get_auth_captcha_image": {
    "method": "get",
    "path": "/auth/captcha/image"
  },
  "get_auth_csrf": {
    "method": "get",
    "path": "/auth/csrf"
  },
  "get_auth_me": {
    "method": "get",
    "path": "/auth/me"
  },
  "get_auth_profile": {
    "method": "get",
    "path": "/auth/profile"
  },
  "get_common_file_download": {
    "method": "get",
    "path": "/common/file/download"
  },
  "get_common_jobs": {
    "method": "get",
    "path": "/common/jobs"
  },
  "get_common_jobs_by_id": {
    "method": "get",
    "path": "/common/jobs/{id}"
  },
  "get_common_jobs_by_id_download": {
    "method": "get",
    "path": "/common/jobs/{id}/download"
  },
  "get_monitor_cache": {
    "method": "get",
    "path": "/monitor/cache"
  },
  "get_monitor_cache_commands": {
    "method": "get",
    "path": "/monitor/cache/commands"
  },
  "get_monitor_db_pool": {
    "method": "get",
    "path": "/monitor/db-pool"
  },
  "get_monitor_jobs": {
    "method": "get",
    "path": "/monitor/jobs"
  },
  "get_monitor_jobs_stats": {
    "method": "get",
    "path": "/monitor/jobs/stats"
  },
  "get_monitor_metrics": {
    "method": "get",
    "path": "/monitor/metrics"
  },
  "get_monitor_runtime": {
    "method": "get",
    "path": "/monitor/runtime"
  },
  "get_monitor_schedules": {
    "method": "get",
    "path": "/monitor/schedules"
  },
  "get_monitor_schedules_by_id": {
    "method": "get",
    "path": "/monitor/schedules/{id}"
  },
  "get_monitor_schedules_by_id_executions": {
    "method": "get",
    "path": "/monitor/schedules/{id}/executions"
  },
  "get_monitor_schedules_targets": {
    "method": "get",
    "path": "/monitor/schedules/targets"
  },
  "get_monitor_server": {
    "method": "get",
    "path": "/monitor/server"
  },
  "get_platform_tenants": {
    "method": "get",
    "path": "/platform/tenants"
  },
  "get_system_configs": {
    "method": "get",
    "path": "/system/configs"
  },
  "get_system_configs_by_id": {
    "method": "get",
    "path": "/system/configs/{id}"
  },
  "get_system_configs_key_by_key": {
    "method": "get",
    "path": "/system/configs/key/{key}"
  },
  "get_system_depts": {
    "method": "get",
    "path": "/system/depts"
  },
  "get_system_depts_by_id": {
    "method": "get",
    "path": "/system/depts/{id}"
  },
  "get_system_depts_tree": {
    "method": "get",
    "path": "/system/depts/tree"
  },
  "get_system_dict_data": {
    "method": "get",
    "path": "/system/dict/data"
  },
  "get_system_dict_data_type_by_dict_type": {
    "method": "get",
    "path": "/system/dict/data/type/{dict_type}"
  },
  "get_system_dict_types": {
    "method": "get",
    "path": "/system/dict/types"
  },
  "get_system_loginlogs": {
    "method": "get",
    "path": "/system/loginlogs"
  },
  "get_system_menus": {
    "method": "get",
    "path": "/system/menus"
  },
  "get_system_menus_by_id": {
    "method": "get",
    "path": "/system/menus/{id}"
  },
  "get_system_menus_current": {
    "method": "get",
    "path": "/system/menus/current"
  },
  "get_system_menus_tree": {
    "method": "get",
    "path": "/system/menus/tree"
  },
  "get_system_messages": {
    "method": "get",
    "path": "/system/messages"
  },
  "get_system_messages_unread_count": {
    "method": "get",
    "path": "/system/messages/unread-count"
  },
  "get_system_notices": {
    "method": "get",
    "path": "/system/notices"
  },
  "get_system_notices_by_id": {
    "method": "get",
    "path": "/system/notices/{id}"
  },
  "get_system_online": {
    "method": "get",
    "path": "/system/online"
  },
  "get_system_operlogs": {
    "method": "get",
    "path": "/system/operlogs"
  },
  "get_system_perms_by_id": {
    "method": "get",
    "path": "/system/perms/{id}"
  },
  "get_system_perms_tree": {
    "method": "get",
    "path": "/system/perms/tree"
  },
  "get_system_posts": {
    "method": "get",
    "path": "/system/posts"
  },
  "get_system_posts_by_id": {
    "method": "get",
    "path": "/system/posts/{id}"
  },
  "get_system_roles": {
    "method": "get",
    "path": "/system/roles"
  },
  "get_system_roles_by_id": {
    "method": "get",
    "path": "/system/roles/{id}"
  },
  "get_system_roles_by_id_permissions": {
    "method": "get",
    "path": "/system/roles/{id}/permissions"
  },
  "get_system_roles_options": {
    "method": "get",
    "path": "/system/roles/options"
  },
  "get_system_users": {
    "method": "get",
    "path": "/system/users"
  },
  "get_system_users_by_id": {
    "method": "get",
    "path": "/system/users/{id}"
  },
  "get_system_users_import_template": {
    "method": "get",
    "path": "/system/users/import-template"
  },
  "get_system_users_options": {
    "method": "get",
    "path": "/system/users/options"
  },
  "get_tools_gen_tables": {
    "method": "get",
    "path": "/tools/gen/tables"
  },
  "get_version": {
    "method": "get",
    "path": "/version"
  },
  "post_auth_captcha_verify": {
    "method": "post",
    "path": "/auth/captcha/verify"
  },
  "post_auth_login": {
    "method": "post",
    "path": "/auth/login"
  },
  "post_auth_logout": {
    "method": "post",
    "path": "/auth/logout"
  },
  "post_auth_password_reset_complete": {
    "method": "post",
    "path": "/auth/password-reset/complete"
  },
  "post_auth_refresh": {
    "method": "post",
    "path": "/auth/refresh"
  },
  "post_auth_ws_ticket": {
    "method": "post",
    "path": "/auth/ws-ticket"
  },
  "post_common_jobs_by_id_cancel": {
    "method": "post",
    "path": "/common/jobs/{id}/cancel"
  },
  "post_common_upload": {
    "method": "post",
    "path": "/common/upload"
  },
  "post_common_upload_avatar": {
    "method": "post",
    "path": "/common/upload/avatar"
  },
  "post_common_upload_image": {
    "method": "post",
    "path": "/common/upload/image"
  },
  "post_monitor_jobs_by_id_retry": {
    "method": "post",
    "path": "/monitor/jobs/{id}/retry"
  },
  "post_monitor_schedules": {
    "method": "post",
    "path": "/monitor/schedules"
  },
  "post_monitor_schedules_by_id_run": {
    "method": "post",
    "path": "/monitor/schedules/{id}/run"
  },
  "post_monitor_schedules_preview": {
    "method": "post",
    "path": "/monitor/schedules/preview"
  },
  "post_platform_tenants": {
    "method": "post",
    "path": "/platform/tenants"
  },
  "post_system_configs": {
    "method": "post",
    "path": "/system/configs"
  },
  "post_system_configs_exports": {
    "method": "post",
    "path": "/system/configs/exports"
  },
  "post_system_depts": {
    "method": "post",
    "path": "/system/depts"
  },
  "post_system_dict_data": {
    "method": "post",
    "path": "/system/dict/data"
  },
  "post_system_dict_types": {
    "method": "post",
    "path": "/system/dict/types"
  },
  "post_system_dict_types_exports": {
    "method": "post",
    "path": "/system/dict/types/exports"
  },
  "post_system_loginlogs_exports": {
    "method": "post",
    "path": "/system/loginlogs/exports"
  },
  "post_system_menus": {
    "method": "post",
    "path": "/system/menus"
  },
  "post_system_messages": {
    "method": "post",
    "path": "/system/messages"
  },
  "post_system_messages_ack": {
    "method": "post",
    "path": "/system/messages/ack"
  },
  "post_system_messages_delete": {
    "method": "post",
    "path": "/system/messages/delete"
  },
  "post_system_notices": {
    "method": "post",
    "path": "/system/notices"
  },
  "post_system_notices_by_id_publish_message": {
    "method": "post",
    "path": "/system/notices/{id}/publish-message"
  },
  "post_system_operlogs_exports": {
    "method": "post",
    "path": "/system/operlogs/exports"
  },
  "post_system_perms": {
    "method": "post",
    "path": "/system/perms"
  },
  "post_system_perms_sync": {
    "method": "post",
    "path": "/system/perms/sync"
  },
  "post_system_posts": {
    "method": "post",
    "path": "/system/posts"
  },
  "post_system_posts_exports": {
    "method": "post",
    "path": "/system/posts/exports"
  },
  "post_system_roles": {
    "method": "post",
    "path": "/system/roles"
  },
  "post_system_roles_exports": {
    "method": "post",
    "path": "/system/roles/exports"
  },
  "post_system_users": {
    "method": "post",
    "path": "/system/users"
  },
  "post_system_users_by_id_password_reset_requests": {
    "method": "post",
    "path": "/system/users/{id}/password-reset-requests"
  },
  "post_system_users_exports": {
    "method": "post",
    "path": "/system/users/exports"
  },
  "post_system_users_import": {
    "method": "post",
    "path": "/system/users/import"
  },
  "post_tools_gen_download": {
    "method": "post",
    "path": "/tools/gen/download"
  },
  "post_tools_gen_generate": {
    "method": "post",
    "path": "/tools/gen/generate"
  },
  "post_tools_gen_preview": {
    "method": "post",
    "path": "/tools/gen/preview"
  },
  "put_auth_profile": {
    "method": "put",
    "path": "/auth/profile"
  },
  "put_auth_profile_avatar": {
    "method": "put",
    "path": "/auth/profile/avatar"
  },
  "put_auth_profile_password": {
    "method": "put",
    "path": "/auth/profile/password"
  },
  "put_monitor_schedules_by_id": {
    "method": "put",
    "path": "/monitor/schedules/{id}"
  },
  "put_monitor_schedules_by_id_status": {
    "method": "put",
    "path": "/monitor/schedules/{id}/status"
  },
  "put_platform_tenants_by_tenant_id": {
    "method": "put",
    "path": "/platform/tenants/{tenant_id}"
  },
  "put_platform_tenants_by_tenant_id_status": {
    "method": "put",
    "path": "/platform/tenants/{tenant_id}/status"
  },
  "put_system_configs_by_id": {
    "method": "put",
    "path": "/system/configs/{id}"
  },
  "put_system_depts_by_id": {
    "method": "put",
    "path": "/system/depts/{id}"
  },
  "put_system_dict_data_by_id": {
    "method": "put",
    "path": "/system/dict/data/{id}"
  },
  "put_system_dict_types_by_id": {
    "method": "put",
    "path": "/system/dict/types/{id}"
  },
  "put_system_menus_by_id": {
    "method": "put",
    "path": "/system/menus/{id}"
  },
  "put_system_messages_by_id_read": {
    "method": "put",
    "path": "/system/messages/{id}/read"
  },
  "put_system_messages_read_all": {
    "method": "put",
    "path": "/system/messages/read-all"
  },
  "put_system_notices_by_id": {
    "method": "put",
    "path": "/system/notices/{id}"
  },
  "put_system_perms_by_id": {
    "method": "put",
    "path": "/system/perms/{id}"
  },
  "put_system_posts_by_id": {
    "method": "put",
    "path": "/system/posts/{id}"
  },
  "put_system_roles_by_id": {
    "method": "put",
    "path": "/system/roles/{id}"
  },
  "put_system_roles_by_id_data_scope": {
    "method": "put",
    "path": "/system/roles/{id}/data-scope"
  },
  "put_system_roles_by_id_permissions": {
    "method": "put",
    "path": "/system/roles/{id}/permissions"
  },
  "put_system_users_by_id": {
    "method": "put",
    "path": "/system/users/{id}"
  },
  "put_system_users_by_id_roles": {
    "method": "put",
    "path": "/system/users/{id}/roles"
  },
  "put_system_users_by_id_status": {
    "method": "put",
    "path": "/system/users/{id}/status"
  }
} as const

export type OperationManifest = typeof operationManifest
export type OperationId = keyof OperationManifest
