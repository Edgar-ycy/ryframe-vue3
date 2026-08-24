/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export interface paths {
    "/api/v1/system/authorization-diagnostics/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_authorization_diagnostics_users_by_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-packages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_config_packages"];
        put?: never;
        post: operations["post_system_config_packages"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-packages/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_config_packages_by_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-packages/{id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_config_packages_by_id_download"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-transfers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_config_transfers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-transfers/from-package": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_config_transfers_from_package"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-transfers/upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_config_transfers_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-transfers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_config_transfers_by_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-transfers/{id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_config_transfers_by_id_apply"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-transfers/{id}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_config_transfers_by_id_items"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-transfers/{id}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_config_transfers_by_id_preview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/config-transfers/{id}/rollback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_config_transfers_by_id_rollback"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/configs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 参数配置列表 */
        get: operations["get_system_configs"];
        put?: never;
        /** 创建参数配置 */
        post: operations["post_system_configs"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/configs/cache": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * 刷新参数缓存
         * @description 清空所有参数配置的 Redis 缓存
         */
        delete: operations["delete_system_configs_cache"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/configs/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 创建参数配置异步导出任务。 */
        post: operations["post_system_configs_exports"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/configs/key/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 根据参数键名查询参数值 */
        get: operations["get_system_configs_key_by_key"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/configs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 参数配置详情 */
        get: operations["get_system_configs_by_id"];
        /** 更新参数配置 */
        put: operations["put_system_configs_by_id"];
        post?: never;
        /** 删除参数配置 */
        delete: operations["delete_system_configs_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/depts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 部门列表分页查询 */
        get: operations["get_system_depts"];
        put?: never;
        /** 创建部门 */
        post: operations["post_system_depts"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/depts/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 部门树查询 */
        get: operations["get_system_depts_tree"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/depts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 部门详情 */
        get: operations["get_system_depts_by_id"];
        /** 更新部门 */
        put: operations["put_system_depts_by_id"];
        post?: never;
        /** 删除部门 */
        delete: operations["delete_system_depts_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/dict/data": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_dict_data"];
        put?: never;
        /** 创建字典数据 */
        post: operations["post_system_dict_data"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/dict/data/type/{dict_type}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 通过字典类型编码查询字典数据
         *     查询字典数据
         */
        get: operations["get_system_dict_data_type_by_dict_type"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/dict/data/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** 更新字典数据 */
        put: operations["put_system_dict_data_by_id"];
        post?: never;
        /** 删除字典数据 */
        delete: operations["delete_system_dict_data_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/dict/types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 字典类型列表 */
        get: operations["get_system_dict_types"];
        put?: never;
        /** 创建字典类型 */
        post: operations["post_system_dict_types"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/dict/types/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 创建字典类型异步导出任务。 */
        post: operations["post_system_dict_types_exports"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/dict/types/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** 更新字典类型 */
        put: operations["put_system_dict_types_by_id"];
        post?: never;
        /** 删除字典类型 */
        delete: operations["delete_system_dict_types_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/loginlogs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 登录日志列表 */
        get: operations["get_system_loginlogs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/loginlogs/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 创建登录日志异步导出任务。 */
        post: operations["post_system_loginlogs_exports"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/menus": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 菜单列表分页查询 */
        get: operations["get_system_menus"];
        put?: never;
        /** 创建菜单 */
        post: operations["post_system_menus"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/menus/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 菜单树查询 */
        get: operations["get_system_menus_tree"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/menus/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 菜单详情 */
        get: operations["get_system_menus_by_id"];
        /** 更新菜单 */
        put: operations["put_system_menus_by_id"];
        post?: never;
        /** 删除菜单 */
        delete: operations["delete_system_menus_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 获取当前用户的消息收件箱。 */
        get: operations["get_system_messages"];
        put?: never;
        /** 发布一条消息并固化收件人快照。 */
        post: operations["post_system_messages"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/messages/ack": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 批量确认已接收的消息。 */
        post: operations["post_system_messages_ack"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/messages/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 软删除当前用户收到的消息。 */
        post: operations["post_system_messages_delete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/messages/read-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** 将当前用户全部未读消息标记为已读。 */
        put: operations["put_system_messages_read_all"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/messages/unread-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 获取当前用户未读消息数。 */
        get: operations["get_system_messages_unread_count"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/messages/{id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** 标记单条消息为已读。 */
        put: operations["put_system_messages_by_id_read"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/notices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 通知公告列表 */
        get: operations["get_system_notices"];
        put?: never;
        /** 创建通知公告 */
        post: operations["post_system_notices"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/notices/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 通知公告详情 */
        get: operations["get_system_notices_by_id"];
        /** 更新通知公告 */
        put: operations["put_system_notices_by_id"];
        post?: never;
        /** 删除通知公告 */
        delete: operations["delete_system_notices_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/notices/{id}/publish-message": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 将已发布公告显式投递到当前租户的消息中心。
         * @description 使用公告 ID 作为业务幂等键，因此重复点击不会再次创建收件人快照。
         */
        post: operations["post_system_notices_by_id_publish_message"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/online": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 获取在线用户列表（分页） */
        get: operations["get_system_online"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/online/{sid}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * 强制下线用户
         *     强制下线用户
         */
        delete: operations["delete_system_online_by_sid"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/operlogs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 操作日志列表 */
        get: operations["get_system_operlogs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/operlogs/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 创建操作日志异步导出任务。 */
        post: operations["post_system_operlogs_exports"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/perms": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_perms"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/perms/sync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_perms_sync"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/perms/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_perms_tree"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/perms/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_perms_by_id"];
        put: operations["put_system_perms_by_id"];
        post?: never;
        delete: operations["delete_system_perms_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/posts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_posts"];
        put?: never;
        post: operations["post_system_posts"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/posts/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 创建岗位异步导出任务。 */
        post: operations["post_system_posts_exports"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/posts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_posts_by_id"];
        put: operations["put_system_posts_by_id"];
        post?: never;
        delete: operations["delete_system_posts_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 角色列表分页查询 */
        get: operations["get_system_roles"];
        put?: never;
        /** 创建角色 */
        post: operations["post_system_roles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/batch/{ids}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 批量删除角色 */
        delete: operations["delete_system_roles_batch_by_ids"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 创建角色异步导出任务。 */
        post: operations["post_system_roles_exports"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查询当前操作者可以分配的角色选项。 */
        get: operations["get_system_roles_options"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 角色详情 */
        get: operations["get_system_roles_by_id"];
        /** 更新角色 */
        put: operations["put_system_roles_by_id"];
        post?: never;
        /** 删除角色 */
        delete: operations["delete_system_roles_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/{id}/data-scope": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** 原子替换一个角色的数据范围和自定义部门。 */
        put: operations["put_system_roles_by_id_data_scope"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/{id}/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查询角色已分配的权限ID列表 */
        get: operations["get_system_roles_by_id_permissions"];
        /** 替换一个角色已分配的全部权限。 */
        put: operations["put_system_roles_by_id_permissions"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-access-audits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_service_access_audits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_service_accounts"];
        put?: never;
        post: operations["post_system_service_accounts"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-accounts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_service_accounts_by_id"];
        put: operations["put_system_service_accounts_by_id"];
        post?: never;
        delete: operations["delete_system_service_accounts_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-accounts/{id}/credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_service_accounts_by_id_credentials"];
        put?: never;
        post: operations["post_system_service_accounts_by_id_credentials"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-accounts/{id}/credentials/{credential_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["delete_system_service_accounts_by_id_credentials_by_credential_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-accounts/{id}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_service_accounts_by_id_roles"];
        put: operations["put_system_service_accounts_by_id_roles"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-accounts/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["put_system_service_accounts_by_id_status"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-delegations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_service_delegations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/service-delegations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["delete_system_service_delegations_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/user-imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_user_imports"];
        put?: never;
        post: operations["post_system_user_imports"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/user-imports/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_user_imports_by_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/user-imports/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_user_imports_by_id_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/user-imports/{id}/report": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_user_imports_by_id_report"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/user-imports/{id}/rows": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_user_imports_by_id_rows"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_users"];
        put?: never;
        post: operations["post_system_users"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/batch/{ids}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["delete_system_users_batch_by_ids"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 创建用户异步导出任务，实际文件由 Worker 生成并保存到对象存储。 */
        post: operations["post_system_users_exports"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/import-template": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_users_import_template"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查询当前操作者数据范围内的用户选项。 */
        get: operations["get_system_users_options"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_system_users_by_id"];
        put: operations["put_system_users_by_id"];
        post?: never;
        delete: operations["delete_system_users_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}/password-reset-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_users_by_id_password_reset_requests"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["put_system_users_by_id_roles"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["put_system_users_by_id_status"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** @description 批量确认消息请求。 */
        AcknowledgeMessagesDto: {
            ids: string[];
        };
        /**
         * @description 不携带业务数据的统一响应。
         *
         *     保持独立类型可让 OpenAPI 正确生成空数据响应的 Schema，避免把 Rust 的
         *     单元类型错误地暴露成不存在的组件引用。
         */
        ApiEmptyResponse: {
            /** Format: int32 */
            code: number;
            /** @default null */
            data: unknown;
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_ConfigVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_ConfigVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_DeptVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_DeptVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_DictTypeVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_DictTypeVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_LoginInfoVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_LoginInfoVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_MenuVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_MenuVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_NoticeVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_NoticeVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_OnlineUserVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_OnlineUserVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_OperLogVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_OperLogVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_PostVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_PostVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_RoleVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_RoleVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_ServiceAccessAuditVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_ServiceAccessAuditVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_ServiceAccountVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_ServiceAccountVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_ServiceDelegationVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_ServiceDelegationVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_TenantConfigBundleVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_TenantConfigBundleVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_TenantConfigTransferItemVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_TenantConfigTransferItemVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_TenantConfigTransferVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_TenantConfigTransferVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_UserImportJobVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_UserImportJobVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_UserImportRowVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_UserImportRowVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_UserVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_UserVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_AuthorizationDiagnosticVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                /** Format: date-time */
                calculated_at: string;
                data_scope: components["schemas"]["AuthorizationDiagnosticDataScopeVo"];
                dynamic_refresh: components["schemas"]["AuthorizationDiagnosticRefreshVo"];
                menus: components["schemas"]["AuthorizationDiagnosticMenuVo"][];
                permissions: components["schemas"]["AuthorizationDiagnosticPermissionVo"][];
                roles: components["schemas"]["AuthorizationDiagnosticRoleVo"][];
                tenant: components["schemas"]["AuthorizationDiagnosticTenantVo"];
                user: components["schemas"]["AuthorizationDiagnosticUserVo"];
                versions: components["schemas"]["AuthorizationDiagnosticVersionVo"];
                warnings: string[];
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_ConfigVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 参数配置响应。 */
            data?: {
                /** Format: date-time */
                created_at: string;
                id: string;
                key: string;
                name: string;
                portable: boolean;
                remark?: string | null;
                value: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_CreatedServiceCredentialVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                credential: components["schemas"]["ServiceCredentialVo"];
                /** @description 仅首次成功时返回完整 API Key；幂等重放为 `null`。 */
                secret?: string | null;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_DeptVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 部门响应。 */
            data?: {
                ancestors: string;
                /** Format: date-time */
                created_at: string;
                id: string;
                name: string;
                parent_id?: string | null;
                remark?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_DictDataVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 字典数据响应。 */
            data?: {
                css_class?: string | null;
                id: string;
                label: string;
                /** Format: int32 */
                sort: number;
                status: string;
                type_code: string;
                value: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_DictTypeVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 字典类型响应。 */
            data?: {
                code: string;
                /** Format: date-time */
                created_at: string;
                id: string;
                name: string;
                remark?: string | null;
                status: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_ExportJobVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 导出任务响应。 */
            data?: {
                /** Format: date-time */
                completed_at?: string | null;
                content_type?: string | null;
                /** Format: date-time */
                created_at: string;
                error_message?: string | null;
                /** Format: date-time */
                expires_at?: string | null;
                /** Format: int64 */
                file_size?: number | null;
                id: string;
                /** Format: int64 */
                matched_rows: number;
                /** Format: date-time */
                notification_read_at?: string | null;
                resource: string;
                result_file_name?: string | null;
                /** Format: date-time */
                snapshot_at: string;
                status: string;
                /** Format: date-time */
                updated_at: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_MenuVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 菜单响应。 */
            data?: {
                /** Format: date-time */
                created_at: string;
                icon?: string | null;
                id: string;
                menu_type: components["schemas"]["MenuType"];
                name: string;
                parent_id?: string | null;
                perm_id?: string | null;
                remark?: string | null;
                route_key?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
                visible: boolean;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_MessageInboxPage: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 面向 REST 客户端的游标收件箱响应。 */
            data?: {
                next_cursor?: string | null;
                records: components["schemas"]["MessageVo"][];
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_NoticeVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 通知公告响应。 */
            data?: {
                content_markdown: string;
                /** Format: date-time */
                created_at: string;
                created_by?: string | null;
                id: string;
                notice_type?: string | null;
                status: string;
                title: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_OptionList: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 有界选择器响应。 */
            data?: {
                has_more: boolean;
                items: components["schemas"]["OptionItem"][];
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_PasswordResetRequestResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                expires_at: string;
                request_id: string;
                reset_url: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_PermissionSyncReport: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 权限同步结果。 */
            data?: {
                created: number;
                existing: number;
                missing: string[];
                scanned: number;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_PermissionVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 权限详情响应。 */
            data?: {
                code: string;
                /** Format: date-time */
                created_at: string;
                icon?: string | null;
                id: string;
                name: string;
                parent_id?: string | null;
                perm_type: components["schemas"]["PermissionType"];
                /** Format: int32 */
                sort: number;
                status: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_PostVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                code: string;
                /** Format: date-time */
                created_at: string;
                id: string;
                name: string;
                remark?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_PublishedMessageVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 面向 REST 客户端的发布结果。 */
            data?: {
                inserted: boolean;
                message: components["schemas"]["MessageVo"];
                recipient_count: number;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_RoleVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 角色响应。 */
            data?: {
                code: string;
                /** Format: date-time */
                created_at: string;
                data_scope: string;
                dept_ids?: string[] | null;
                id: string;
                /** Format: int32 */
                is_super: number;
                name: string;
                remark?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_ServiceAccountDetailVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                account: components["schemas"]["ServiceAccountVo"];
                role_ids: string[];
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_ServiceAccountVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                /** Format: int32 */
                authorization_version: number;
                code: string;
                /** Format: date-time */
                created_at: string;
                dept_id?: string | null;
                description?: string | null;
                id: string;
                /** Format: int32 */
                max_requests_per_minute: number;
                name: string;
                status: string;
                /** Format: date-time */
                updated_at: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_String: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: string;
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_TenantConfigBundleVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 配置包的安全公开视图，不包含对象路径或数据库内部标识。 */
            data?: {
                /** Format: date-time */
                created_at: string;
                error_summary?: string | null;
                /** Format: date-time */
                expires_at?: string | null;
                id: string;
                /** Format: int32 */
                item_count: number;
                origin: string;
                package_schema_version: string;
                resource_counts: {
                    [key: string]: number;
                };
                sha256?: string | null;
                source_app_version: string;
                source_tenant_key: string;
                source_tenant_name: string;
                status: string;
                /** Format: date-time */
                updated_at: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_TenantConfigTransferVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 一次目标租户配置预览、应用或回滚的公开视图。 */
            data?: {
                applied_authorization_epoch?: string | null;
                /** Format: int64 */
                applied_configuration_version?: number | null;
                bundle_summary: components["schemas"]["TenantConfigBundleSummaryVo"];
                change_counts: {
                    [key: string]: number;
                };
                /** Format: date-time */
                created_at: string;
                error_summary?: string | null;
                id: string;
                plan_hash?: string | null;
                /** Format: date-time */
                preview_calculated_at?: string | null;
                /** Format: date-time */
                rollback_expires_at?: string | null;
                status: string;
                target_authorization_epoch: string;
                /** Format: int64 */
                target_configuration_version: number;
                /** Format: date-time */
                updated_at: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_UserDetailVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 用户详情响应。 */
            data?: components["schemas"]["UserVo"] & {
                department?: null | components["schemas"]["DeptVo"];
                roles: components["schemas"]["RoleBriefVo"][];
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_UserImportJobVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                cancel_requested: boolean;
                /** Format: date-time */
                completed_at?: string | null;
                /** Format: date-time */
                created_at: string;
                duplicate_policy: string;
                /** Format: int32 */
                failure_count: number;
                id: string;
                last_error?: string | null;
                /** Format: int32 */
                processed_rows: number;
                report_available: boolean;
                requester_username?: string | null;
                /** Format: int32 */
                skipped_count: number;
                source_name: string;
                /** Format: date-time */
                started_at?: string | null;
                status: string;
                /** Format: int32 */
                success_count: number;
                /** Format: int32 */
                total_rows: number;
                /** Format: date-time */
                updated_at: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_UserVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 用户响应。 */
            data?: {
                avatar?: string | null;
                /** Format: date-time */
                created_at: string;
                dept_id?: string | null;
                dept_name?: string | null;
                email: string;
                id: string;
                nickname: string;
                phone: string;
                remark?: string | null;
                status: string;
                username: string;
            };
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_Vec_DeptTreeNode: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                children: components["schemas"]["DeptTreeNode"][];
                id: string;
                name: string;
                parent_id?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
            }[];
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_Vec_DictDataVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                css_class?: string | null;
                id: string;
                label: string;
                /** Format: int32 */
                sort: number;
                status: string;
                type_code: string;
                value: string;
            }[];
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_Vec_DictOptionDto: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                css_class?: string | null;
                label: string;
                value: string;
            }[];
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_Vec_MenuTreeNode: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                children: components["schemas"]["MenuTreeNode"][];
                icon?: string | null;
                id: string;
                menu_type: components["schemas"]["MenuType"];
                name: string;
                parent_id?: string | null;
                perm_code?: string | null;
                perm_id?: string | null;
                route_key?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
                visible: boolean;
            }[];
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_Vec_PermissionTreeNode: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                children: components["schemas"]["PermissionTreeNode"][];
                code: string;
                icon?: string | null;
                id: string;
                name: string;
                parent_id?: string | null;
                perm_type: components["schemas"]["PermissionType"];
                /** Format: int32 */
                sort: number;
                status: string;
            }[];
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_Vec_ServiceCredentialVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                account_id: string;
                /** Format: date-time */
                created_at: string;
                /** Format: date-time */
                expires_at: string;
                id: string;
                key_id: string;
                label: string;
                /** Format: date-time */
                last_used_at?: string | null;
                /** Format: date-time */
                revoked_at?: string | null;
                status: string;
            }[];
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_Vec_String: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: string[];
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_u64: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** Format: int64 */
            data?: number;
            /** @description 可安全公开的结构化错误参数；无参数时为 `null`。 */
            details?: unknown;
            /** @description 面向程序处理的稳定错误键；成功时为 `null`。 */
            error_key?: string | null;
            /** @description 面向用户的可读消息。 */
            message: string;
            /** @description 与 `X-Request-Id` 响应头一致的 UUID v7。 */
            request_id: string;
        };
        /** @description 应用已经预览并由用户确认的配置迁移计划。 */
        ApplyTenantConfigTransferDto: {
            plan_hash: string;
            target_authorization_epoch: string;
            /** Format: int64 */
            target_configuration_version: number;
        };
        AuthorizationDiagnosticDataScopeSourceVo: {
            role_code: string;
            scope: string;
        };
        AuthorizationDiagnosticDataScopeVo: {
            custom_departments: components["schemas"]["AuthorizationDiagnosticDepartmentVo"][];
            department_path: components["schemas"]["AuthorizationDiagnosticDepartmentVo"][];
            include_self: boolean;
            scope: string;
            sources: components["schemas"]["AuthorizationDiagnosticDataScopeSourceVo"][];
        };
        AuthorizationDiagnosticDepartmentVo: {
            id: string;
            name: string;
        };
        AuthorizationDiagnosticMenuVo: {
            accessible: boolean;
            configured_visible: boolean;
            id: string;
            inaccessible_reason?: string | null;
            name: string;
            parent_id?: string | null;
            permission_code?: string | null;
            route_key?: string | null;
            status: string;
            visible_in_navigation: boolean;
        };
        AuthorizationDiagnosticPermissionVo: {
            code: string;
            effective: boolean;
            id: string;
            name: string;
            source_roles: string[];
        };
        AuthorizationDiagnosticRefreshVo: {
            response_header_epoch_fallback_available: boolean;
            websocket_notification_available: boolean;
            websocket_online_state_asserted: boolean;
        };
        AuthorizationDiagnosticRoleVo: {
            code: string;
            data_scope: string;
            id: string;
            is_super: boolean;
            name: string;
            participates: boolean;
            status: string;
        };
        AuthorizationDiagnosticTenantVo: {
            available: boolean;
            /** Format: date-time */
            expire_at?: string | null;
            name: string;
            status: string;
            tenant_id: string;
        };
        AuthorizationDiagnosticUserVo: {
            dept_id?: string | null;
            dept_name?: string | null;
            enabled: boolean;
            final_access_enabled: boolean;
            id: string;
            nickname: string;
            status: string;
            username: string;
        };
        AuthorizationDiagnosticVersionVo: {
            cache_status: string;
            cached_tenant_authorization_epoch?: string | null;
            /** Format: int32 */
            cached_user_authorization_version?: number | null;
            tenant_authorization_epoch: string;
            /** Format: int32 */
            user_authorization_version: number;
        };
        /** @description 参数配置导出的筛选条件。 */
        ConfigExportFilterDto: {
            key?: string | null;
            name?: string | null;
        };
        ConfigExportRequestDto: {
            confirm_all: boolean;
            filter: components["schemas"]["ConfigExportFilterDto"];
        };
        CreateConfigDto: {
            key: string;
            name: string;
            portable?: boolean;
            remark?: string | null;
            value: string;
        };
        CreateDeptDto: {
            name: string;
            /** @description 父部门 Snowflake ID，统一使用字符串传输。 */
            parent_id?: string | null;
            /** Format: int32 */
            sort?: number | null;
        };
        CreateDictDataDto: {
            label: string;
            /** Format: int32 */
            sort?: number | null;
            type_code: string;
            value: string;
        };
        CreateDictTypeDto: {
            code: string;
            name: string;
        };
        CreateMenuDto: {
            icon?: string | null;
            /** @description 菜单类型：M 为目录，C 为页面，F 为操作。 */
            menu_type: components["schemas"]["MenuType"];
            name: string;
            /** @description 父菜单 Snowflake ID，以字符串传输。 */
            parent_id?: string | null;
            /** @description 权限 ID。按钮必须设置，目录和页面也可以绑定。 */
            perm_id?: string | null;
            /** @description 前端页面注册表使用的稳定键。 */
            route_key?: string | null;
            /** Format: int32 */
            sort?: number | null;
            visible?: boolean | null;
        };
        CreateNoticeDto: {
            /** @description 公告 Markdown 原文，长度为 1 到 60,000 个 UTF-8 字节。 */
            content_markdown: string;
            notice_type?: string | null;
            title: string;
        };
        CreatePermissionDto: {
            code: string;
            icon?: string | null;
            name: string;
            parent_id?: string | null;
            perm_type: components["schemas"]["PermissionType"];
            /** Format: int32 */
            sort?: number | null;
            status?: string | null;
        };
        CreatePostDto: {
            code: string;
            name: string;
            /** Format: int32 */
            sort?: number | null;
        };
        CreateRoleDto: {
            code: string;
            /** @description 数据范围: "1"全部 "2"自定义 "3"本部门 "4"本部门及以下 "5"仅本人 */
            data_scope?: string | null;
            name: string;
            /** Format: int32 */
            sort?: number | null;
        };
        CreateServiceAccountDto: {
            code: string;
            dept_id?: string | null;
            description?: string | null;
            /** Format: int32 */
            max_requests_per_minute?: number | null;
            name: string;
        };
        CreateServiceCredentialDto: {
            /** Format: date-time */
            expires_at: string;
            label: string;
        };
        /** @description 从当前租户已有配置包创建一次迁移。 */
        CreateTenantConfigTransferDto: {
            bundle_id: string;
        };
        CreateUserDto: {
            /** @description Snowflake ID 统一使用字符串传输，避免 JavaScript 精度丢失。 */
            dept_id?: string | null;
            email?: string | null;
            nickname: string;
            phone?: string | null;
            role_ids?: string[];
            username: string;
        };
        /** @description 批量删除消息请求。 */
        DeleteMessagesDto: {
            ids: string[];
        };
        /** @description 部门树节点。 */
        DeptTreeNode: {
            children: components["schemas"]["DeptTreeNode"][];
            id: string;
            name: string;
            parent_id?: string | null;
            /** Format: int32 */
            sort: number;
            status: string;
        };
        /** @description 部门响应。 */
        DeptVo: {
            ancestors: string;
            /** Format: date-time */
            created_at: string;
            id: string;
            name: string;
            parent_id?: string | null;
            remark?: string | null;
            /** Format: int32 */
            sort: number;
            status: string;
        };
        /** @description 字典类型导出的筛选条件。 */
        DictTypeExportFilterDto: {
            code?: string | null;
            name?: string | null;
            status?: string | null;
        };
        DictTypeExportRequestDto: {
            confirm_all: boolean;
            filter: components["schemas"]["DictTypeExportFilterDto"];
        };
        /** @description 不携带业务字段的写操作请求体。 */
        EmptyRequestDto: Record<string, never>;
        /** @description 登录日志导出的筛选条件。 */
        LoginLogExportFilterDto: {
            begin_time?: string | null;
            end_time?: string | null;
            status?: string | null;
            user_name?: string | null;
        };
        LoginLogExportRequestDto: {
            confirm_all: boolean;
            filter: components["schemas"]["LoginLogExportFilterDto"];
        };
        /** @description 菜单树节点。 */
        MenuTreeNode: {
            children: components["schemas"]["MenuTreeNode"][];
            icon?: string | null;
            id: string;
            menu_type: components["schemas"]["MenuType"];
            name: string;
            parent_id?: string | null;
            perm_code?: string | null;
            perm_id?: string | null;
            route_key?: string | null;
            /** Format: int32 */
            sort: number;
            status: string;
            visible: boolean;
        };
        /**
         * @description 菜单类型。
         * @enum {string}
         */
        MenuType: "M" | "C" | "F";
        /** @description 发布消息时的受众选择器。 */
        MessageAudienceDto: {
            /** @description tenant、role 或 user。 */
            kind: string;
            /** @description tenant 受众必须省略或传入 "0"；角色和用户 ID 以字符串避免精度丢失。 */
            target_id?: string | null;
        };
        /** @description 面向 REST 与 WebSocket 客户端的已渲染消息。 */
        MessageVo: {
            /** Format: date-time */
            acked_at?: string | null;
            content: string;
            /** Format: date-time */
            expires_at?: string | null;
            id: string;
            payload?: unknown;
            /** Format: date-time */
            published_at: string;
            /** Format: date-time */
            read_at?: string | null;
            severity: string;
            title: string;
            topic: string;
        };
        /** @description 操作日志导出的筛选条件。 */
        OperLogExportFilterDto: {
            begin_time?: string | null;
            end_time?: string | null;
            oper_name?: string | null;
            status?: string | null;
        };
        OperLogExportRequestDto: {
            confirm_all: boolean;
            filter: components["schemas"]["OperLogExportFilterDto"];
        };
        /** @description 选择器候选项。 */
        OptionItem: {
            description?: string | null;
            disabled: boolean;
            label: string;
            value: string;
        };
        /** @description 分页接口的业务数据。 */
        PageData_ConfigVo: {
            items: {
                /** Format: date-time */
                created_at: string;
                id: string;
                key: string;
                name: string;
                portable: boolean;
                remark?: string | null;
                value: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_DeptVo: {
            items: {
                ancestors: string;
                /** Format: date-time */
                created_at: string;
                id: string;
                name: string;
                parent_id?: string | null;
                remark?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_DictTypeVo: {
            items: {
                code: string;
                /** Format: date-time */
                created_at: string;
                id: string;
                name: string;
                remark?: string | null;
                status: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_LoginInfoVo: {
            items: {
                browser?: string | null;
                id: string;
                ipaddr: string;
                login_location?: string | null;
                login_time: string;
                msg?: string | null;
                os?: string | null;
                status: string;
                user_name: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_MenuVo: {
            items: {
                /** Format: date-time */
                created_at: string;
                icon?: string | null;
                id: string;
                menu_type: components["schemas"]["MenuType"];
                name: string;
                parent_id?: string | null;
                perm_id?: string | null;
                remark?: string | null;
                route_key?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
                visible: boolean;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_NoticeVo: {
            items: {
                content_markdown: string;
                /** Format: date-time */
                created_at: string;
                created_by?: string | null;
                id: string;
                notice_type?: string | null;
                status: string;
                title: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_OnlineUserVo: {
            items: {
                browser?: string | null;
                dept_name?: string | null;
                ipaddr: string;
                last_access_time: string;
                login_location?: string | null;
                login_time: string;
                os?: string | null;
                sid: string;
                username: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_OperLogVo: {
            items: {
                business_type: string;
                /** Format: int64 */
                cost_time: number;
                error_msg?: string | null;
                id: string;
                json_result?: string | null;
                method: string;
                oper_ip: string;
                oper_location?: string | null;
                oper_name: string;
                oper_param?: string | null;
                oper_time: string;
                oper_url: string;
                request_method: string;
                status: string;
                title: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_PostVo: {
            items: {
                code: string;
                /** Format: date-time */
                created_at: string;
                id: string;
                name: string;
                remark?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_RoleVo: {
            items: {
                code: string;
                /** Format: date-time */
                created_at: string;
                data_scope: string;
                dept_ids?: string[] | null;
                id: string;
                /** Format: int32 */
                is_super: number;
                name: string;
                remark?: string | null;
                /** Format: int32 */
                sort: number;
                status: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_ServiceAccessAuditVo: {
            items: {
                access_mode: string;
                /** Format: int32 */
                account_authorization_version?: number | null;
                account_id?: string | null;
                capability_key: string;
                /** Format: date-time */
                completed_at: string;
                credential_id?: string | null;
                delegation_id?: string | null;
                /** Format: int32 */
                delegation_version?: number | null;
                /** Format: int32 */
                http_status: number;
                id: string;
                operation_id: string;
                reason_code: string;
                represented_user_id?: string | null;
                request_id: string;
                required_permission: string;
                /** Format: int64 */
                response_bytes?: number | null;
                result: string;
                /** Format: int32 */
                row_count?: number | null;
                /** Format: date-time */
                started_at: string;
                tenant_epoch?: string | null;
                tenant_id?: string | null;
                /** Format: int32 */
                user_authorization_version?: number | null;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_ServiceAccountVo: {
            items: {
                /** Format: int32 */
                authorization_version: number;
                code: string;
                /** Format: date-time */
                created_at: string;
                dept_id?: string | null;
                description?: string | null;
                id: string;
                /** Format: int32 */
                max_requests_per_minute: number;
                name: string;
                status: string;
                /** Format: date-time */
                updated_at: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_ServiceDelegationVo: {
            items: {
                account_id: string;
                capability_keys: string[];
                /** Format: date-time */
                created_at: string;
                /** Format: date-time */
                expires_at: string;
                id: string;
                /** Format: date-time */
                not_before: string;
                reason: string;
                /** Format: date-time */
                revoked_at?: string | null;
                status: string;
                user_id: string;
                /** Format: int32 */
                version: number;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_TenantConfigBundleVo: {
            items: {
                /** Format: date-time */
                created_at: string;
                error_summary?: string | null;
                /** Format: date-time */
                expires_at?: string | null;
                id: string;
                /** Format: int32 */
                item_count: number;
                origin: string;
                package_schema_version: string;
                resource_counts: {
                    [key: string]: number;
                };
                sha256?: string | null;
                source_app_version: string;
                source_tenant_key: string;
                source_tenant_name: string;
                status: string;
                /** Format: date-time */
                updated_at: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_TenantConfigTransferItemVo: {
            items: {
                action: string;
                detail?: string | null;
                detail_code?: string | null;
                display_name: string;
                outcome: string;
                resource_type: string;
                stable_key: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_TenantConfigTransferVo: {
            items: {
                applied_authorization_epoch?: string | null;
                /** Format: int64 */
                applied_configuration_version?: number | null;
                bundle_summary: components["schemas"]["TenantConfigBundleSummaryVo"];
                change_counts: {
                    [key: string]: number;
                };
                /** Format: date-time */
                created_at: string;
                error_summary?: string | null;
                id: string;
                plan_hash?: string | null;
                /** Format: date-time */
                preview_calculated_at?: string | null;
                /** Format: date-time */
                rollback_expires_at?: string | null;
                status: string;
                target_authorization_epoch: string;
                /** Format: int64 */
                target_configuration_version: number;
                /** Format: date-time */
                updated_at: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_UserImportJobVo: {
            items: {
                cancel_requested: boolean;
                /** Format: date-time */
                completed_at?: string | null;
                /** Format: date-time */
                created_at: string;
                duplicate_policy: string;
                /** Format: int32 */
                failure_count: number;
                id: string;
                last_error?: string | null;
                /** Format: int32 */
                processed_rows: number;
                report_available: boolean;
                requester_username?: string | null;
                /** Format: int32 */
                skipped_count: number;
                source_name: string;
                /** Format: date-time */
                started_at?: string | null;
                status: string;
                /** Format: int32 */
                success_count: number;
                /** Format: int32 */
                total_rows: number;
                /** Format: date-time */
                updated_at: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_UserImportRowVo: {
            items: {
                code: string;
                /** Format: date-time */
                created_at: string;
                message: string;
                outcome: string;
                /** Format: int32 */
                row_number: number;
                username: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @description 分页接口的业务数据。 */
        PageData_UserVo: {
            items: {
                avatar?: string | null;
                /** Format: date-time */
                created_at: string;
                dept_id?: string | null;
                dept_name?: string | null;
                email: string;
                id: string;
                nickname: string;
                phone: string;
                remark?: string | null;
                status: string;
                username: string;
            }[];
            /** Format: int64 */
            max_page_size: number;
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            total_pages: number;
        };
        PasswordResetRequestDto: {
            reason: string;
        };
        /** @description 权限树节点。 */
        PermissionTreeNode: {
            children: components["schemas"]["PermissionTreeNode"][];
            code: string;
            icon?: string | null;
            id: string;
            name: string;
            parent_id?: string | null;
            perm_type: components["schemas"]["PermissionType"];
            /** Format: int32 */
            sort: number;
            status: string;
        };
        /**
         * @description 权限类型。
         * @enum {string}
         */
        PermissionType: "api" | "menu";
        /** @description 岗位导出的筛选条件。 */
        PostExportFilterDto: {
            code?: string | null;
            name?: string | null;
            status?: string | null;
        };
        PostExportRequestDto: {
            confirm_all: boolean;
            filter: components["schemas"]["PostExportFilterDto"];
        };
        /** @description 创建消息请求。 */
        PublishMessageDto: {
            args?: {
                [key: string]: string;
            };
            audiences: components["schemas"]["MessageAudienceDto"][];
            body_key?: string | null;
            content?: string | null;
            /**
             * Format: date-time
             * @description 可选的提前过期时间，最长仍受服务端 90 天上限约束。
             */
            expires_at?: string | null;
            payload?: unknown;
            severity: string;
            source_id?: string | null;
            source_type?: string | null;
            /** @description 省略时投递给当前租户；指定其他租户时需要平台级发布权限。 */
            tenant_id?: string | null;
            title?: string | null;
            title_key?: string | null;
            topic: string;
        };
        ReplaceRoleDataScopeDto: {
            data_scope: string;
            dept_ids?: string[];
        };
        ReplaceRolePermissionsDto: {
            perm_ids?: string[];
        };
        ReplaceServiceAccountRolesDto: {
            role_ids: string[];
        };
        ReplaceUserRolesDto: {
            role_ids?: string[];
        };
        /** @description 用户关联的简要角色信息。 */
        RoleBriefVo: {
            code: string;
            id: string;
            /** Format: int32 */
            is_super: number;
            name: string;
        };
        /** @description 角色导出的筛选条件。 */
        RoleExportFilterDto: {
            code?: string | null;
            name?: string | null;
            status?: string | null;
        };
        RoleExportRequestDto: {
            confirm_all: boolean;
            filter: components["schemas"]["RoleExportFilterDto"];
        };
        /**
         * @description 角色选项的使用场景。
         * @enum {string}
         */
        RoleOptionPurposeDto: "user_assignment" | "service_account_assignment";
        /** @enum {string} */
        ServiceAccountStatusDto: "enabled" | "disabled";
        ServiceAccountVo: {
            /** Format: int32 */
            authorization_version: number;
            code: string;
            /** Format: date-time */
            created_at: string;
            dept_id?: string | null;
            description?: string | null;
            id: string;
            /** Format: int32 */
            max_requests_per_minute: number;
            name: string;
            status: string;
            /** Format: date-time */
            updated_at: string;
        };
        ServiceCredentialVo: {
            account_id: string;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            expires_at: string;
            id: string;
            key_id: string;
            label: string;
            /** Format: date-time */
            last_used_at?: string | null;
            /** Format: date-time */
            revoked_at?: string | null;
            status: string;
        };
        /** @description 配置迁移中关联配置包的安全摘要，不包含数据库内部标识。 */
        TenantConfigBundleSummaryVo: {
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            expires_at?: string | null;
            /** Format: int32 */
            item_count: number;
            origin: string;
            package_schema_version: string;
            resource_counts: {
                [key: string]: number;
            };
            sha256?: string | null;
            source_app_version: string;
            source_tenant_key: string;
            source_tenant_name: string;
            status: string;
        };
        /** @description OpenAPI 中的严格单文件配置包上传表单。 */
        TenantConfigPackageUploadForm: {
            /** Format: binary */
            file: string;
        };
        UpdateConfigDto: {
            portable?: boolean | null;
            value: string;
        };
        UpdateDeptDto: {
            name: string;
            /** @description 父部门 Snowflake ID，统一使用字符串传输。 */
            parent_id?: string | null;
            /** Format: int32 */
            sort?: number | null;
            status: string;
        };
        UpdateDictDataDto: {
            label: string;
            /** Format: int32 */
            sort?: number | null;
            status: string;
            value: string;
        };
        UpdateDictTypeDto: {
            name: string;
            status: string;
        };
        UpdateMenuDto: {
            icon?: string | null;
            /** @description 菜单类型：M 为目录，C 为页面，F 为操作。 */
            menu_type: components["schemas"]["MenuType"];
            name: string;
            /** @description 父菜单 Snowflake ID，以字符串传输。 */
            parent_id?: string | null;
            perm_id?: string | null;
            route_key?: string | null;
            /** Format: int32 */
            sort?: number | null;
            status: string;
            visible?: boolean | null;
        };
        UpdateNoticeDto: {
            /** @description 公告 Markdown 原文，长度为 1 到 60,000 个 UTF-8 字节。 */
            content_markdown: string;
            notice_type?: string | null;
            status: string;
            title: string;
        };
        UpdatePermissionDto: {
            code: string;
            icon?: string | null;
            name: string;
            parent_id?: string | null;
            perm_type: components["schemas"]["PermissionType"];
            /** Format: int32 */
            sort?: number | null;
            status?: string | null;
        };
        UpdatePostDto: {
            name: string;
            /** Format: int32 */
            sort?: number | null;
            status: string;
        };
        UpdateRoleDto: {
            name: string;
            /** Format: int32 */
            sort?: number | null;
            status: string;
        };
        UpdateServiceAccountDto: {
            dept_id?: string | null;
            description?: string | null;
            /** Format: int32 */
            max_requests_per_minute: number;
            name: string;
        };
        UpdateServiceAccountStatusDto: {
            status: components["schemas"]["ServiceAccountStatusDto"];
        };
        UpdateUserDto: {
            /** @description Snowflake ID 统一使用字符串传输，避免 JavaScript 精度丢失。 */
            dept_id?: string | null;
            email?: string | null;
            nickname: string;
            phone?: string | null;
        };
        UpdateUserStatusDto: {
            status: string;
        };
        /** @description 用户导出的筛选条件。 */
        UserExportFilterDto: {
            /** @description Snowflake ID 使用字符串传输，避免 JavaScript 精度丢失。 */
            dept_id?: string | null;
            phone?: string | null;
            status?: string | null;
            username?: string | null;
        };
        UserExportRequestDto: {
            confirm_all: boolean;
            filter: components["schemas"]["UserExportFilterDto"];
        };
        /** @description OpenAPI 中的严格单文件上传表单。 */
        UserImportUploadForm: {
            /** Format: binary */
            file: string;
        };
        /** @description 用户响应。 */
        UserVo: {
            avatar?: string | null;
            /** Format: date-time */
            created_at: string;
            dept_id?: string | null;
            dept_name?: string | null;
            email: string;
            id: string;
            nickname: string;
            phone: string;
            remark?: string | null;
            status: string;
            username: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    get_system_authorization_diagnostics_users_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 目标用户ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 主库授权诊断结果 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_AuthorizationDiagnosticVo"];
                };
            };
        };
    };
    get_system_config_packages: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置包列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_TenantConfigBundleVo"];
                };
            };
            /** @description 分页参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置包列表权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_system_config_packages: {
        parameters: {
            query?: never;
            header: {
                /** @description 配置包导出幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置包导出任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantConfigBundleVo"];
                };
            };
            /** @description 幂等键格式无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置包导出权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 同一幂等键对应不同请求 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 数据库、对象存储或后台任务服务不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_config_packages_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 配置包 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置包详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantConfigBundleVo"];
                };
            };
            /** @description 配置包 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置包列表权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置包不存在或不属于当前租户 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_config_packages_by_id_download: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 配置包 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置包文件 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/zip": number[];
                };
            };
            /** @description 配置包 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置包下载权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置包或文件不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置包尚未生成或文件已经过期 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 对象存储不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_config_transfers: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置迁移列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_TenantConfigTransferVo"];
                };
            };
            /** @description 分页参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置迁移列表权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_system_config_transfers_from_package: {
        parameters: {
            query?: never;
            header: {
                /** @description 配置迁移创建幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTenantConfigTransferDto"];
            };
        };
        responses: {
            /** @description 配置迁移已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantConfigTransferVo"];
                };
            };
            /** @description 配置包 ID 或幂等键无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置迁移创建权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置包不存在或不属于当前租户 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置包状态或幂等结果冲突 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 数据库或后台任务服务不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_system_config_transfers_upload: {
        parameters: {
            query?: never;
            header: {
                /** @description 配置包上传幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["TenantConfigPackageUploadForm"];
            };
        };
        responses: {
            /** @description 配置迁移已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantConfigTransferVo"];
                };
            };
            /** @description 上传表单、幂等键或配置包无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置迁移创建权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 幂等冲突或当前配置状态冲突 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置包压缩或解压大小超过限制 */
            413: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 数据库、对象存储或后台任务服务不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_config_transfers_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 配置迁移 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置迁移详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantConfigTransferVo"];
                };
            };
            /** @description 配置迁移 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置迁移列表权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置迁移不存在或不属于当前租户 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_system_config_transfers_by_id_apply: {
        parameters: {
            query?: never;
            header: {
                /** @description 配置应用幂等键 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 配置迁移 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApplyTenantConfigTransferDto"];
            };
        };
        responses: {
            /** @description 配置应用任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantConfigTransferVo"];
                };
            };
            /** @description 请求参数、计划哈希或幂等键无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置迁移应用权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置迁移不存在或不属于当前租户 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 预览、目标版本、租约或迁移状态冲突 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 数据库、对象存储或后台任务服务不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_config_transfers_by_id_items: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
            };
            header?: never;
            path: {
                /** @description 配置迁移 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置迁移明细 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_TenantConfigTransferItemVo"];
                };
            };
            /** @description 配置迁移 ID 或分页参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置迁移列表权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置迁移不存在或不属于当前租户 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_system_config_transfers_by_id_preview: {
        parameters: {
            query?: never;
            header: {
                /** @description 配置预览幂等键 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 配置迁移 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyRequestDto"];
            };
        };
        responses: {
            /** @description 配置预览任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantConfigTransferVo"];
                };
            };
            /** @description 配置迁移 ID 或幂等键无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置迁移预览权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置迁移不存在或不属于当前租户 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 预览任务、配置版本或迁移状态冲突 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 数据库或后台任务服务不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_system_config_transfers_by_id_rollback: {
        parameters: {
            query?: never;
            header: {
                /** @description 配置回滚幂等键 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 配置迁移 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyRequestDto"];
            };
        };
        responses: {
            /** @description 配置回滚任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantConfigTransferVo"];
                };
            };
            /** @description 配置迁移 ID 或幂等键无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有配置迁移回滚权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 配置迁移或回滚快照不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 回滚窗口、引用、版本、租约或迁移状态冲突 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 数据库、对象存储或后台任务服务不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_configs: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                name?: string;
                key?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_ConfigVo"];
                };
            };
        };
    };
    post_system_configs: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateConfigDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ConfigVo"];
                };
            };
        };
    };
    delete_system_configs_cache: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 缓存刷新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    post_system_configs_exports: {
        parameters: {
            query?: never;
            header: {
                /** @description 幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfigExportRequestDto"];
            };
        };
        responses: {
            /** @description 参数配置导出任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    get_system_configs_key_by_key: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 参数值 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_String"];
                };
            };
        };
    };
    get_system_configs_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 配置详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ConfigVo"];
                };
            };
        };
    };
    put_system_configs_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateConfigDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ConfigVo"];
                };
            };
        };
    };
    delete_system_configs_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_depts: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                name?: string;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 部门列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_DeptVo"];
                };
            };
        };
    };
    post_system_depts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDeptDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_DeptVo"];
                };
            };
        };
    };
    get_system_depts_tree: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 部门树 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_DeptTreeNode"];
                };
            };
        };
    };
    get_system_depts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 部门详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_DeptVo"];
                };
            };
        };
    };
    put_system_depts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDeptDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_DeptVo"];
                };
            };
        };
    };
    delete_system_depts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_dict_data: {
        parameters: {
            query: {
                type_code: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 字典数据列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_DictDataVo"];
                };
            };
        };
    };
    post_system_dict_data: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDictDataDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_DictDataVo"];
                };
            };
        };
    };
    get_system_dict_data_type_by_dict_type: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                dict_type: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 字典数据 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_DictOptionDto"];
                };
            };
        };
    };
    put_system_dict_data_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDictDataDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_DictDataVo"];
                };
            };
        };
    };
    delete_system_dict_data_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_dict_types: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                name?: string;
                code?: string;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 字典类型列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_DictTypeVo"];
                };
            };
        };
    };
    post_system_dict_types: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDictTypeDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_DictTypeVo"];
                };
            };
        };
    };
    post_system_dict_types_exports: {
        parameters: {
            query?: never;
            header: {
                /** @description 幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DictTypeExportRequestDto"];
            };
        };
        responses: {
            /** @description 字典类型导出任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    put_system_dict_types_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDictTypeDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_DictTypeVo"];
                };
            };
        };
    };
    delete_system_dict_types_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_loginlogs: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                user_name?: string;
                status?: string;
                begin_time?: string;
                end_time?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 日志列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_LoginInfoVo"];
                };
            };
        };
    };
    post_system_loginlogs_exports: {
        parameters: {
            query?: never;
            header: {
                /** @description 幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginLogExportRequestDto"];
            };
        };
        responses: {
            /** @description 登录日志导出任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    get_system_menus: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                name?: string;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 菜单列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_MenuVo"];
                };
            };
        };
    };
    post_system_menus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateMenuDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_MenuVo"];
                };
            };
        };
    };
    get_system_menus_tree: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 菜单树 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_MenuTreeNode"];
                };
            };
        };
    };
    get_system_menus_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 菜单详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_MenuVo"];
                };
            };
        };
    };
    put_system_menus_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateMenuDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_MenuVo"];
                };
            };
        };
    };
    delete_system_menus_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_messages: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number | null;
                unread_only?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 消息收件箱 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_MessageInboxPage"];
                };
            };
        };
    };
    post_system_messages: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublishMessageDto"];
            };
        };
        responses: {
            /** @description 发布结果 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PublishedMessageVo"];
                };
            };
        };
    };
    post_system_messages_ack: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AcknowledgeMessagesDto"];
            };
        };
        responses: {
            /** @description 确认数量 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_u64"];
                };
            };
        };
    };
    post_system_messages_delete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeleteMessagesDto"];
            };
        };
        responses: {
            /** @description 实际删除数量 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_u64"];
                };
            };
        };
    };
    put_system_messages_read_all: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 已读数量 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_u64"];
                };
            };
        };
    };
    get_system_messages_unread_count: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 未读数量 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_u64"];
                };
            };
        };
    };
    put_system_messages_by_id_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 已读 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_notices: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                title?: string;
                notice_type?: string;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 公告列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_NoticeVo"];
                };
            };
        };
    };
    post_system_notices: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateNoticeDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_NoticeVo"];
                };
            };
        };
    };
    get_system_notices_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 通知详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_NoticeVo"];
                };
            };
        };
    };
    put_system_notices_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateNoticeDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_NoticeVo"];
                };
            };
        };
    };
    delete_system_notices_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    post_system_notices_by_id_publish_message: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 消息中心发布结果 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PublishedMessageVo"];
                };
            };
        };
    };
    get_system_online: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                username?: string;
                ipaddr?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 在线用户列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_OnlineUserVo"];
                };
            };
        };
    };
    delete_system_online_by_sid: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 稳定的设备会话标识 */
                sid: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 强退成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description 会话不存在或不属于当前租户 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Redis 会话服务不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_operlogs: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                oper_name?: string;
                status?: string;
                begin_time?: string;
                end_time?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 日志列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_OperLogVo"];
                };
            };
        };
    };
    post_system_operlogs_exports: {
        parameters: {
            query?: never;
            header: {
                /** @description 幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OperLogExportRequestDto"];
            };
        };
        responses: {
            /** @description 操作日志导出任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    post_system_perms: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePermissionDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PermissionVo"];
                };
            };
        };
    };
    post_system_perms_sync: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 同步成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PermissionSyncReport"];
                };
            };
        };
    };
    get_system_perms_tree: {
        parameters: {
            query?: {
                perm_type?: components["schemas"]["PermissionType"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 权限树 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_PermissionTreeNode"];
                };
            };
        };
    };
    get_system_perms_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 权限详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PermissionVo"];
                };
            };
        };
    };
    put_system_perms_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdatePermissionDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PermissionVo"];
                };
            };
        };
    };
    delete_system_perms_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_posts: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
                name?: string;
                code?: string;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_PostVo"];
                };
            };
        };
    };
    post_system_posts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePostDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PostVo"];
                };
            };
        };
    };
    post_system_posts_exports: {
        parameters: {
            query?: never;
            header: {
                /** @description 幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PostExportRequestDto"];
            };
        };
        responses: {
            /** @description 岗位导出任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    get_system_posts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PostVo"];
                };
            };
        };
    };
    put_system_posts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdatePostDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PostVo"];
                };
            };
        };
    };
    delete_system_posts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_roles: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                name?: string;
                code?: string;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 角色列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_RoleVo"];
                };
            };
        };
    };
    post_system_roles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRoleDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_RoleVo"];
                };
            };
        };
    };
    delete_system_roles_batch_by_ids: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ids: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 批量删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    post_system_roles_exports: {
        parameters: {
            query?: never;
            header: {
                /** @description 幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RoleExportRequestDto"];
            };
        };
        responses: {
            /** @description 角色导出任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    get_system_roles_options: {
        parameters: {
            query: {
                /** @description 角色选项的使用场景。 */
                purpose: components["schemas"]["RoleOptionPurposeDto"];
                /** @description 按名称或稳定编码做前缀搜索；首尾空白会被移除。 */
                q?: string;
                /** @description 返回上限；省略时使用服务端默认分页大小。 */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 角色选项 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_OptionList"];
                };
            };
        };
    };
    get_system_roles_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 角色详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_RoleVo"];
                };
            };
        };
    };
    put_system_roles_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRoleDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_RoleVo"];
                };
            };
        };
    };
    delete_system_roles_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    put_system_roles_by_id_data_scope: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReplaceRoleDataScopeDto"];
            };
        };
        responses: {
            /** @description 数据权限更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_roles_by_id_permissions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 角色权限ID列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_String"];
                };
            };
        };
    };
    put_system_roles_by_id_permissions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReplaceRolePermissionsDto"];
            };
        };
        responses: {
            /** @description 权限分配成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    get_system_service_access_audits: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Agent 访问审计列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_ServiceAccessAuditVo"];
                };
            };
            /** @description 分页参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务访问审计权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_service_accounts: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 服务账号分页列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_ServiceAccountVo"];
                };
            };
            /** @description 分页参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号查看权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_system_service_accounts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateServiceAccountDto"];
            };
        };
        responses: {
            /** @description 服务账号已创建 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ServiceAccountVo"];
                };
            };
            /** @description 请求参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号创建权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 账号代码冲突 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_service_accounts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 服务账号详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ServiceAccountDetailVo"];
                };
            };
            /** @description 账号 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号查看权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    put_system_service_accounts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateServiceAccountDto"];
            };
        };
        responses: {
            /** @description 服务账号已更新 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ServiceAccountVo"];
                };
            };
            /** @description 请求参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号编辑权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    delete_system_service_accounts_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 服务账号已删除 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description 账号 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号删除权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_service_accounts_by_id_credentials: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description API Key 元数据列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_ServiceCredentialVo"];
                };
            };
            /** @description 账号 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号查看权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_system_service_accounts_by_id_credentials: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateServiceCredentialDto"];
            };
        };
        responses: {
            /** @description API Key 已创建；Secret 只显示一次 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_CreatedServiceCredentialVo"];
                };
            };
            /** @description 请求参数或幂等键无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有 API Key 轮换权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 有效 Key 已达上限或幂等冲突 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能、Pepper 或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    delete_system_service_accounts_by_id_credentials_by_credential_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                credential_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description API Key 已撤销 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有 API Key 撤销权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号或 API Key 不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description API Key 已撤销 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_service_accounts_by_id_roles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 服务账号角色 ID */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_String"];
                };
            };
            /** @description 账号 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号角色权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    put_system_service_accounts_by_id_roles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReplaceServiceAccountRolesDto"];
            };
        };
        responses: {
            /** @description 服务账号角色已替换 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description 账号或角色 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号角色权限，或选择了超级角色 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号或角色不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    put_system_service_accounts_by_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateServiceAccountStatusDto"];
            };
        };
        responses: {
            /** @description 服务账号状态已更新 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description 请求参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有服务账号编辑权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_service_delegations: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前租户委托列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_ServiceDelegationVo"];
                };
            };
            /** @description 分页参数无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有委托查看权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    delete_system_service_delegations_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 委托已撤销 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description 委托 ID 无效 */
            400: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 未认证 */
            401: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 没有委托撤销权限 */
            403: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 委托不存在 */
            404: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 委托已撤销 */
            409: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 服务账号功能未启用或数据库不可用 */
            503: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_system_user_imports: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户导入任务列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_UserImportJobVo"];
                };
            };
        };
    };
    post_system_user_imports: {
        parameters: {
            query?: never;
            header: {
                /** @description 用户导入幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["UserImportUploadForm"];
            };
        };
        responses: {
            /** @description 用户导入任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserImportJobVo"];
                };
            };
        };
    };
    get_system_user_imports_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户导入任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户导入任务详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserImportJobVo"];
                };
            };
        };
    };
    post_system_user_imports_by_id_cancel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户导入任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyRequestDto"];
            };
        };
        responses: {
            /** @description 已申请取消用户导入 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserImportJobVo"];
                };
            };
        };
    };
    get_system_user_imports_by_id_report: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户导入任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户导入错误报告 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": number[];
                };
            };
        };
    };
    get_system_user_imports_by_id_rows: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
            };
            header?: never;
            path: {
                /** @description 用户导入任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户导入异常行 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_UserImportRowVo"];
                };
            };
        };
    };
    get_system_users: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。 */
                page?: number;
                /**
                 * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
                 *     `pagination.max_page_size` 限制（默认值为 100）。
                 */
                page_size?: number;
                username?: string;
                phone?: string;
                status?: string;
                dept_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户列表 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_UserVo"];
                };
            };
        };
    };
    post_system_users: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateUserDto"];
            };
        };
        responses: {
            /** @description 创建成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserVo"];
                };
            };
        };
    };
    delete_system_users_batch_by_ids: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户ID列表，逗号分隔 */
                ids: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 批量删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    post_system_users_exports: {
        parameters: {
            query?: never;
            header: {
                /** @description 幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserExportRequestDto"];
            };
        };
        responses: {
            /** @description 用户导出任务已创建 */
            202: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    get_system_users_import_template: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 下载用户导入模板 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": number[];
                };
            };
        };
    };
    get_system_users_options: {
        parameters: {
            query?: {
                /** @description 按名称或稳定编码做前缀搜索；首尾空白会被移除。 */
                q?: string;
                /** @description 返回上限；省略时使用服务端默认分页大小。 */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户选项 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_OptionList"];
                };
            };
        };
    };
    get_system_users_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户详情 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserDetailVo"];
                };
            };
        };
    };
    put_system_users_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateUserDto"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserVo"];
                };
            };
        };
    };
    delete_system_users_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    post_system_users_by_id_password_reset_requests: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PasswordResetRequestDto"];
            };
        };
        responses: {
            /** @description 密码重置请求已发起 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_PasswordResetRequestResponse"];
                };
            };
        };
    };
    put_system_users_by_id_roles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReplaceUserRolesDto"];
            };
        };
        responses: {
            /** @description 角色分配成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    put_system_users_by_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 用户ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateUserStatusDto"];
            };
        };
        responses: {
            /** @description 状态修改成功 */
            200: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 本次响应所依据的租户数据放置代次 */
                    "X-Tenant-Data-Generation"?: string;
                    /** @description 本次响应所依据的租户业务数据状态 */
                    "X-Tenant-Data-State"?: string;
                    /** @description 本次响应所依据的租户产品运行纪元 */
                    "X-Tenant-Runtime-Epoch"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
}
