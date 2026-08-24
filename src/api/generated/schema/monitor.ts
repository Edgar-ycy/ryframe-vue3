/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export interface paths {
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
    "/api/v1/monitor/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_overview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/overview/trends": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_overview_trends"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/retention": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_retention"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/retention/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_monitor_retention_preview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/retention/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post_monitor_retention_run"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monitor/retention/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_monitor_retention_runs"];
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
        ApiPageResponse_DataRetentionRunVo: {
            /** Format: int32 */
            code: number;
            data: components["schemas"]["PageData_DataRetentionRunVo"];
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
        ApiResponse_CacheCommandStats: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            /** @description Redis 命令统计响应。 */
            data?: {
                commands: {
                    [key: string]: string;
                };
                status: components["schemas"]["CacheCommandStatsStatus"];
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
        ApiResponse_DataRetentionOverview: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                /** Format: date-time */
                calculated_at: string;
                cutoffs: components["schemas"]["DataRetentionCutoff"][];
                policy: components["schemas"]["DataRetentionPolicy"];
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
        ApiResponse_DataRetentionPreview: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                /** Format: date-time */
                calculated_at: string;
                cutoffs: components["schemas"]["DataRetentionCutoff"][];
                eligible_counts: {
                    [key: string]: number;
                };
                policy: components["schemas"]["DataRetentionPolicy"];
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
        ApiResponse_DataRetentionRunVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
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
                /** Format: date-time */
                calculated_at: string;
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
        ApiResponse_MonitorOverviewTrendsVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                /** Format: int32 */
                bucket_seconds: number;
                buckets: components["schemas"]["MonitorOverviewTrendBucketVo"][];
                /** Format: date-time */
                calculated_at: string;
                range: string;
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
        ApiResponse_MonitorOverviewVo: {
            /**
             * Format: int32
             * @description 与 HTTP 状态码一致的业务结果码。
             */
            code: number;
            data?: {
                /** Format: date-time */
                calculated_at: string;
                database_pool: components["schemas"]["MonitorOverviewDatabasePoolVo"];
                dependencies: components["schemas"]["MonitorOverviewDependenciesVo"];
                jobs: components["schemas"]["MonitorOverviewJobsVo"];
                system: components["schemas"]["MonitorOverviewSystemVo"];
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
                jobs: components["schemas"]["RuntimeJobsStatus"];
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
        /**
         * @description Redis 命令统计查询状态。
         *
         *     `not_configured` 表示当前实例没有启用 Redis；`unavailable` 表示 Redis
         *     已配置但连接或查询失败。两种情况下均返回空的 `commands`，避免让调用方
         *     将错误文本误当作命令名称渲染。
         * @enum {string}
         */
        CacheCommandStatsStatus: "available" | "not_configured" | "unavailable";
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
        /** @enum {string} */
        ConcurrencyPolicyDto: "forbid" | "allow";
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
        DataRetentionCutoff: {
            /** Format: date-time */
            before: string;
            resource: string;
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
        /** @description 不携带业务字段的写操作请求体。 */
        EmptyRequestDto: Record<string, never>;
        JobScheduleOccurrence: {
            schedule_time: string;
            /** Format: date-time */
            utc: string;
        };
        /** @enum {string} */
        MisfirePolicyDto: "skip" | "fire_once";
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
        PageData_DataRetentionRunVo: {
            items: {
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
        RuntimeStorageStatus: {
            backend: string;
            connected: boolean;
            endpoint?: string | null;
        };
        SchedulePreviewRequest: {
            cron_expression: string;
            timezone: string;
        };
        ScheduleVersionRequest: {
            /** Format: int64 */
            version: number;
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
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_CacheCommandStats"];
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_BackgroundJobVo"];
                };
            };
            /** @description 任务不存在或不属于当前租户 */
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
            /** @description 任务不是死信状态或状态已变化 */
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
    get_monitor_overview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前租户运维快照 */
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
                    "application/json": components["schemas"]["ApiResponse_MonitorOverviewVo"];
                };
            };
        };
    };
    get_monitor_overview_trends: {
        parameters: {
            query?: {
                range?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前租户补零后的 UTC 趋势桶 */
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
                    "application/json": components["schemas"]["ApiResponse_MonitorOverviewTrendsVo"];
                };
            };
        };
    };
    get_monitor_retention: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前有效保留策略 */
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
                    "application/json": components["schemas"]["ApiResponse_DataRetentionOverview"];
                };
            };
        };
    };
    post_monitor_retention_preview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyRequestDto"];
            };
        };
        responses: {
            /** @description 预计可清理数量 */
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
                    "application/json": components["schemas"]["ApiResponse_DataRetentionPreview"];
                };
            };
        };
    };
    post_monitor_retention_run: {
        parameters: {
            query?: never;
            header: {
                /** @description 人工清理幂等键 */
                "Idempotency-Key": string;
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
            /** @description 清理任务已入队 */
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
                    "application/json": components["schemas"]["ApiResponse_DataRetentionRunVo"];
                };
            };
        };
    };
    get_monitor_retention_runs: {
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
            /** @description 数据保留运行记录 */
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
                    "application/json": components["schemas"]["ApiPageResponse_DataRetentionRunVo"];
                };
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_JobScheduleVo"];
                };
            };
            /** @description 输入无效 */
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
            /** @description 目标范围越权 */
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
            /** @description 启用数量超过租户限制 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_JobSchedulePreview"];
                };
            };
            /** @description Cron 表达式或时区无效 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_JobScheduleVo"];
                };
            };
            /** @description 记录不可见或不存在 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_JobScheduleVo"];
                };
            };
            /** @description 记录不可见或不存在 */
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
            /** @description 版本冲突或启用数量超限 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_JobScheduleExecutionVo"];
                };
            };
            /** @description 禁止并发冲突 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_JobScheduleVo"];
                };
            };
            /** @description 版本冲突或启用数量超限 */
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
                    /** @description 本次响应所依据的租户授权纪元 */
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
                    "application/json": components["schemas"]["ApiResponse_ServerInfo"];
                };
            };
        };
    };
}
