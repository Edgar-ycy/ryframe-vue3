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
    "/api/v1/auth/context": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_auth_context"];
        put?: never;
        post?: never;
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
    "/api/v1/auth/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查询当前用户的登录设备。 */
        get: operations["get_auth_sessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions/revoke-others": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 撤销当前用户除本设备之外的全部登录设备。 */
        post: operations["post_auth_sessions_revoke_others"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions/{sid}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 撤销当前用户的一台登录设备。 */
        delete: operations["delete_auth_sessions_by_sid"];
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
    "/api/v1/common/jobs/deletions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 永久删除当前用户的一批终态导出记录及结果文件。 */
        post: operations["post_common_jobs_deletions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/jobs/notifications/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 将当前用户已经实际看到的导出完成或失败通知标记为已查看。 */
        post: operations["post_common_jobs_notifications_read"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/common/jobs/notifications/unread-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查询当前用户尚未查看的导出完成或失败通知数量。 */
        get: operations["get_common_jobs_notifications_unread_count"];
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
    "/api/v1/profile/service-delegations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_profile_service_delegations"];
        put?: never;
        post: operations["post_profile_service_delegations"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/profile/service-delegations/capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_profile_service_delegations_capabilities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/profile/service-delegations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["delete_profile_service_delegations_by_id"];
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
        AgentCapabilityResponse: {
            key: string;
            method: string;
            path: string;
        };
        AgentDepartmentResponse: {
            id: string;
            name: string;
            parent_id?: string | null;
            status: string;
        };
        AgentDictionaryItemResponse: {
            label: string;
            /** Format: int32 */
            sort: number;
            value: string;
        };
        AgentDictionaryResponse: {
            items: components["schemas"]["AgentDictionaryItemResponse"][];
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
            type_code: string;
        };
        /** @description Agent 只读列表的固定分页参数；未知过滤条件由服务层审计后拒绝。 */
        AgentPageQuery: {
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
        };
        AgentPostResponse: {
            code: string;
            id: string;
            name: string;
            status: string;
        };
        AgentUserResponse: {
            dept_name?: string | null;
            id: string;
            nickname: string;
            status: string;
            username: string;
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
                /** @description 是否允许客户端选择和管理多个租户。 */
                multi_tenancy_enabled: boolean;
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
        ApiResponse_CreatedServiceDelegationVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                delegation: components["schemas"]["ServiceDelegationVo"];
                /** @description 仅首次成功时返回委托令牌；幂等重放为 `null`。 */
                token?: string | null;
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
        ApiResponse_ExportDeletionAcceptedDto: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 服务端已受理的导出记录删除结果。 */
            data?: {
                /** Format: int64 */
                accepted_count: number;
                accepted_ids: string[];
                /** Format: int64 */
                removed_unread_count: number;
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
        ApiResponse_LoginResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                access_token: string;
                expires_in: number;
                session_context: components["schemas"]["SessionContextVo"];
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
        ApiResponse_RevokeOtherSessionsResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 批量撤销其他登录设备的结果。 */
            data?: {
                /** Format: int64 */
                revoked_count: number;
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
        ApiResponse_SessionContextVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 登录、刷新和 GET /auth/context 共用的会话启动快照。 */
            data?: {
                /** @description 控制库授权纪元；避免 JavaScript 精度漂移，所有 epoch 均以十进制字符串输出。 */
                authorization_epoch: string;
                business_data: components["schemas"]["TenantBusinessDataContextVo"];
                capabilities: components["schemas"]["SessionCapabilityVo"][];
                /** @description 仅由后端权威角色标记确定，客户端不得从角色编码或名称推断。 */
                is_super_admin: boolean;
                menus: components["schemas"]["MenuTreeNode"][];
                permissions: string[];
                roles: string[];
                runtime_epoch: string;
                user: components["schemas"]["SessionUserVo"];
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
        ApiResponse_Vec_AuthSessionResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                browser?: string | null;
                current: boolean;
                /** Format: date-time */
                expires_at: string;
                ipaddr: string;
                /** Format: date-time */
                last_access_time: string;
                login_location?: string | null;
                /** Format: date-time */
                login_time: string;
                os?: string | null;
                /** @description 稳定会话标识，只用于精确撤销，不是访问令牌或刷新令牌。 */
                sid: string;
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
        ApiResponse_Vec_ServiceDelegationTargetResponse: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                account_code: string;
                account_id: string;
                account_name: string;
                capabilities: components["schemas"]["ServiceCapabilityVo"][];
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
        ApiResponse_Vec_ServiceDelegationVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        };
        /** @description API 版本与构建信息。 */
        ApiVersionInfo: {
            api_prefix: string;
            endpoints: components["schemas"]["ApiVersionEndpoints"];
            /** @description 是否允许客户端选择和管理多个租户。 */
            multi_tenancy_enabled: boolean;
            name: string;
            source_commit: string;
            version: string;
        };
        /** @description 当前用户可管理的登录设备会话。 */
        AuthSessionResponse: {
            browser?: string | null;
            current: boolean;
            /** Format: date-time */
            expires_at: string;
            ipaddr: string;
            /** Format: date-time */
            last_access_time: string;
            login_location?: string | null;
            /** Format: date-time */
            login_time: string;
            os?: string | null;
            /** @description 稳定会话标识，只用于精确撤销，不是访问令牌或刷新令牌。 */
            sid: string;
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
        AuthorizationDiagnosticVo: {
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
        BackupPointListQuery: {
            /** Format: int64 */
            limit?: number | null;
            /** @description 指定后仅返回该租户 tenant-scope 与目标 shard-scope 恢复点。 */
            tenant_id?: string | null;
        };
        /**
         * @description 数据库平台恢复点的隔离粒度。
         * @enum {string}
         */
        BackupPointScope: "tenant" | "shard";
        /**
         * @description 数据库平台恢复点校验状态。
         * @enum {string}
         */
        BackupPointValidationStatus: "pending" | "valid" | "invalid";
        BackupPointView: {
            /** Format: date-time */
            captured_at: string;
            checksum?: string | null;
            /** Format: date-time */
            expires_at?: string | null;
            id: string;
            /** Format: date-time */
            last_restore_drill_at?: string | null;
            placement_generation?: string | null;
            /** Format: date-time */
            retention_until: string;
            schema_fingerprint: string;
            scope: components["schemas"]["BackupPointScope"];
            target_key: string;
            tenant_id?: string | null;
            validation_status: components["schemas"]["BackupPointValidationStatus"];
        };
        /** @description Redis 命令统计响应。 */
        CacheCommandStats: {
            commands: {
                [key: string]: string;
            };
            status: components["schemas"]["CacheCommandStatsStatus"];
        };
        /**
         * @description Redis 命令统计查询状态。
         *
         *     `not_configured` 表示当前实例没有启用 Redis；`unavailable` 表示 Redis
         *     已配置但连接或查询失败。两种情况下均返回空的 `commands`，避免让调用方
         *     将错误文本误当作命令名称渲染。
         * @enum {string}
         */
        CacheCommandStatsStatus: "available" | "not_configured" | "unavailable";
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
        CapabilityCatalogVo: {
            affects_authorization: boolean;
            client_config_fields: string[];
            code: string;
            conflicts: string[];
            default_admin_permissions: string[];
            dependencies: string[];
            deployment_available: boolean;
            deployment_dependencies: string[];
            description: string;
            name: string;
            permission_codes: string[];
            route_keys: string[];
            variants: components["schemas"]["CapabilityVariantVo"][];
        };
        CapabilityOverrideVo: {
            capability_code: string;
            changed_by?: string | null;
            config: {
                [key: string]: unknown;
            };
            enabled: boolean;
            reason?: string | null;
            /** Format: int32 */
            schema_version: number;
            variant_code: string;
        };
        CapabilityVariantVo: {
            code: string;
            /** Format: int32 */
            schema_version: number;
        };
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
        CompletePasswordResetRequest: {
            new_password: string;
            request_id: string;
            tenant_id?: string | null;
            token: string;
        };
        /** @description 参数配置响应。 */
        ConfigVo: {
            /** Format: date-time */
            created_at: string;
            id: string;
            key: string;
            name: string;
            portable: boolean;
            remark?: string | null;
            value: string;
        };
        CreateServiceDelegationDto: {
            capability_keys: string[];
            /** Format: date-time */
            expires_at?: string | null;
            reason: string;
            service_account_id: string;
        };
        CreatedServiceCredentialVo: {
            credential: components["schemas"]["ServiceCredentialVo"];
            /** @description 仅首次成功时返回完整 API Key；幂等重放为 `null`。 */
            secret?: string | null;
        };
        CreatedServiceDelegationVo: {
            delegation: components["schemas"]["ServiceDelegationVo"];
            /** @description 仅首次成功时返回委托令牌；幂等重放为 `null`。 */
            token?: string | null;
        };
        CsrfResponse: {
            csrf_token: string;
            expires_in: number;
        };
        DataPlacementView: {
            current_target_key: string;
            placement_generation: string;
            state: components["schemas"]["TenantBusinessDataState"];
            tenant_id: string;
            /** Format: date-time */
            updated_at: string;
        };
        DataRetentionCutoff: {
            /** Format: date-time */
            before: string;
            resource: string;
        };
        DataRetentionOverview: {
            /** Format: date-time */
            calculated_at: string;
            cutoffs: components["schemas"]["DataRetentionCutoff"][];
            policy: components["schemas"]["DataRetentionPolicy"];
        };
        DataRetentionPolicy: {
            /** Format: int32 */
            background_job_succeeded_days: number;
            cleanup_batch_size: number;
            dead_background_jobs_permanent: boolean;
            dead_outbox_events_permanent: boolean;
            /** Format: int32 */
            export_job_history_days: number;
            /** Format: int32 */
            login_log_days: number;
            max_rows_per_resource_per_run: number;
            /** Format: int32 */
            operation_log_days: number;
            /** Format: int32 */
            outbox_published_days: number;
            /** Format: int32 */
            retention_run_days: number;
            /** Format: int32 */
            schedule_execution_days: number;
            /** Format: int32 */
            service_access_audit_days: number;
            /** Format: int32 */
            tenant_config_artifact_hours: number;
            /** Format: int32 */
            tenant_config_rollback_hours: number;
            /** Format: int32 */
            user_import_artifact_hours: number;
            /** Format: int32 */
            user_import_history_days: number;
        };
        DataRetentionPreview: {
            /** Format: date-time */
            calculated_at: string;
            cutoffs: components["schemas"]["DataRetentionCutoff"][];
            eligible_counts: {
                [key: string]: number;
            };
            policy: components["schemas"]["DataRetentionPolicy"];
        };
        DataRetentionRunVo: {
            background_job_id: string;
            /** Format: date-time */
            completed_at?: string | null;
            /** Format: date-time */
            created_at: string;
            deleted_counts: unknown;
            eligible_counts: unknown;
            error_summary?: string | null;
            id: string;
            policy_snapshot: unknown;
            remaining_counts: unknown;
            requested_by?: string | null;
            /** Format: date-time */
            started_at?: string | null;
            status: string;
            trigger_kind: string;
            /** Format: date-time */
            updated_at: string;
        };
        DataTargetDetail: components["schemas"]["DataTargetSummary"] & {
            /** Format: date-time */
            last_verified_at?: string | null;
            /** Format: int32 */
            max_total_connections: number;
            open_targets: number;
            opening_targets: number;
            /** Format: int32 */
            reserved_connections: number;
        };
        /**
         * @description 数据目标资格检查用途。
         * @enum {string}
         */
        DataTargetEligibility: "new_tenant" | "migration";
        /**
         * @description 数据目标健康快照。
         * @enum {string}
         */
        DataTargetHealth: "unknown" | "verified" | "unavailable";
        /**
         * @description 数据目标连接来源。
         * @enum {string}
         */
        DataTargetKind: "control" | "mysql";
        DataTargetListQuery: {
            eligible_for?: null | components["schemas"]["DataTargetEligibility"];
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
            q?: string | null;
            tenant_id?: string | null;
        };
        /**
         * @description 数据目标占用模式。
         * @enum {string}
         */
        DataTargetMode: "shared" | "dedicated";
        DataTargetSummary: {
            active_leases: number;
            connected: boolean;
            display_name?: string | null;
            eligible: boolean;
            health: components["schemas"]["DataTargetHealth"];
            key: string;
            kind: components["schemas"]["DataTargetKind"];
            mode: components["schemas"]["DataTargetMode"];
            /** Format: int32 */
            pool_max_connections?: number | null;
            reasons: string[];
            region?: string | null;
            schema_fingerprint?: string | null;
        };
        DbPoolInfo: {
            /** Format: int64 */
            active_connections?: number | null;
            status: string;
            timestamp: string;
        };
        /** @description 单删与批删共用的导出记录删除命令。 */
        DeleteExportJobsDto: {
            ids: string[];
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
        /**
         * @description 有效能力配置的来源。
         * @enum {string}
         */
        EffectiveCapabilitySource: "plan" | "override" | "none";
        EffectiveCapabilityVo: {
            capability_code: string;
            config?: {
                [key: string]: unknown;
            } | null;
            deployment_enabled: boolean;
            enabled: boolean;
            entitled: boolean;
            name: string;
            /** Format: int32 */
            schema_version?: number | null;
            source: components["schemas"]["EffectiveCapabilitySource"];
            variant_code?: string | null;
        };
        /** @description 不携带业务字段的写操作请求体。 */
        EmptyRequestDto: Record<string, never>;
        /** @description 服务端已受理的导出记录删除结果。 */
        ExportDeletionAcceptedDto: {
            /** Format: int64 */
            accepted_count: number;
            accepted_ids: string[];
            /** Format: int64 */
            removed_unread_count: number;
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
        FileUploadForm: {
            file: number[];
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
            /** Format: date-time */
            calculated_at: string;
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
            session_context: components["schemas"]["SessionContextVo"];
        };
        /** @description 确认当前用户已经实际看到的导出完成或失败通知。 */
        MarkExportNotificationsReadDto: {
            ids: string[];
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
        /** @description 菜单响应。 */
        MenuVo: {
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
        MigrationImpact: {
            catalog_table_count: number;
            /** Format: int32 */
            retention_hours: number;
            rollback_boundary: string;
            stop_write: boolean;
        };
        MigrationItemView: {
            cleanup_row_count: string;
            cleanup_state: components["schemas"]["TenantDataMigrationCleanupState"];
            /** Format: int32 */
            copy_order: number;
            cursor?: unknown;
            error_code?: string | null;
            id: string;
            source_digest?: string | null;
            source_row_count?: string | null;
            state: components["schemas"]["TenantDataMigrationItemState"];
            table_name: string;
            target_digest?: string | null;
            target_row_count?: string | null;
        };
        MigrationListQuery: {
            /** Format: int64 */
            limit?: number | null;
        };
        MigrationPreview: {
            blockers: string[];
            eligible: boolean;
            expected_placement_generation: string;
            impact: components["schemas"]["MigrationImpact"];
            plan_hash: string;
            source_target_key: string;
            target_generation: string;
            target_target_key: string;
            tenant_id: string;
            warnings: string[];
        };
        MigrationView: {
            action_reasons: string[];
            /** Format: date-time */
            activated_at?: string | null;
            can_cancel: boolean;
            can_finalize: boolean;
            cancel_requested: boolean;
            /** Format: date-time */
            cancelled_at?: string | null;
            /** Format: date-time */
            copy_completed_at?: string | null;
            /** Format: date-time */
            copy_started_at?: string | null;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            cut_over_at?: string | null;
            error_code?: string | null;
            /** Format: date-time */
            failed_at?: string | null;
            finalize_requested: boolean;
            /** Format: date-time */
            finalized_at?: string | null;
            /** Format: date-time */
            frozen_at?: string | null;
            id: string;
            items: components["schemas"]["MigrationItemView"][];
            operator_id: string;
            plan_hash: string;
            /** Format: date-time */
            prechecked_at?: string | null;
            /** Format: date-time */
            queued_at?: string | null;
            /** Format: date-time */
            quiesced_at?: string | null;
            /** Format: int32 */
            retention_hours: number;
            /** Format: date-time */
            retention_until?: string | null;
            source_generation: string;
            source_schema_fingerprint: string;
            source_target_key: string;
            state: components["schemas"]["TenantDataMigrationState"];
            /** Format: date-time */
            succeeded_at?: string | null;
            target_generation: string;
            target_schema_fingerprint: string;
            target_target_key: string;
            tenant_id: string;
            /** Format: date-time */
            updated_at: string;
            /** Format: date-time */
            verified_at?: string | null;
        };
        MonitorOverviewDatabasePoolVo: {
            /** Format: int64 */
            active_connections?: number | null;
            status: string;
        };
        MonitorOverviewDependenciesVo: {
            database: components["schemas"]["MonitorOverviewDependencyVo"];
            messaging: components["schemas"]["MonitorOverviewDependencyVo"];
            object_storage: components["schemas"]["MonitorOverviewDependencyVo"];
            redis: components["schemas"]["MonitorOverviewDependencyVo"];
        };
        MonitorOverviewDependencyVo: {
            configured: boolean;
            detail?: string | null;
            status: string;
        };
        MonitorOverviewJobsVo: {
            /** Format: int64 */
            dead: number;
            /** Format: int64 */
            enabled_schedules: number;
            mode: string;
            /** Format: int64 */
            pending: number;
            /** Format: int64 */
            ready: number;
            /** Format: int64 */
            running: number;
            /** Format: double */
            schedule_lag_seconds: number;
            scheduler_enabled: boolean;
            /** Format: int64 */
            succeeded: number;
            /** Format: int64 */
            total: number;
        };
        MonitorOverviewSystemVo: {
            cpu_cores: number;
            /** Format: float */
            cpu_usage: number;
            hostname: string;
            /** Format: float */
            memory_usage: number;
            os: string;
            process_id: string;
            process_status: string;
            /** Format: double */
            total_memory_gb: number;
            /** Format: int64 */
            uptime_seconds: number;
            /** Format: double */
            used_memory_gb: number;
        };
        MonitorOverviewTrendBucketVo: {
            /** Format: int64 */
            background_jobs_created: number;
            /** Format: int64 */
            login_failure: number;
            /** Format: int64 */
            login_success: number;
            /** Format: int64 */
            operation_failure: number;
            /** Format: int64 */
            operation_success: number;
            /** Format: int64 */
            schedule_enqueued: number;
            /** Format: int64 */
            schedule_invalid_configuration: number;
            /** Format: int64 */
            schedule_skipped_concurrency: number;
            /** Format: int64 */
            schedule_skipped_misfire: number;
            /** Format: int64 */
            schedule_target_unavailable: number;
            /** Format: date-time */
            started_at: string;
        };
        MonitorOverviewTrendsVo: {
            /** Format: int32 */
            bucket_seconds: number;
            buckets: components["schemas"]["MonitorOverviewTrendBucketVo"][];
            /** Format: date-time */
            calculated_at: string;
            range: string;
        };
        MonitorOverviewVo: {
            /** Format: date-time */
            calculated_at: string;
            database_pool: components["schemas"]["MonitorOverviewDatabasePoolVo"];
            dependencies: components["schemas"]["MonitorOverviewDependenciesVo"];
            jobs: components["schemas"]["MonitorOverviewJobsVo"];
            system: components["schemas"]["MonitorOverviewSystemVo"];
        };
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
        OverviewTrendQuery: {
            range?: string;
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
            perm_type: components["schemas"]["PermissionType"];
            /** Format: int32 */
            sort: number;
            status: string;
        };
        PostListQuery: {
            code?: string | null;
            name?: string | null;
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
            status?: string | null;
        };
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
        ProductCapabilityChangeVo: {
            after: components["schemas"]["EffectiveCapabilityVo"];
            before: components["schemas"]["EffectiveCapabilityVo"];
            capability_code: string;
        };
        ProductCapabilityVo: {
            capability_code: string;
            config: {
                [key: string]: unknown;
            };
            /** Format: int32 */
            schema_version: number;
            variant_code: string;
        };
        ProductChangePreviewVo: {
            capability_additions: string[];
            capability_changes: components["schemas"]["ProductCapabilityChangeVo"][];
            capability_removals: string[];
            current: components["schemas"]["ProductContextVo"];
            menu_additions: string[];
            menu_removals: string[];
            permission_additions: string[];
            permission_removals: string[];
            plan_hash: string;
            runtime_epoch: string;
            target: components["schemas"]["ProductContextVo"];
            tenant_id: string;
            warnings: string[];
        };
        ProductContextVo: {
            capabilities: components["schemas"]["EffectiveCapabilityVo"][];
            overrides: components["schemas"]["CapabilityOverrideVo"][];
            plan_key: string;
            plan_name: string;
            /** Format: int32 */
            plan_version: number;
            plan_version_id: string;
            runtime_epoch: string;
            tenant_id: string;
        };
        /**
         * @description 产品套餐是否允许被使用。Wire value 沿用控制库既有的 `0`/`1`。
         * @enum {string}
         */
        ProductPlanStatus: "0" | "1";
        /**
         * @description 产品套餐版本生命周期。
         * @enum {string}
         */
        ProductPlanVersionStatus: "draft" | "published" | "retired";
        ProductPlanVersionVo: {
            capabilities: components["schemas"]["ProductCapabilityVo"][];
            created_by: string;
            description?: string | null;
            id: string;
            name: string;
            /** Format: date-time */
            published_at?: string | null;
            published_by?: string | null;
            status: components["schemas"]["ProductPlanVersionStatus"];
            /** Format: int32 */
            version: number;
        };
        ProductPlanVo: {
            created_by: string;
            description?: string | null;
            id: string;
            key: string;
            name: string;
            status: components["schemas"]["ProductPlanStatus"];
            versions: components["schemas"]["ProductPlanVersionVo"][];
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
        /** @description 数据保留运行记录分页参数。 */
        RetentionRunPageQuery: {
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
        };
        /** @description 批量撤销其他登录设备的结果。 */
        RevokeOtherSessionsResponse: {
            /** Format: int64 */
            revoked_count: number;
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
        RuntimeJobsStatus: {
            mode: string;
            scheduler_enabled: boolean;
        };
        RuntimeRedisStatus: {
            configured: boolean;
            connected: boolean;
        };
        RuntimeStatus: {
            database: components["schemas"]["RuntimeDatabaseStatus"];
            jobs: components["schemas"]["RuntimeJobsStatus"];
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
        ScheduleTargetVo: {
            available: boolean;
            display_name: string;
            handler_key: string;
            job_type: string;
            scope: string;
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
        ServiceAccessAuditVo: {
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
        };
        ServiceAccountDetailVo: {
            account: components["schemas"]["ServiceAccountVo"];
            role_ids: string[];
        };
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
        ServiceCapabilityVo: {
            delegated: boolean;
            direct: boolean;
            key: string;
            permission: string;
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
        ServiceDelegationTargetResponse: {
            account_code: string;
            account_id: string;
            account_name: string;
            capabilities: components["schemas"]["ServiceCapabilityVo"][];
        };
        ServiceDelegationVo: {
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
        };
        /** @description 服务账号、委托与访问审计共用的分页参数。 */
        ServiceResourcePageQuery: {
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
        };
        SessionCapabilityVo: {
            client_config: {
                [key: string]: unknown;
            };
            code: string;
            /** Format: int32 */
            schema_version: number;
            variant: string;
        };
        /** @description 登录、刷新和 GET /auth/context 共用的会话启动快照。 */
        SessionContextVo: {
            /** @description 控制库授权纪元；避免 JavaScript 精度漂移，所有 epoch 均以十进制字符串输出。 */
            authorization_epoch: string;
            business_data: components["schemas"]["TenantBusinessDataContextVo"];
            capabilities: components["schemas"]["SessionCapabilityVo"][];
            /** @description 仅由后端权威角色标记确定，客户端不得从角色编码或名称推断。 */
            is_super_admin: boolean;
            menus: components["schemas"]["MenuTreeNode"][];
            permissions: string[];
            roles: string[];
            runtime_epoch: string;
            user: components["schemas"]["SessionUserVo"];
        };
        SessionProductContextVo: {
            authorization_epoch: string;
            capabilities: components["schemas"]["SessionCapabilityVo"][];
            runtime_epoch: string;
        };
        /** @description 会话身份，仅包含稳定身份与展示字段；授权集合只存在于 SessionContext 顶层。 */
        SessionUserVo: {
            avatar?: string | null;
            dept_name?: string | null;
            email: string;
            id: string;
            nickname: string;
            phone: string;
            preferred_locale?: string | null;
            tenant_id: string;
            tenant_name: string;
            username: string;
        };
        /** @description 租户后台运行状态汇总。 */
        TenantAuxiliaryUsageVo: {
            /** Format: int64 */
            active_user_imports: number;
            cron_enabled: boolean;
            /** Format: int64 */
            dead_jobs: number;
            /** Format: int64 */
            enabled_schedules: number;
            /** Format: int64 */
            pending_jobs: number;
            /** Format: int64 */
            running_jobs: number;
        };
        TenantBusinessDataContextVo: {
            placement_generation: string;
            state: components["schemas"]["TenantBusinessDataState"];
        };
        /**
         * @description 租户业务数据控制面状态。
         * @enum {string}
         */
        TenantBusinessDataState: "provisioning" | "active" | "maintenance" | "failed";
        /** @description 平台租户容量分页查询参数。 */
        TenantCapacityPageQuery: {
            capacity_status?: null | components["schemas"]["TenantCapacityStatusFilter"];
            expiration_status?: null | components["schemas"]["TenantExpirationStatusFilter"];
            /** @description 按租户名称模糊搜索。 */
            name?: string | null;
            /**
             * Format: int64
             * @description 页码，从 1 开始；省略时为 1。
             */
            page?: number | null;
            /**
             * Format: int64
             * @description 每页记录数，省略时为 20，最大为 100。
             */
            page_size?: number | null;
            status?: null | components["schemas"]["TenantStatusFilter"];
            /** @description 按租户标识模糊搜索。 */
            tenant_id?: string | null;
        };
        /**
         * @description 租户容量状态筛选。
         * @enum {string}
         */
        TenantCapacityStatusFilter: "normal" | "warning" | "critical" | "exceeded" | "unlimited" | "unknown";
        /** @description 平台租户分页与详情响应。 */
        TenantCapacityVo: {
            /** @description 调用者没有 `tenant:usage:list` 权限时为 `None`。 */
            capacity_status?: string | null;
            domain?: string | null;
            expiration_status: string;
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
            /** @description 对外统一使用 `enabled` 或 `disabled`。 */
            status: string;
            tenant_id: string;
            usage?: null | components["schemas"]["TenantUsageVo"];
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
        /** @description 配置包的安全公开视图，不包含对象路径或数据库内部标识。 */
        TenantConfigBundleVo: {
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
        /** @description 配置包与配置迁移分页查询。 */
        TenantConfigPageQuery: {
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
        };
        /** @description 配置迁移预览和执行的逐项安全结果。 */
        TenantConfigTransferItemVo: {
            action: string;
            detail?: string | null;
            detail_code?: string | null;
            display_name: string;
            outcome: string;
            resource_type: string;
            stable_key: string;
        };
        /** @description 一次目标租户配置预览、应用或回滚的公开视图。 */
        TenantConfigTransferVo: {
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
        /**
         * @description 单表源数据清理检查点状态。
         * @enum {string}
         */
        TenantDataMigrationCleanupState: "pending" | "cleaning" | "cleaned";
        /**
         * @description 单表复制与校验检查点状态。
         * @enum {string}
         */
        TenantDataMigrationItemState: "pending" | "copying" | "copied" | "verifying" | "verified" | "failed";
        /**
         * @description 停写迁移状态机。
         * @enum {string}
         */
        TenantDataMigrationState: "prechecking" | "queued" | "quiescing" | "frozen" | "copying" | "verifying" | "cutting_over" | "activating" | "succeeded" | "retention_pending" | "finalized" | "failed" | "cancelled";
        /**
         * @description 租户到期状态筛选。
         * @enum {string}
         */
        TenantExpirationStatusFilter: "active" | "expiring" | "expired" | "never";
        /** @description 单项租户配额用量。 */
        TenantQuotaUsageVo: {
            /**
             * Format: int64
             * @description `None` 表示该资源不受配额限制。
             */
            limit?: number | null;
            /**
             * Format: int32
             * @description 使用率基点，10000 表示 100%；无限制时为 `None`。
             */
            percentage_basis_points?: number | null;
            status: string;
            /** Format: int64 */
            used: number;
        };
        /** @description 租户当前请求限流窗口用量。 */
        TenantRequestWindowUsageVo: {
            /**
             * Format: int64
             * @description Redis 不可用时为 `None`。
             */
            current?: number | null;
            /**
             * Format: int64
             * @description `None` 表示租户请求限流未启用。
             */
            limit?: number | null;
            /** Format: int32 */
            percentage_basis_points?: number | null;
            /**
             * Format: int64
             * @description Redis 不可用时为 `None`。
             */
            remaining_secs?: number | null;
            status: string;
        };
        /**
         * @description 租户启停状态筛选。
         * @enum {string}
         */
        TenantStatusFilter: "enabled" | "disabled";
        /** @description 租户容量与当前窗口用量。 */
        TenantUsageVo: {
            auxiliary: components["schemas"]["TenantAuxiliaryUsageVo"];
            /** Format: date-time */
            calculated_at: string;
            request_window: components["schemas"]["TenantRequestWindowUsageVo"];
            roles: components["schemas"]["TenantQuotaUsageVo"];
            storage: components["schemas"]["TenantQuotaUsageVo"];
            tenant_id: string;
            users: components["schemas"]["TenantQuotaUsageVo"];
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
        UpdateProfileRequest: {
            email?: string | null;
            nickname: string;
            phone?: string | null;
            /** @description 用户界面和服务端消息的语言偏好；空值表示使用请求语言或系统默认语言。 */
            preferred_locale?: string | null;
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
            department?: null | components["schemas"]["DeptVo"];
            roles: components["schemas"]["RoleBriefVo"][];
        };
        UserImportJobVo: {
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
        /** @description 用户导入任务分页查询。 */
        UserImportPageQuery: {
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
            status?: string | null;
        };
        /** @description 用户导入异常行分页查询。 */
        UserImportRowPageQuery: {
            /** Format: int64 */
            page?: number | null;
            /** Format: int64 */
            page_size?: number | null;
        };
        UserImportRowVo: {
            code: string;
            /** Format: date-time */
            created_at: string;
            message: string;
            outcome: string;
            /** Format: int32 */
            row_number: number;
            username: string;
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
    get_auth_context: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前原子会话上下文 */
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
                    "application/json": components["schemas"]["ApiResponse_SessionContextVo"];
                };
            };
            /** @description 未认证或会话失效 */
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
            /** @description 控制库上下文暂不可用 */
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
            /** @description 登录设备数量已达到安全上限 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 会话元数据或 Redis 服务不可用 */
            503: {
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
                    "application/json": components["schemas"]["ApiResponse_AvatarResponse"];
                };
            };
            /** @description 上传内容超过 5 MiB 限制 */
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
            /** @description 数据库或对象存储暂不可用 */
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
    get_auth_sessions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前用户的登录设备 */
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
                    "application/json": components["schemas"]["ApiResponse_Vec_AuthSessionResponse"];
                };
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
            /** @description 会话服务不可用 */
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
    post_auth_sessions_revoke_others: {
        parameters: {
            query?: never;
            header: {
                /** @description 与当前访问会话绑定的 CSRF 挑战令牌 */
                "X-CSRF-Token": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyRequestDto"];
            };
        };
        responses: {
            /** @description 其他会话已撤销 */
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
                    "application/json": components["schemas"]["ApiResponse_RevokeOtherSessionsResponse"];
                };
            };
            /** @description 可治理的会话候选超过单次安全上限 */
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
            /** @description CSRF 挑战令牌无效 */
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
            /** @description 会话服务不可用 */
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
    delete_auth_sessions_by_sid: {
        parameters: {
            query?: never;
            header: {
                /** @description 与当前访问会话绑定的 CSRF 挑战令牌 */
                "X-CSRF-Token": string;
            };
            path: {
                /** @description 稳定的设备会话标识 */
                sid: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 会话已撤销 */
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
            /** @description CSRF 挑战令牌无效 */
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
            /** @description 会话不存在或不属于当前用户 */
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
            /** @description 会话服务不可用 */
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
                    "application/json": components["schemas"]["ApiResponse_WebSocketTicketResponse"];
                };
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
            /** @description 实时消息通道不可用；客户端应回退到收件箱轮询 */
            503: {
                headers: {
                    /** @description 再次申请票据前至少等待 60 秒 */
                    "Retry-After"?: string;
                    /** @description 本次响应所依据的租户授权纪元 */
                    "X-Authorization-Epoch"?: string;
                    /** @description 固定值 unavailable，标识受控的实时通道降级 */
                    "X-RyFrame-Realtime"?: string;
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
                    "application/octet-stream": number[];
                };
            };
            /** @description 文件或对象不存在 */
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
            /** @description 对象存储暂不可用 */
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
                    "application/json": components["schemas"]["ApiResponse_Vec_ExportJobVo"];
                };
            };
        };
    };
    post_common_jobs_deletions: {
        parameters: {
            query?: never;
            header: {
                /** @description 必填幂等键 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeleteExportJobsDto"];
            };
        };
        responses: {
            /** @description 导出记录删除已受理 */
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
                    "application/json": components["schemas"]["ApiResponse_ExportDeletionAcceptedDto"];
                };
            };
            /** @description 任一任务不存在或不属于当前用户 */
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
            /** @description 任一任务仍在排队、执行或持有活动租约 */
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
        };
    };
    post_common_jobs_notifications_read: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MarkExportNotificationsReadDto"];
            };
        };
        responses: {
            /** @description 已查看的导出通知数量 */
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
    get_common_jobs_notifications_unread_count: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 未读导出通知数量 */
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
                    "application/json": components["schemas"]["ApiResponse_Vec_UploadResponse"];
                };
            };
            /** @description 上传内容超过 10 MiB 限制 */
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
            /** @description 对象存储暂不可用 */
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
                    "application/json": components["schemas"]["ApiResponse_Vec_UploadResponse"];
                };
            };
            /** @description 上传内容超过 5 MiB 限制 */
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
            /** @description 对象存储暂不可用 */
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
                    "application/json": components["schemas"]["ApiResponse_Vec_UploadResponse"];
                };
            };
            /** @description 上传内容超过 10 MiB 限制 */
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
            /** @description 对象存储暂不可用 */
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
    get_profile_service_delegations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前用户本人创建的委托 */
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
                    "application/json": components["schemas"]["ApiResponse_Vec_ServiceDelegationVo"];
                };
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
    post_profile_service_delegations: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateServiceDelegationDto"];
            };
        };
        responses: {
            /** @description 委托已创建；令牌只显示一次 */
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
                    "application/json": components["schemas"]["ApiResponse_CreatedServiceDelegationVo"];
                };
            };
            /** @description 参数、能力或幂等键无效 */
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
            /** @description 能力不是双方共同拥有或账号不可委托 */
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
            /** @description 幂等键冲突 */
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
    get_profile_service_delegations_capabilities: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前用户与服务账号共同可委托的编译期能力 */
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
                    "application/json": components["schemas"]["ApiResponse_Vec_ServiceDelegationTargetResponse"];
                };
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
    delete_profile_service_delegations_by_id: {
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
            /** @description 本人委托已撤销 */
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
            /** @description 只能撤销本人委托 */
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
