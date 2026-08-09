/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export interface paths {
    "/api/v1/auth/captcha/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 查询验证码开关状态
         * @description GET /api/v1/auth/captcha/config（公开接口，无需认证）
         *     返回 sys.account.captchaEnabled 配置值。
         */
        get: operations["get_auth_captcha_config"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/captcha/generate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 生成验证码 */
        get: operations["get_auth_captcha_generate"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/captcha/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 返回验证码图片（PNG 格式） */
        get: operations["get_auth_captcha_image"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/captcha/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 校验验证码 */
        post: operations["post_auth_captcha_verify"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/csrf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 获取短期 CSRF 挑战令牌
         * @description GET /api/v1/auth/csrf
         */
        get: operations["get_auth_csrf"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 用户登出
         * @description POST /api/v1/auth/logout
         */
        post: operations["post_auth_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 获取当前用户信息
         * @description GET /api/v1/auth/me
         */
        get: operations["get_auth_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/password-reset/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_auth_password_reset_complete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 获取个人信息 */
        get: operations["get_auth_profile"];
        /** 更新个人信息 */
        put: operations["put_auth_profile"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/profile/avatar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * 更新头像（直接接受文件上传）
         * @description 请求格式: multipart/form-data，字段名 `file`。
         *     上传后自动写入 sys_file 元数据表并更新 sys_user.avatar。
         */
        put: operations["put_auth_profile_avatar"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/profile/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** 修改密码 */
        put: operations["put_auth_profile_password"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 刷新令牌
         * @description POST /api/v1/auth/refresh
         */
        post: operations["post_auth_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/ws-ticket": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 申请仅可用于一次 WebSocket 握手的短期票据。
         * @description GET 升级请求不再携带 access token，避免令牌出现在 URL、代理日志或浏览器历史中。
         */
        post: operations["post_auth_ws_ticket"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/file/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 下载文件（薄层：HTTP 参数提取 + 构建响应头，业务委托 FileService） */
        get: operations["get_common_file_download"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查询当前用户可以访问的最近导出任务。 */
        get: operations["get_common_jobs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/jobs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查询当前用户自己的导出任务。 */
        get: operations["get_common_jobs_by_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/jobs/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 取消当前用户尚未完成的导出任务。 */
        post: operations["post_common_jobs_by_id_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/jobs/{id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 下载当前用户尚未过期的导出结果。 */
        get: operations["get_common_jobs_by_id_download"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 通用文件上传（固定私有 `uploads` 桶） */
        post: operations["post_common_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/upload/avatar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 头像上传（固定使用 `avatar` 桶） */
        post: operations["post_common_upload_avatar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/upload/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 图片上传（仅允许图片类型，自动压缩） */
        post: operations["post_common_upload_image"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/cache": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_cache"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/cache/commands": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_cache_commands"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/db-pool": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_db_pool"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 分页查询当前租户的后台任务。 */
        get: operations["get_monitor_jobs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/jobs/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 统计当前租户的后台任务队列状态。 */
        get: operations["get_monitor_jobs_stats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/jobs/{id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 人工重新投递一条死信任务。 */
        post: operations["post_monitor_jobs_by_id_retry"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_metrics"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/runtime": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_runtime"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/schedules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_schedules"];
        put?: never;
        post: operations["post_monitor_schedules"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/schedules/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_monitor_schedules_preview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/schedules/targets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_schedules_targets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/schedules/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_schedules_by_id"];
        put: operations["put_monitor_schedules_by_id"];
        post?: never;
        delete: operations["delete_monitor_schedules_by_id"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/schedules/{id}/executions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_schedules_by_id_executions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/schedules/{id}/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_monitor_schedules_by_id_run"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/schedules/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["put_monitor_schedules_by_id_status"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/server": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_server"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_tenants"];
        put?: never;
        post: operations["post_platform_tenants"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants/{tenant_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["put_platform_tenants_by_tenant_id"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants/{tenant_id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["put_platform_tenants_by_tenant_id_status"];
        post?: never;
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
    "/api/v1/system/menus/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 当前用户可见的菜单树（按角色过滤，前端用） */
        get: operations["get_system_menus_current"];
        put?: never;
        post?: never;
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
        /** 岗位列表分页查询 */
        get: operations["get_system_posts"];
        put?: never;
        /** 创建岗位 */
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
        /** 岗位详情 */
        get: operations["get_system_posts_by_id"];
        /** 更新岗位 */
        put: operations["put_system_posts_by_id"];
        post?: never;
        /** 删除岗位 */
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
    "/api/v1/system/users/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_system_users_import"];
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
    "/api/v1/tools/gen/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 打包 zip 下载 */
        post: operations["post_tools_gen_download"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tools/gen/generate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 写入磁盘 */
        post: operations["post_tools_gen_generate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tools/gen/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 预览生成内容 */
        post: operations["post_tools_gen_preview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tools/gen/tables": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 列出数据库表 */
        get: operations["get_tools_gen_tables"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/version": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 返回 API 版本与主要入口。 */
        get: operations["get_version"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/livez": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_livez"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/readyz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_readyz"];
        put?: never;
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
        ApiPageResponse_BackgroundJobVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_BackgroundJobVo"];
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
        ApiPageResponse_JobScheduleExecutionVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_JobScheduleExecutionVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_JobScheduleVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_JobScheduleVo"];
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
        ApiPageResponse_TableInfo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_TableInfo"];
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
        ApiResponse_ApiVersionInfo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description API 版本与构建信息。 */
            data?: {
                api_prefix: string;
                endpoints: components["schemas"]["ApiVersionEndpoints"];
                name: string;
                source_commit: string;
                version: string;
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
        ApiResponse_AvatarResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                avatar_url: string;
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
        ApiResponse_BTreeMap_String_String: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                [key: string]: string;
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
        ApiResponse_BackgroundJobQueueStats: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 后台任务队列统计。 */
            data?: {
                /** Format: int64 */
                dead: number;
                /** Format: int64 */
                pending: number;
                /** Format: int64 */
                ready: number;
                /** Format: int64 */
                running: number;
                /** Format: int64 */
                succeeded: number;
                /** Format: int64 */
                total: number;
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
        ApiResponse_BackgroundJobVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 后台任务的公开视图，不包含内部载荷。 */
            data?: {
                /** Format: int32 */
                attempts: number;
                /** Format: date-time */
                available_at: string;
                /** Format: date-time */
                completed_at?: string | null;
                /** Format: date-time */
                created_at: string;
                dedupe_key?: string | null;
                id: string;
                job_type: string;
                last_error?: string | null;
                lease_owner?: string | null;
                /** Format: date-time */
                lease_until?: string | null;
                /** Format: int32 */
                max_attempts: number;
                /** Format: int32 */
                max_runtime_seconds?: number | null;
                /** Format: int32 */
                priority: number;
                schedule_id?: string | null;
                /** Format: date-time */
                scheduled_for?: string | null;
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
        ApiResponse_CacheInfo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 缓存信息响应 */
            data?: {
                /** @description Redis 是否可用 */
                available: boolean;
                /** @description 键统计 */
                keys: components["schemas"]["CacheKeysInfo"];
                memory?: null | components["schemas"]["RedisMemoryInfo"];
                /** @description 缓存模式: "redis" 或 "memory" */
                mode: string;
                server?: null | components["schemas"]["RedisServerInfo"];
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
        ApiResponse_CaptchaConfigResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                captcha_enabled: boolean;
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
        ApiResponse_CaptchaResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 验证码响应 */
            data?: {
                /** @description 验证码 UUID（用于后续校验） */
                captcha_id: string;
                /** @description 验证码图片（Base64 编码） */
                image_base64: string;
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
        ApiResponse_CaptchaVerifyResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                valid: boolean;
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
        ApiResponse_CsrfResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                csrf_token: string;
                expires_in: number;
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
        ApiResponse_DbPoolInfo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                /** Format: int64 */
                active_connections?: number | null;
                status: string;
                timestamp: string;
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
                resource: string;
                result_file_name?: string | null;
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
        ApiResponse_JobScheduleExecutionVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                background_job_id?: string | null;
                background_job_status?: string | null;
                /** Format: date-time */
                created_at: string;
                detail?: string | null;
                handler_key: string;
                id: string;
                outcome: string;
                schedule_id: string;
                schedule_name: string;
                /** Format: date-time */
                scheduled_for: string;
                trigger_kind: string;
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
        ApiResponse_JobSchedulePreview: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                occurrences: components["schemas"]["JobScheduleOccurrence"][];
                timezone: string;
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
        ApiResponse_JobScheduleVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                concurrency_policy: string;
                /** Format: date-time */
                created_at: string;
                cron_expression: string;
                enabled: boolean;
                handler_key: string;
                id: string;
                /** Format: date-time */
                last_run_at?: string | null;
                /** Format: int32 */
                max_runtime_seconds: number;
                misfire_policy: string;
                name: string;
                /** Format: date-time */
                next_run_at?: string | null;
                timezone: string;
                /** Format: date-time */
                updated_at: string;
                /** Format: int64 */
                version: number;
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
        ApiResponse_LoginResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                access_token: string;
                expires_in: number;
                user_info: components["schemas"]["UserInfo"];
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
                menu_type: string;
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
                perm_type: string;
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
            /** @description 岗位响应。 */
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
        ApiResponse_RuntimeStatus: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                database: components["schemas"]["RuntimeDatabaseStatus"];
                object_storage: components["schemas"]["RuntimeStorageStatus"];
                redis: components["schemas"]["RuntimeRedisStatus"];
                upload_circuit_breaker: components["schemas"]["RuntimeCircuitBreakerStatus"];
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
        ApiResponse_ServerInfo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                /** @description CPU 核心数。 */
                cpu_cores: number;
                /**
                 * Format: float
                 * @description CPU 使用率（百分比）。
                 */
                cpu_usage: number;
                /** @description 主机名。 */
                hostname: string;
                /**
                 * Format: float
                 * @description 内存使用率（百分比）。
                 */
                memory_usage: number;
                /** @description 操作系统。 */
                os: string;
                /**
                 * Format: int32
                 * @description 进程 PID。
                 */
                pid: number;
                /**
                 * Format: double
                 * @description 总内存（GB）。
                 */
                total_memory: number;
                /**
                 * Format: int64
                 * @description 系统运行时长（秒）。
                 */
                uptime: number;
                /**
                 * Format: double
                 * @description 已用内存（GB）。
                 */
                used_memory: number;
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
        ApiResponse_TenantVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 租户响应。 */
            data?: {
                domain?: string | null;
                /** Format: date-time */
                expire_at?: string | null;
                /** Format: int32 */
                max_requests_per_min: number;
                /** Format: int32 */
                max_roles: number;
                /** Format: int64 */
                max_storage_mb: number;
                /** Format: int32 */
                max_users: number;
                name: string;
                status: string;
                tenant_id: string;
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
        ApiResponse_UserImportResult: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                errors: string[];
                fail_count: number;
                success_count: number;
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
        ApiResponse_UserInfo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 当前登录用户的公开信息。 */
            data?: {
                avatar?: string | null;
                dept_name?: string | null;
                email: string;
                id: string;
                nickname: string;
                perms: string[];
                phone: string;
                preferred_locale?: string | null;
                roles: string[];
                tenant_id: string;
                tenant_name: string;
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
        ApiResponse_UserProfileResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 用户个人信息响应。 */
            data?: {
                avatar?: string | null;
                created_at: string;
                dept_id?: string | null;
                dept_name?: string | null;
                email: string;
                login_date?: string | null;
                login_ip?: string | null;
                nickname: string;
                permissions: string[];
                phone: string;
                preferred_locale?: string | null;
                remark?: string | null;
                roles: string[];
                status: string;
                user_id: string;
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
        ApiResponse_Vec_ExportJobVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
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
                resource: string;
                result_file_name?: string | null;
                status: string;
                /** Format: date-time */
                updated_at: string;
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
        ApiResponse_Vec_GeneratedFile: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                content: string;
                path: string;
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
                menu_type: string;
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
                perm_type: string;
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
        ApiResponse_Vec_ScheduleTargetVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                available: boolean;
                display_name: string;
                handler_key: string;
                job_type: string;
                scope: string;
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
        ApiResponse_Vec_TenantVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                domain?: string | null;
                /** Format: date-time */
                expire_at?: string | null;
                /** Format: int32 */
                max_requests_per_min: number;
                /** Format: int32 */
                max_roles: number;
                /** Format: int64 */
                max_storage_mb: number;
                /** Format: int32 */
                max_users: number;
                name: string;
                status: string;
                tenant_id: string;
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
        ApiResponse_Vec_UploadResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                file_id: string;
                file_name: string;
                file_path: string;
                file_url: string;
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
        ApiResponse_WebSocketTicketResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 申请一次性 WebSocket 票据后的 HTTP 响应。 */
            data?: {
                /** Format: int64 */
                expires_in: number;
                ticket: string;
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
        ApiResponse_WriteReport: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 代码生成写入报告。 */
            data?: {
                skipped: string[];
                written: string[];
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
        /** @description API 主要入口。 */
        ApiVersionEndpoints: {
            auth: string;
            common: string;
            monitor: string;
            openapi: string;
            swagger: string;
            system: string;
            tools: string;
        };
        /** @description API 版本与构建信息。 */
        ApiVersionInfo: {
            api_prefix: string;
            endpoints: components["schemas"]["ApiVersionEndpoints"];
            name: string;
            source_commit: string;
            version: string;
        };
        AvatarResponse: {
            avatar_url: string;
        };
        /** @description 后台任务分页查询参数。 */
        BackgroundJobPageQuery: {
            /** @description 按任务类型精确过滤。 */
            job_type?: string | null;
            /**
             * Format: int64
             * @description 页码，从 1 开始；省略时采用运行时分页配置。
             */
            page?: number | null;
            /**
             * Format: int64
             * @description 每页记录数；上限由 `pagination.max_page_size` 决定。
             */
            page_size?: number | null;
            /** @description 按来源计划 ID 精确过滤。 */
            schedule_id?: string | null;
            /** @description 按状态精确过滤：pending、running、succeeded 或 dead。 */
            status?: string | null;
        };
        /** @description 后台任务队列统计。 */
        BackgroundJobQueueStats: {
            /** Format: int64 */
            dead: number;
            /** Format: int64 */
            pending: number;
            /** Format: int64 */
            ready: number;
            /** Format: int64 */
            running: number;
            /** Format: int64 */
            succeeded: number;
            /** Format: int64 */
            total: number;
        };
        /** @description 后台任务的公开视图，不包含内部载荷。 */
        BackgroundJobVo: {
            /** Format: int32 */
            attempts: number;
            /** Format: date-time */
            available_at: string;
            /** Format: date-time */
            completed_at?: string | null;
            /** Format: date-time */
            created_at: string;
            dedupe_key?: string | null;
            id: string;
            job_type: string;
            last_error?: string | null;
            lease_owner?: string | null;
            /** Format: date-time */
            lease_until?: string | null;
            /** Format: int32 */
            max_attempts: number;
            /** Format: int32 */
            max_runtime_seconds?: number | null;
            /** Format: int32 */
            priority: number;
            schedule_id?: string | null;
            /** Format: date-time */
            scheduled_for?: string | null;
            status: string;
            /** Format: date-time */
            updated_at: string;
        };
        /** @description 缓存信息响应 */
        CacheInfo: {
            /** @description Redis 是否可用 */
            available: boolean;
            /** @description 键统计 */
            keys: components["schemas"]["CacheKeysInfo"];
            memory?: null | components["schemas"]["RedisMemoryInfo"];
            /** @description 缓存模式: "redis" 或 "memory" */
            mode: string;
            server?: null | components["schemas"]["RedisServerInfo"];
        };
        /** @description 缓存键统计 */
        CacheKeysInfo: {
            /**
             * Format: int64
             * @description 验证码数
             */
            captchas: number;
            /**
             * Format: int64
             * @description 配置缓存数
             */
            config_cache: number;
            /**
             * Format: int64
             * @description 字典缓存数
             */
            dict_cache: number;
            /**
             * Format: int64
             * @description 在线用户会话数
             */
            online_users: number;
            /**
             * Format: int64
             * @description 限流计数器数
             */
            rate_limits: number;
            /**
             * Format: int64
             * @description 当前数据库键总数
             */
            total_keys: number;
        };
        /**
         * @description 取消导出任务的显式命令体。
         *
         *     保留空对象而不是省略请求体，使写操作契约保持一致，并为后续增加取消原因等字段预留空间。
         */
        CancelExportJobDto: Record<string, never>;
        CaptchaConfigResponse: {
            captcha_enabled: boolean;
        };
        /**
         * @description 验证码生成查询参数
         * @enum {string}
         */
        CaptchaKind: "alphanumeric" | "math";
        CaptchaQuery: {
            /** @description 验证码类型: alphanumeric（字母数字）/ math（数学计算） */
            captcha_type?: components["schemas"]["CaptchaKind"];
        };
        /** @description 验证码响应 */
        CaptchaResponse: {
            /** @description 验证码 UUID（用于后续校验） */
            captcha_id: string;
            /** @description 验证码图片（Base64 编码） */
            image_base64: string;
        };
        /** @description 验证码校验请求 */
        CaptchaVerifyRequest: {
            captcha_id: string;
            code: string;
        };
        CaptchaVerifyResponse: {
            valid: boolean;
        };
        ChangePasswordRequest: {
            new_password: string;
            old_password: string;
        };
        /** @description 数据库列结构响应。 */
        ColumnInfo: {
            comment?: string | null;
            data_type: string;
            is_auto_increment: boolean;
            is_nullable: boolean;
            is_primary_key: boolean;
            is_unique: boolean;
            name: string;
            rust_type: string;
        };
        CompletePasswordResetRequest: {
            new_password: string;
            request_id: string;
            tenant_id: string;
            token: string;
        };
        /** @enum {string} */
        ConcurrencyPolicyDto: "forbid" | "allow";
        /** @description 参数配置响应。 */
        ConfigVo: {
            /** Format: date-time */
            created_at: string;
            id: string;
            key: string;
            name: string;
            remark?: string | null;
            value: string;
        };
        CreateConfigDto: {
            key: string;
            name: string;
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
        CreateScheduleRequest: {
            concurrency_policy?: components["schemas"]["ConcurrencyPolicyDto"];
            cron_expression: string;
            enabled?: boolean;
            handler_key: string;
            /** Format: int32 */
            max_runtime_seconds?: number;
            misfire_policy?: components["schemas"]["MisfirePolicyDto"];
            name: string;
            timezone: string;
        };
        CreateTenantDto: {
            admin_password: string;
            admin_username: string;
            domain?: string | null;
            /** Format: date-time */
            expire_at?: string | null;
            /** Format: int32 */
            max_requests_per_min?: number | null;
            /** Format: int32 */
            max_roles?: number | null;
            /** Format: int64 */
            max_storage_mb?: number | null;
            /** Format: int32 */
            max_users?: number | null;
            name: string;
            tenant_id: string;
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
        CsrfResponse: {
            csrf_token: string;
            expires_in: number;
        };
        DbPoolInfo: {
            /** Format: int64 */
            active_connections?: number | null;
            status: string;
            timestamp: string;
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
        /** @description 字典数据响应。 */
        DictDataVo: {
            css_class?: string | null;
            id: string;
            label: string;
            /** Format: int32 */
            sort: number;
            status: string;
            type_code: string;
            value: string;
        };
        DictOptionDto: {
            css_class?: string | null;
            label: string;
            value: string;
        };
        /** @description 字典类型响应。 */
        DictTypeVo: {
            code: string;
            /** Format: date-time */
            created_at: string;
            id: string;
            name: string;
            remark?: string | null;
            status: string;
        };
        /** @description 导出任务响应。 */
        ExportJobVo: {
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
            resource: string;
            result_file_name?: string | null;
            status: string;
            /** Format: date-time */
            updated_at: string;
        };
        /**
         * @description 资源导出的筛选条件快照。
         *
         *     各资源沿用其列表接口的筛选字段，服务端会按资源类型严格反序列化并校验。
         */
        ExportRequestDto: unknown;
        FileUploadForm: {
            file: number[];
        };
        GenerateOptionsDto: {
            dto_dir?: string | null;
            entity_dir?: string | null;
            generate_comments?: boolean;
            generate_dto?: boolean | null;
            generate_entity?: boolean | null;
            generate_handler?: boolean | null;
            generate_repository?: boolean | null;
            generate_service?: boolean | null;
            handler_dir?: string | null;
            overwrite?: boolean;
            repository_dir?: string | null;
            service_dir?: string | null;
            table_prefixes?: string[];
            tables: string[];
        };
        GenerateRequestDto: {
            options: components["schemas"]["GenerateOptionsDto"];
            /** @description 后端服务所在机器上的代码输出根目录。 */
            output_dir: string;
        };
        /** @description 代码生成预览文件。 */
        GeneratedFile: {
            content: string;
            path: string;
        };
        JobScheduleExecutionVo: {
            background_job_id?: string | null;
            background_job_status?: string | null;
            /** Format: date-time */
            created_at: string;
            detail?: string | null;
            handler_key: string;
            id: string;
            outcome: string;
            schedule_id: string;
            schedule_name: string;
            /** Format: date-time */
            scheduled_for: string;
            trigger_kind: string;
        };
        JobScheduleOccurrence: {
            schedule_time: string;
            /** Format: date-time */
            utc: string;
        };
        JobSchedulePreview: {
            occurrences: components["schemas"]["JobScheduleOccurrence"][];
            timezone: string;
        };
        JobScheduleVo: {
            concurrency_policy: string;
            /** Format: date-time */
            created_at: string;
            cron_expression: string;
            enabled: boolean;
            handler_key: string;
            id: string;
            /** Format: date-time */
            last_run_at?: string | null;
            /** Format: int32 */
            max_runtime_seconds: number;
            misfire_policy: string;
            name: string;
            /** Format: date-time */
            next_run_at?: string | null;
            timezone: string;
            /** Format: date-time */
            updated_at: string;
            /** Format: int64 */
            version: number;
        };
        LivenessResponse: {
            status: string;
        };
        /** @description 登录日志响应。 */
        LoginInfoVo: {
            browser?: string | null;
            id: string;
            ipaddr: string;
            login_location?: string | null;
            login_time: string;
            msg?: string | null;
            os?: string | null;
            status: string;
            user_name: string;
        };
        LoginLogPageQuery: {
            begin_time?: string | null;
            end_time?: string | null;
            /**
             * Format: int64
             * @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。
             */
            page?: number | null;
            /**
             * Format: int64
             * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
             *     `pagination.max_page_size` 限制（默认值为 100）。
             */
            page_size?: number | null;
            status?: string | null;
            user_name?: string | null;
        };
        LoginRequest: {
            captcha_code?: string | null;
            captcha_id?: string | null;
            password: string;
            username: string;
        };
        LoginResponse: {
            access_token: string;
            expires_in: number;
            user_info: components["schemas"]["UserInfo"];
        };
        /** @description 菜单树节点。 */
        MenuTreeNode: {
            children: components["schemas"]["MenuTreeNode"][];
            icon?: string | null;
            id: string;
            menu_type: string;
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
        /** @description 菜单响应。 */
        MenuVo: {
            /** Format: date-time */
            created_at: string;
            icon?: string | null;
            id: string;
            menu_type: string;
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
        /** @description 发布消息时的受众选择器。 */
        MessageAudienceDto: {
            /** @description tenant、role 或 user。 */
            kind: string;
            /** @description tenant 受众必须省略或传入 "0"；角色和用户 ID 以字符串避免精度丢失。 */
            target_id?: string | null;
        };
        /** @description 面向 REST 客户端的游标收件箱响应。 */
        MessageInboxPage: {
            next_cursor?: string | null;
            records: components["schemas"]["MessageVo"][];
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
        /** @enum {string} */
        MisfirePolicyDto: "skip" | "fire_once";
        /** @description 通知公告响应。 */
        NoticeVo: {
            content_markdown: string;
            /** Format: date-time */
            created_at: string;
            created_by?: string | null;
            id: string;
            notice_type?: string | null;
            status: string;
            title: string;
        };
        /** @description 在线用户响应。 */
        OnlineUserVo: {
            browser?: string | null;
            dept_name?: string | null;
            ipaddr: string;
            last_access_time: string;
            login_location?: string | null;
            login_time: string;
            os?: string | null;
            sid: string;
            username: string;
        };
        OperLogPageQuery: {
            begin_time?: string | null;
            end_time?: string | null;
            oper_name?: string | null;
            /**
             * Format: int64
             * @description 页码，从 1 开始；未提供时由运行时 TOML 策略解析。
             */
            page?: number | null;
            /**
             * Format: int64
             * @description 公共 API 仅接受 snake_case 形式的 `page_size`，并受
             *     `pagination.max_page_size` 限制（默认值为 100）。
             */
            page_size?: number | null;
            status?: string | null;
        };
        /** @description 操作日志响应。 */
        OperLogVo: {
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
        };
        /** @description 选择器候选项。 */
        OptionItem: {
            description?: string | null;
            disabled: boolean;
            label: string;
            value: string;
        };
        /** @description 有界选择器响应。 */
        OptionList: {
            has_more: boolean;
            items: components["schemas"]["OptionItem"][];
        };
        /** @description 分页接口的业务数据。 */
        PageData_BackgroundJobVo: {
            items: {
                /** Format: int32 */
                attempts: number;
                /** Format: date-time */
                available_at: string;
                /** Format: date-time */
                completed_at?: string | null;
                /** Format: date-time */
                created_at: string;
                dedupe_key?: string | null;
                id: string;
                job_type: string;
                last_error?: string | null;
                lease_owner?: string | null;
                /** Format: date-time */
                lease_until?: string | null;
                /** Format: int32 */
                max_attempts: number;
                /** Format: int32 */
                max_runtime_seconds?: number | null;
                /** Format: int32 */
                priority: number;
                schedule_id?: string | null;
                /** Format: date-time */
                scheduled_for?: string | null;
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
        PageData_ConfigVo: {
            items: {
                /** Format: date-time */
                created_at: string;
                id: string;
                key: string;
                name: string;
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
        PageData_JobScheduleExecutionVo: {
            items: {
                background_job_id?: string | null;
                background_job_status?: string | null;
                /** Format: date-time */
                created_at: string;
                detail?: string | null;
                handler_key: string;
                id: string;
                outcome: string;
                schedule_id: string;
                schedule_name: string;
                /** Format: date-time */
                scheduled_for: string;
                trigger_kind: string;
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
        PageData_JobScheduleVo: {
            items: {
                concurrency_policy: string;
                /** Format: date-time */
                created_at: string;
                cron_expression: string;
                enabled: boolean;
                handler_key: string;
                id: string;
                /** Format: date-time */
                last_run_at?: string | null;
                /** Format: int32 */
                max_runtime_seconds: number;
                misfire_policy: string;
                name: string;
                /** Format: date-time */
                next_run_at?: string | null;
                timezone: string;
                /** Format: date-time */
                updated_at: string;
                /** Format: int64 */
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
                menu_type: string;
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
        PageData_TableInfo: {
            items: {
                columns: components["schemas"]["ColumnInfo"][];
                comment?: string | null;
                table_name: string;
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
        PasswordResetRequestResponse: {
            expires_at: string;
            request_id: string;
            reset_url: string;
        };
        /** @description 权限同步结果。 */
        PermissionSyncReport: {
            created: number;
            existing: number;
            missing: string[];
            scanned: number;
        };
        /** @description 权限树节点。 */
        PermissionTreeNode: {
            children: components["schemas"]["PermissionTreeNode"][];
            code: string;
            icon?: string | null;
            id: string;
            name: string;
            parent_id?: string | null;
            perm_type: string;
            /** Format: int32 */
            sort: number;
            status: string;
        };
        /**
         * @description 权限类型。
         * @enum {string}
         */
        PermissionType: "api" | "menu";
        /** @description 权限详情响应。 */
        PermissionVo: {
            code: string;
            /** Format: date-time */
            created_at: string;
            icon?: string | null;
            id: string;
            name: string;
            parent_id?: string | null;
            perm_type: string;
            /** Format: int32 */
            sort: number;
            status: string;
        };
        /** @description 岗位响应。 */
        PostVo: {
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
        /** @description 面向 REST 客户端的发布结果。 */
        PublishedMessageVo: {
            inserted: boolean;
            message: components["schemas"]["MessageVo"];
            recipient_count: number;
        };
        ReadinessResponse: {
            mysql: string;
            object_storage: string;
            redis: string;
            status: string;
        };
        /** @description Redis 内存信息 */
        RedisMemoryInfo: {
            /**
             * Format: double
             * @description 内存碎片率
             */
            mem_fragmentation_ratio: number;
            /**
             * Format: int64
             * @description 已用内存（字节）
             */
            used_memory: number;
            /** @description 已用内存（人类可读） */
            used_memory_human: string;
            /** @description 内存峰值（人类可读） */
            used_memory_peak_human: string;
        };
        /** @description Redis 服务器基本信息 */
        RedisServerInfo: {
            /**
             * Format: int64
             * @description 连接数
             */
            connected_clients: number;
            /** @description 运行模式 */
            mode: string;
            /** @description 操作系统 */
            os: string;
            /**
             * Format: int64
             * @description 运行天数
             */
            uptime_days: number;
            /** @description Redis 版本 */
            version: string;
        };
        ReplaceRoleDataScopeDto: {
            data_scope: string;
            dept_ids?: string[];
        };
        ReplaceRolePermissionsDto: {
            perm_ids?: string[];
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
        /** @description 角色响应。 */
        RoleVo: {
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
        RuntimeCircuitBreakerStatus: {
            state: string;
        };
        RuntimeDatabaseReadSelection: {
            /** Format: int64 */
            count: number;
            reason: string;
            target: string;
        };
        RuntimeDatabaseReplicaStatus: {
            connected: boolean;
            consecutive_failures: number;
            consecutive_successes: number;
            name: string;
        };
        RuntimeDatabaseSourceStatus: {
            connected: boolean;
            name: string;
        };
        RuntimeDatabaseStatus: {
            connected: boolean;
            driver: string;
            primary_connected: boolean;
            /** Format: int64 */
            read_fallback_total: number;
            read_policy: string;
            read_selections: components["schemas"]["RuntimeDatabaseReadSelection"][];
            replica_count: number;
            replicas: components["schemas"]["RuntimeDatabaseReplicaStatus"][];
            source_count: number;
            sources: components["schemas"]["RuntimeDatabaseSourceStatus"][];
        };
        RuntimeRedisStatus: {
            configured: boolean;
            connected: boolean;
        };
        RuntimeStatus: {
            database: components["schemas"]["RuntimeDatabaseStatus"];
            object_storage: components["schemas"]["RuntimeStorageStatus"];
            redis: components["schemas"]["RuntimeRedisStatus"];
            upload_circuit_breaker: components["schemas"]["RuntimeCircuitBreakerStatus"];
        };
        RuntimeStorageStatus: {
            backend: string;
            connected: boolean;
            endpoint?: string | null;
        };
        ScheduleExecutionPageQuery: {
            background_job_status?: string | null;
            outcome?: string | null;
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
            trigger_kind?: string | null;
        };
        SchedulePageQuery: {
            enabled?: boolean | null;
            handler_key?: string | null;
            name?: string | null;
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
        };
        SchedulePreviewRequest: {
            cron_expression: string;
            timezone: string;
        };
        ScheduleTargetVo: {
            available: boolean;
            display_name: string;
            handler_key: string;
            job_type: string;
            scope: string;
        };
        ScheduleVersionRequest: {
            /** Format: int64 */
            version: number;
        };
        ServerInfo: {
            /** @description CPU 核心数。 */
            cpu_cores: number;
            /**
             * Format: float
             * @description CPU 使用率（百分比）。
             */
            cpu_usage: number;
            /** @description 主机名。 */
            hostname: string;
            /**
             * Format: float
             * @description 内存使用率（百分比）。
             */
            memory_usage: number;
            /** @description 操作系统。 */
            os: string;
            /**
             * Format: int32
             * @description 进程 PID。
             */
            pid: number;
            /**
             * Format: double
             * @description 总内存（GB）。
             */
            total_memory: number;
            /**
             * Format: int64
             * @description 系统运行时长（秒）。
             */
            uptime: number;
            /**
             * Format: double
             * @description 已用内存（GB）。
             */
            used_memory: number;
        };
        /** @description 数据库表结构响应。 */
        TableInfo: {
            columns: components["schemas"]["ColumnInfo"][];
            comment?: string | null;
            table_name: string;
        };
        /** @description 租户响应。 */
        TenantVo: {
            domain?: string | null;
            /** Format: date-time */
            expire_at?: string | null;
            /** Format: int32 */
            max_requests_per_min: number;
            /** Format: int32 */
            max_roles: number;
            /** Format: int64 */
            max_storage_mb: number;
            /** Format: int32 */
            max_users: number;
            name: string;
            status: string;
            tenant_id: string;
        };
        UpdateConfigDto: {
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
        UpdateProfileRequest: {
            email?: string | null;
            nickname: string;
            phone?: string | null;
            /** @description 用户界面和服务端消息的语言偏好；空值表示使用请求语言或系统默认语言。 */
            preferred_locale?: string | null;
        };
        UpdateRoleDto: {
            name: string;
            /** Format: int32 */
            sort?: number | null;
            status: string;
        };
        UpdateScheduleRequest: {
            concurrency_policy: components["schemas"]["ConcurrencyPolicyDto"];
            cron_expression: string;
            enabled: boolean;
            handler_key: string;
            /** Format: int32 */
            max_runtime_seconds: number;
            misfire_policy: components["schemas"]["MisfirePolicyDto"];
            name: string;
            timezone: string;
            /** Format: int64 */
            version: number;
        };
        UpdateScheduleStatusRequest: {
            enabled: boolean;
            /** Format: int64 */
            version: number;
        };
        UpdateTenantDto: {
            domain?: string | null;
            /** Format: date-time */
            expire_at?: string | null;
            /** Format: int32 */
            max_requests_per_min: number;
            /** Format: int32 */
            max_roles: number;
            /** Format: int64 */
            max_storage_mb: number;
            /** Format: int32 */
            max_users: number;
            name: string;
        };
        UpdateTenantStatusDto: {
            status: string;
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
        /** @description 文件上传响应。 */
        UploadResponse: {
            file_id: string;
            file_name: string;
            file_path: string;
            file_url: string;
        };
        /** @description 用户详情响应。 */
        UserDetailVo: components["schemas"]["UserVo"] & {
            roles: components["schemas"]["RoleBriefVo"][];
        };
        /** @description 创建异步用户导出任务的筛选条件。 */
        UserExportRequestDto: {
            /** @description Snowflake ID 统一使用字符串传输，避免 JavaScript 精度丢失。 */
            dept_id?: string | null;
            phone?: string | null;
            status?: string | null;
            username?: string | null;
        };
        UserImportResult: {
            errors: string[];
            fail_count: number;
            success_count: number;
        };
        /** @description 当前登录用户的公开信息。 */
        UserInfo: {
            avatar?: string | null;
            dept_name?: string | null;
            email: string;
            id: string;
            nickname: string;
            perms: string[];
            phone: string;
            preferred_locale?: string | null;
            roles: string[];
            tenant_id: string;
            tenant_name: string;
            username: string;
        };
        /** @description 用户个人信息响应。 */
        UserProfileResponse: {
            avatar?: string | null;
            created_at: string;
            dept_id?: string | null;
            dept_name?: string | null;
            email: string;
            login_date?: string | null;
            login_ip?: string | null;
            nickname: string;
            permissions: string[];
            phone: string;
            preferred_locale?: string | null;
            remark?: string | null;
            roles: string[];
            status: string;
            user_id: string;
            username: string;
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
        /** @description 申请一次性 WebSocket 票据后的 HTTP 响应。 */
        WebSocketTicketResponse: {
            /** Format: int64 */
            expires_in: number;
            ticket: string;
        };
        /** @description 代码生成写入报告。 */
        WriteReport: {
            skipped: string[];
            written: string[];
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
    get_auth_captcha_config: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 验证码开关 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_CaptchaConfigResponse"];
                };
            };
        };
    };
    get_auth_captcha_generate: {
        parameters: {
            query?: {
                /** @description 验证码类型: alphanumeric（字母数字）/ math（数学计算） */
                captcha_type?: components["schemas"]["CaptchaKind"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 生成验证码 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_CaptchaResponse"];
                };
            };
            /** @description 验证码请求过于频繁 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 验证码 Redis 存储不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_auth_captcha_image: {
        parameters: {
            query?: {
                /** @description 验证码类型: alphanumeric（字母数字）/ math（数学计算） */
                captcha_type?: components["schemas"]["CaptchaKind"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 验证码 PNG 图片 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/png": number[];
                };
            };
        };
    };
    post_auth_captcha_verify: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaptchaVerifyRequest"];
            };
        };
        responses: {
            /** @description 验证码校验结果 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_CaptchaVerifyResponse"];
                };
            };
            /** @description 验证码校验过于频繁 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 验证码 Redis 存储不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_auth_csrf: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description CSRF 挑战令牌 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_CsrfResponse"];
                };
            };
        };
    };
    post_auth_login: {
        parameters: {
            query?: never;
            header: {
                /** @description 已签名的 CSRF 挑战令牌 */
                "X-CSRF-Token": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description 登录成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_LoginResponse"];
                };
            };
            /** @description 参数校验失败 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 用户名或密码错误 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_auth_logout: {
        parameters: {
            query?: never;
            header: {
                /** @description 已签名的挑战令牌；存在刷新 Cookie 时与 sid 绑定 */
                "X-CSRF-Token": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 登出成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description CSRF 挑战令牌缺失、无效或与会话不匹配 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Redis 会话或撤销服务不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_auth_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户信息 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserInfo"];
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_auth_password_reset_complete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompletePasswordResetRequest"];
            };
        };
        responses: {
            /** @description 密码已重置 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description 参数校验失败 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 重置令牌无效 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_auth_profile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 个人信息 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserProfileResponse"];
                };
            };
        };
    };
    put_auth_profile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateProfileRequest"];
            };
        };
        responses: {
            /** @description 更新成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    put_auth_profile_avatar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["FileUploadForm"];
            };
        };
        responses: {
            /** @description 头像更新成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_AvatarResponse"];
                };
            };
            /** @description 上传内容超过 5 MiB 限制 */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 数据库或对象存储暂不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    put_auth_profile_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordRequest"];
            };
        };
        responses: {
            /** @description 修改成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    post_auth_refresh: {
        parameters: {
            query?: never;
            header: {
                /** @description 与会话绑定的 CSRF 挑战令牌 */
                "X-CSRF-Token": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 刷新成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_LoginResponse"];
                };
            };
            /** @description 令牌无效、已过期、被撤销或确认重放 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description CSRF 挑战令牌缺失、无效或与会话不匹配 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 另一个令牌轮换请求正在处理 */
            409: {
                headers: {
                    /** @description 再次刷新前等待的秒数 */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Redis 会话服务不可用；显式重试必须复用原 X-CSRF-Token */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_auth_ws_ticket: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 一次性 WebSocket 票据 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_WebSocketTicketResponse"];
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Redis 不可用；显式禁用时返回 Retry-After: 60 */
            503: {
                headers: {
                    /** @description 仅 Redis 显式禁用时为 60 秒 */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_common_file_download: {
        parameters: {
            query: {
                /** @description 对象存储中的 key 路径 */
                path: string;
                /** @description bucket 名称（默认 uploads） */
                bucket?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 文件下载 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": number[];
                };
            };
            /** @description 文件或对象不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 对象存储暂不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_common_jobs: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 导出任务列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_ExportJobVo"];
                };
            };
        };
    };
    get_common_jobs_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 导出任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 导出任务详情 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    post_common_jobs_by_id_cancel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 导出任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelExportJobDto"];
            };
        };
        responses: {
            /** @description 导出任务已取消 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    get_common_jobs_by_id_download: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 导出任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 导出文件 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": number[];
                };
            };
        };
    };
    post_common_upload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["FileUploadForm"];
            };
        };
        responses: {
            /** @description 上传成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_UploadResponse"];
                };
            };
            /** @description 上传内容超过 10 MiB 限制 */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 对象存储暂不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_common_upload_avatar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["FileUploadForm"];
            };
        };
        responses: {
            /** @description 头像上传成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_UploadResponse"];
                };
            };
            /** @description 上传内容超过 5 MiB 限制 */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 对象存储暂不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_common_upload_image: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["FileUploadForm"];
            };
        };
        responses: {
            /** @description 图片上传成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_UploadResponse"];
                };
            };
            /** @description 上传内容超过 10 MiB 限制 */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 对象存储暂不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_monitor_cache: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 缓存运行状态 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_CacheInfo"];
                };
            };
        };
    };
    get_monitor_cache_commands: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Redis 命令统计 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_BTreeMap_String_String"];
                };
            };
        };
    };
    get_monitor_db_pool: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 数据库连接池状态 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_DbPoolInfo"];
                };
            };
        };
    };
    get_monitor_jobs: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；省略时采用运行时分页配置。 */
                page?: number;
                /** @description 每页记录数；上限由 `pagination.max_page_size` 决定。 */
                page_size?: number;
                /** @description 按来源计划 ID 精确过滤。 */
                schedule_id?: string;
                /** @description 按任务类型精确过滤。 */
                job_type?: string;
                /** @description 按状态精确过滤：pending、running、succeeded 或 dead。 */
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 后台任务列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_BackgroundJobVo"];
                };
            };
        };
    };
    get_monitor_jobs_stats: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 后台任务队列统计 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_BackgroundJobQueueStats"];
                };
            };
        };
    };
    post_monitor_jobs_by_id_retry: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 后台任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 任务已重新投递 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_BackgroundJobVo"];
                };
            };
            /** @description 任务不存在或不属于当前租户 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 任务不是死信状态或状态已变化 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_monitor_metrics: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Prometheus 指标文本 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description 缺少或无效的监控 Bearer Token */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_monitor_runtime: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 主应用运行时组件状态 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_RuntimeStatus"];
                };
            };
        };
    };
    get_monitor_schedules: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
                name?: string;
                handler_key?: string;
                enabled?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 定时任务列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_JobScheduleVo"];
                };
            };
        };
    };
    post_monitor_schedules: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateScheduleRequest"];
            };
        };
        responses: {
            /** @description 定时任务已创建 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_JobScheduleVo"];
                };
            };
            /** @description 输入无效 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 目标范围越权 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 启用数量超过租户限制 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    post_monitor_schedules_preview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SchedulePreviewRequest"];
            };
        };
        responses: {
            /** @description 未来五次执行时间 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_JobSchedulePreview"];
                };
            };
            /** @description Cron 表达式或时区无效 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_monitor_schedules_targets: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前租户可见的调度目标 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_ScheduleTargetVo"];
                };
            };
        };
    };
    get_monitor_schedules_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 定时任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 定时任务详情 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_JobScheduleVo"];
                };
            };
            /** @description 记录不可见或不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    put_monitor_schedules_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 定时任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateScheduleRequest"];
            };
        };
        responses: {
            /** @description 定时任务已更新 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_JobScheduleVo"];
                };
            };
            /** @description 记录不可见或不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 版本冲突或启用数量超限 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    delete_monitor_schedules_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 定时任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScheduleVersionRequest"];
            };
        };
        responses: {
            /** @description 定时任务已软删除 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description 版本冲突 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_monitor_schedules_by_id_executions: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
                trigger_kind?: string;
                outcome?: string;
                background_job_status?: string;
            };
            header?: never;
            path: {
                /** @description 定时任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 计划执行历史 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_JobScheduleExecutionVo"];
                };
            };
        };
    };
    post_monitor_schedules_by_id_run: {
        parameters: {
            query?: never;
            header: {
                /** @description 立即执行幂等键 */
                "Idempotency-Key": string;
            };
            path: {
                /** @description 定时任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 任务已入队 */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_JobScheduleExecutionVo"];
                };
            };
            /** @description 禁止并发冲突 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    put_monitor_schedules_by_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 定时任务 ID */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateScheduleStatusRequest"];
            };
        };
        responses: {
            /** @description 启停状态已更新 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_JobScheduleVo"];
                };
            };
            /** @description 版本冲突或启用数量超限 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    get_monitor_server: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 服务器 CPU、内存、磁盘信息 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ServerInfo"];
                };
            };
        };
    };
    get_platform_tenants: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 租户列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_TenantVo"];
                };
            };
        };
    };
    post_platform_tenants: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTenantDto"];
            };
        };
        responses: {
            /** @description 租户创建成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantVo"];
                };
            };
        };
    };
    put_platform_tenants_by_tenant_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tenant_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTenantDto"];
            };
        };
        responses: {
            /** @description 租户更新成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_TenantVo"];
                };
            };
        };
    };
    put_platform_tenants_by_tenant_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tenant_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTenantStatusDto"];
            };
        };
        responses: {
            /** @description 租户状态更新成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
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
                "application/json": components["schemas"]["ExportRequestDto"];
            };
        };
        responses: {
            /** @description 参数配置导出任务已创建 */
            202: {
                headers: {
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
                "application/json": components["schemas"]["ExportRequestDto"];
            };
        };
        responses: {
            /** @description 字典类型导出任务已创建 */
            202: {
                headers: {
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
                "application/json": components["schemas"]["ExportRequestDto"];
            };
        };
        responses: {
            /** @description 登录日志导出任务已创建 */
            202: {
                headers: {
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
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_MenuVo"];
                };
            };
        };
    };
    get_system_menus_current: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 用户菜单树 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_MenuTreeNode"];
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
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
            /** @description 会话不存在或不属于当前租户 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Redis 会话服务不可用 */
            503: {
                headers: {
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
                "application/json": components["schemas"]["ExportRequestDto"];
            };
        };
        responses: {
            /** @description 操作日志导出任务已创建 */
            202: {
                headers: {
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
            /** @description 岗位列表 */
            200: {
                headers: {
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
                "application/json": components["schemas"]["ExportRequestDto"];
            };
        };
        responses: {
            /** @description 岗位导出任务已创建 */
            202: {
                headers: {
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
            /** @description 岗位详情 */
            200: {
                headers: {
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
                "application/json": components["schemas"]["ExportRequestDto"];
            };
        };
        responses: {
            /** @description 角色导出任务已创建 */
            202: {
                headers: {
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
            /** @description 角色选项 */
            200: {
                headers: {
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
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
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
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ExportJobVo"];
                };
            };
        };
    };
    post_system_users_import: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["FileUploadForm"];
            };
        };
        responses: {
            /** @description 导入用户 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_UserImportResult"];
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
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiEmptyResponse"];
                };
            };
        };
    };
    post_tools_gen_download: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GenerateOptionsDto"];
            };
        };
        responses: {
            /** @description 下载生成代码 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/zip": number[];
                };
            };
        };
    };
    post_tools_gen_generate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GenerateRequestDto"];
            };
        };
        responses: {
            /** @description 代码生成报告 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_WriteReport"];
                };
            };
        };
    };
    post_tools_gen_preview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GenerateOptionsDto"];
            };
        };
        responses: {
            /** @description 生成结果预览 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_Vec_GeneratedFile"];
                };
            };
        };
    };
    get_tools_gen_tables: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始。 */
                page?: number;
                /** @description 每页记录数，受 `pagination.max_page_size` 限制（默认值为 100）。 */
                page_size?: number;
                table_name?: string;
                table_comment?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 数据库表列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiPageResponse_TableInfo"];
                };
            };
        };
    };
    get_version: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description API 版本与构建信息 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiResponse_ApiVersionInfo"];
                };
            };
        };
    };
    get_livez: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 进程存活 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LivenessResponse"];
                };
            };
        };
    };
    get_readyz: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 后台依赖快照有效且必要依赖可用 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadinessResponse"];
                };
            };
            /** @description 后台依赖快照过期或必要依赖不可用 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadinessResponse"];
                };
            };
        };
    };
}
