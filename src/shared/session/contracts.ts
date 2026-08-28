import type { ApiSchema, OperationData } from '@/api/contract'

type GeneratedSessionContext = OperationData<'get_auth_context'>

/** 登录、刷新与 GET /auth/context 共用的原子会话授权快照。 */
export type SessionContext = GeneratedSessionContext & { is_super_admin: boolean }
export type SessionUser = SessionContext['user']
export type SessionContextUserInfo = ApiSchema<'UserInfo'>
export type EffectiveSessionCapability = SessionContext['capabilities'][number]
export type TenantBusinessDataContext = SessionContext['business_data']
export type TenantBusinessState = TenantBusinessDataContext['state']
