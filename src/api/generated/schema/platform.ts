/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export interface paths {
    "/api/v1/platform/capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_capabilities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/data-targets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_data_targets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/data-targets/{target_key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_data_targets_by_target_key"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/data-targets/{target_key}/backup-points": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_data_targets_by_target_key_backup_points"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/product-plans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_product_plans"];
        put?: never;
        post: operations["post_platform_product_plans"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/product-plans/{plan_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_product_plans_by_plan_id"];
        put: operations["put_platform_product_plans_by_plan_id"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/product-plans/{plan_id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_product_plans_by_plan_id_versions"];
        put?: never;
        post: operations["post_platform_product_plans_by_plan_id_versions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/product-plans/{plan_id}/versions/{version}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["put_platform_product_plans_by_plan_id_versions_by_version_draft"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/product-plans/{plan_id}/versions/{version}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_platform_product_plans_by_plan_id_versions_by_version_publish"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/product-plans/{plan_id}/versions/{version}/retire": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_platform_product_plans_by_plan_id_versions_by_version_retire"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenant-data-migrations/{migration_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_tenant_data_migrations_by_migration_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenant-data-migrations/{migration_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_platform_tenant_data_migrations_by_migration_id_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenant-data-migrations/{migration_id}/finalize": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_platform_tenant_data_migrations_by_migration_id_finalize"];
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
    "/api/v1/platform/tenants/page": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_tenants_page"];
        put?: never;
        post?: never;
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
        get: operations["get_platform_tenants_by_tenant_id"];
        put: operations["put_platform_tenants_by_tenant_id"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants/{tenant_id}/data-migration-previews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_platform_tenants_by_tenant_id_data_migration_previews"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants/{tenant_id}/data-migrations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_tenants_by_tenant_id_data_migrations"];
        put?: never;
        post: operations["post_platform_tenants_by_tenant_id_data_migrations"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants/{tenant_id}/data-placement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_tenants_by_tenant_id_data_placement"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants/{tenant_id}/product-change-previews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_platform_tenants_by_tenant_id_product_change_previews"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants/{tenant_id}/product-changes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_platform_tenants_by_tenant_id_product_changes"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/tenants/{tenant_id}/product-context": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_tenants_by_tenant_id_product_context"];
        put?: never;
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
    "/api/v1/platform/tenants/{tenant_id}/usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_platform_tenants_by_tenant_id_usage"];
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
        ApiPageResponse_DataTargetSummary: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_DataTargetSummary"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_ProductPlanVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_ProductPlanVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一分页 API 响应结构。 */
        ApiPageResponse_TenantCapacityVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_TenantCapacityVo"];
            details?: unknown;
            error_key?: string | null;
            message: string;
            request_id: string;
        };
        /** @description 统一 API 响应结构。 */
        ApiResponse_DataPlacementView: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                current_target_key: string;
                placement_generation: string;
                state: components["schemas"]["TenantBusinessDataState"];
                tenant_id: string;
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
        ApiResponse_DataTargetDetail: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: components["schemas"]["DataTargetSummary"] & {
                /** Format: date-time */
                last_verified_at?: string | null;
                /** Format: int32 */
                max_total_connections: number;
                open_targets: number;
                opening_targets: number;
                /** Format: int32 */
                reserved_connections: number;
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
        ApiResponse_MigrationPreview: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        ApiResponse_MigrationView: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        ApiResponse_ProductChangePreviewVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        ApiResponse_ProductContextVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        ApiResponse_ProductPlanVersionVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        ApiResponse_ProductPlanVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                created_by: string;
                description?: string | null;
                id: string;
                key: string;
                name: string;
                status: components["schemas"]["ProductPlanStatus"];
                versions: components["schemas"]["ProductPlanVersionVo"][];
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
        ApiResponse_TenantCapacityVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 平台租户分页与详情响应。 */
            data?: {
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
        ApiResponse_TenantUsageVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description 租户容量与当前窗口用量。 */
            data?: {
                auxiliary: components["schemas"]["TenantAuxiliaryUsageVo"];
                /** Format: date-time */
                calculated_at: string;
                request_window: components["schemas"]["TenantRequestWindowUsageVo"];
                roles: components["schemas"]["TenantQuotaUsageVo"];
                storage: components["schemas"]["TenantQuotaUsageVo"];
                tenant_id: string;
                users: components["schemas"]["TenantQuotaUsageVo"];
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
        ApiResponse_Vec_BackupPointView: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        ApiResponse_Vec_CapabilityCatalogVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        ApiResponse_Vec_MigrationView: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        ApiResponse_Vec_ProductPlanVersionVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
        CapabilityOverrideDto: {
            capability_code: string;
            config: {
                [key: string]: unknown;
            };
            enabled: boolean;
            /** Format: int32 */
            schema_version: number;
            variant_code: string;
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
        CapabilitySnapshotDto: {
            capability_code: string;
            config: {
                [key: string]: unknown;
            };
            /** Format: int32 */
            schema_version: number;
            variant_code: string;
        };
        CapabilityVariantVo: {
            code: string;
            /** Format: int32 */
            schema_version: number;
        };
        CreateMigrationDto: {
            expected_placement_generation: string;
            plan_hash: string;
            target_key: string;
        };
        CreateProductPlanDto: {
            description?: string | null;
            key: string;
            name: string;
        };
        CreateProductPlanVersionDto: {
            capabilities: components["schemas"]["CapabilitySnapshotDto"][];
            description?: string | null;
            name: string;
        };
        CreateTenantDto: {
            admin_password: string;
            admin_username: string;
            /** @description 初始租户数据目标稳定键。 */
            data_target_key: string;
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
            /** @description 已发布产品套餐版本 ID；为避免 JavaScript 精度损失使用十进制字符串。 */
            plan_version_id: string;
            tenant_id: string;
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
        MigrationPreviewDto: {
            expected_placement_generation: string;
            target_key: string;
        };
        /** @description 分页接口的业务数据。 */
        PageData_DataTargetSummary: {
            items: {
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
        PageData_ProductPlanVo: {
            items: {
                created_by: string;
                description?: string | null;
                id: string;
                key: string;
                name: string;
                status: components["schemas"]["ProductPlanStatus"];
                versions: components["schemas"]["ProductPlanVersionVo"][];
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
        PageData_TenantCapacityVo: {
            items: {
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
        ProductChangeApplyDto: {
            overrides?: components["schemas"]["CapabilityOverrideDto"][];
            plan_hash: string;
            plan_version_id: string;
            preview_runtime_epoch: string;
            reason?: string | null;
        };
        ProductChangePreviewDto: {
            overrides?: components["schemas"]["CapabilityOverrideDto"][];
            plan_version_id: string;
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
        /**
         * @description 租户业务数据控制面状态。
         * @enum {string}
         */
        TenantBusinessDataState: "provisioning" | "active" | "maintenance" | "failed";
        /**
         * @description 租户容量状态筛选。
         * @enum {string}
         */
        TenantCapacityStatusFilter: "normal" | "warning" | "critical" | "exceeded" | "unlimited" | "unknown";
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
        UpdateProductPlanDto: {
            description?: string | null;
            name: string;
            status: components["schemas"]["ProductPlanStatus"];
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
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    get_platform_capabilities: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_Vec_CapabilityCatalogVo"];
                };
            };
        };
    };
    get_platform_data_targets: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
                /** @description 省略时只返回缓存健康快照；向导可指定 new_tenant 或 migration 做资格检查。 */
                eligible_for?: components["schemas"]["DataTargetEligibility"];
                tenant_id?: string;
                q?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiPageResponse_DataTargetSummary"];
                };
            };
            /** @description 非 system 租户或缺少权限 */
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
    get_platform_data_targets_by_target_key: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                target_key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_DataTargetDetail"];
                };
            };
            /** @description 目标不存在 */
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
    get_platform_data_targets_by_target_key_backup_points: {
        parameters: {
            query?: {
                /** @description 指定后仅返回该租户 tenant-scope 与目标 shard-scope 恢复点。 */
                tenant_id?: string;
                limit?: number;
            };
            header?: never;
            path: {
                target_key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_Vec_BackupPointView"];
                };
            };
            /** @description 目标不存在 */
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
    get_platform_product_plans: {
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
                    "application/json": components["schemas"]["ApiPageResponse_ProductPlanVo"];
                };
            };
        };
    };
    post_platform_product_plans: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProductPlanDto"];
            };
        };
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductPlanVo"];
                };
            };
            /** @description 参数无效 */
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
            /** @description 缺少平台套餐创建权限 */
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
            /** @description 套餐 key 冲突 */
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
    get_platform_product_plans_by_plan_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductPlanVo"];
                };
            };
        };
    };
    put_platform_product_plans_by_plan_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateProductPlanDto"];
            };
        };
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductPlanVo"];
                };
            };
            /** @description 参数无效 */
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
            /** @description 缺少平台套餐编辑权限 */
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
            /** @description 套餐不存在 */
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
            /** @description 套餐状态冲突 */
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
    get_platform_product_plans_by_plan_id_versions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_Vec_ProductPlanVersionVo"];
                };
            };
        };
    };
    post_platform_product_plans_by_plan_id_versions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProductPlanVersionDto"];
            };
        };
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductPlanVersionVo"];
                };
            };
            /** @description 能力快照无效 */
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
            /** @description 缺少平台套餐创建权限 */
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
            /** @description 套餐不存在 */
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
            /** @description 版本冲突 */
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
    put_platform_product_plans_by_plan_id_versions_by_version_draft: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: string;
                version: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProductPlanVersionDto"];
            };
        };
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductPlanVersionVo"];
                };
            };
            /** @description 能力快照无效 */
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
            /** @description 缺少平台套餐编辑权限 */
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
            /** @description 套餐版本不存在 */
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
            /** @description 版本非 draft */
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
    post_platform_product_plans_by_plan_id_versions_by_version_publish: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: string;
                version: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductPlanVersionVo"];
                };
            };
            /** @description 能力依赖、冲突或 schema 无效 */
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
            /** @description 缺少发布权限 */
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
            /** @description 套餐版本不存在 */
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
            /** @description 版本非 draft */
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
            /** @description 部署依赖不可用 */
            501: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
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
    post_platform_product_plans_by_plan_id_versions_by_version_retire: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: string;
                version: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductPlanVersionVo"];
                };
            };
            /** @description 缺少发布权限 */
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
            /** @description 套餐版本不存在 */
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
            /** @description 版本非 published 或仍被竞态分配 */
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
    get_platform_tenant_data_migrations_by_migration_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                migration_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_MigrationView"];
                };
            };
            /** @description 迁移不存在 */
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
    post_platform_tenant_data_migrations_by_migration_id_cancel: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                migration_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_MigrationView"];
                };
            };
            /** @description 迁移不存在 */
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
            /** @description 已经越过取消边界或幂等键冲突 */
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
    post_platform_tenant_data_migrations_by_migration_id_finalize: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                migration_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_MigrationView"];
                };
            };
            /** @description 迁移不存在 */
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
            /** @description 保留期、备份资格或幂等键冲突 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_Vec_TenantVo"];
                };
            };
        };
    };
    post_platform_tenants: {
        parameters: {
            query?: never;
            header: {
                /** @description 必填，16–128 位可见 ASCII；持久绑定租户创建 Saga */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTenantDto"];
            };
        };
        responses: {
            /** @description 租户创建或同参数幂等续跑成功 */
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
                    "application/json": components["schemas"]["ApiResponse_TenantVo"];
                };
            };
            /** @description 幂等键、租户、套餐版本或数据目标参数无效 */
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
            /** @description 缺少租户创建权限 */
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
            /** @description 套餐版本或数据目标不存在 */
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
            /** @description 幂等参数不一致或租户操作冲突 */
            409: {
                headers: {
                    /** @description 存在可重试冲突时的等待秒数 */
                    "Retry-After"?: string;
                    /** @description 本次响应所依据的租户授权纪元 */
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
            /** @description 套餐要求的部署能力不可用 */
            501: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
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
            /** @description 目标数据库不可用 */
            503: {
                headers: {
                    /** @description 再次尝试前等待的秒数 */
                    "Retry-After"?: string;
                    /** @description 本次响应所依据的租户授权纪元 */
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
    get_platform_tenants_page: {
        parameters: {
            query?: {
                /** @description 页码，从 1 开始；省略时为 1。 */
                page?: number;
                /** @description 每页记录数，省略时为 20，最大为 100。 */
                page_size?: number;
                /** @description 按租户标识模糊搜索。 */
                tenant_id?: string;
                /** @description 按租户名称模糊搜索。 */
                name?: string;
                /** @description 按租户启停状态筛选。 */
                status?: components["schemas"]["TenantStatusFilter"];
                /** @description 按到期状态筛选。 */
                expiration_status?: components["schemas"]["TenantExpirationStatusFilter"];
                /** @description 按容量状态筛选；调用者还必须具有 `tenant:usage:list` 权限。 */
                capacity_status?: components["schemas"]["TenantCapacityStatusFilter"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 平台租户分页列表 */
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
                    "application/json": components["schemas"]["ApiPageResponse_TenantCapacityVo"];
                };
            };
            /** @description 分页或筛选参数无效 */
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
            /** @description 不是系统租户、缺少租户列表权限，或没有容量筛选权限 */
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
    get_platform_tenants_by_tenant_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 租户标识 */
                tenant_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 平台租户详情 */
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
                    "application/json": components["schemas"]["ApiResponse_TenantCapacityVo"];
                };
            };
            /** @description 租户标识无效 */
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
            /** @description 不是系统租户或缺少租户列表权限 */
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
            /** @description 租户不存在 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_TenantVo"];
                };
            };
        };
    };
    post_platform_tenants_by_tenant_id_data_migration_previews: {
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
                "application/json": components["schemas"]["MigrationPreviewDto"];
            };
        };
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_MigrationPreview"];
                };
            };
            /** @description placement generation 已变化 */
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
            /** @description 租户数据维护中；响应含 Retry-After */
            423: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
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
            /** @description 目标不可用；响应含 Retry-After */
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
    get_platform_tenants_by_tenant_id_data_migrations: {
        parameters: {
            query?: {
                limit?: number;
            };
            header?: never;
            path: {
                tenant_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_Vec_MigrationView"];
                };
            };
        };
    };
    post_platform_tenants_by_tenant_id_data_migrations: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                tenant_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateMigrationDto"];
            };
        };
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_MigrationView"];
                };
            };
            /** @description 计划、代际、幂等键或租约冲突 */
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
            /** @description 租户数据维护中；响应含 Retry-After */
            423: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
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
            /** @description 目标不可用；响应含 Retry-After */
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
    get_platform_tenants_by_tenant_id_data_placement: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tenant_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_DataPlacementView"];
                };
            };
            /** @description placement 不存在 */
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
    post_platform_tenants_by_tenant_id_product_change_previews: {
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
                "application/json": components["schemas"]["ProductChangePreviewDto"];
            };
        };
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductChangePreviewVo"];
                };
            };
            /** @description 目标套餐、override 或 schema 无效 */
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
            /** @description 缺少套餐分配或能力覆盖权限 */
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
            /** @description 租户或套餐版本不存在 */
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
            /** @description 目标版本不可分配 */
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
            /** @description 部署能力不可用 */
            501: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
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
    post_platform_tenants_by_tenant_id_product_changes: {
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
                "application/json": components["schemas"]["ProductChangeApplyDto"];
            };
        };
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductContextVo"];
                };
            };
            /** @description 目标套餐、override 或 schema 无效 */
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
            /** @description 缺少套餐分配或能力覆盖权限 */
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
            /** @description 租户或套餐版本不存在 */
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
            /** @description runtime_epoch、计划哈希、租约或版本状态冲突 */
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
            /** @description 部署能力不可用 */
            501: {
                headers: {
                    /** @description 本次响应所依据的租户授权纪元 */
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
    get_platform_tenants_by_tenant_id_product_context: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tenant_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
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
                    "application/json": components["schemas"]["ApiResponse_ProductContextVo"];
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
            /** @description provisioning 状态必须由创建 Saga 完成，不能直接切换 */
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
    get_platform_tenants_by_tenant_id_usage: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 租户标识 */
                tenant_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 租户容量与当前请求窗口用量 */
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
                    "application/json": components["schemas"]["ApiResponse_TenantUsageVo"];
                };
            };
            /** @description 租户标识无效 */
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
            /** @description 不是系统租户或缺少租户用量查看权限 */
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
            /** @description 租户不存在 */
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
}
