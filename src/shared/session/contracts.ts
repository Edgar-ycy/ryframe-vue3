import type { components } from '@/api/generated/schema'

type SchemaMap = components['schemas']

/** 登录、刷新与 GET /auth/context 共用的原子会话授权快照。 */
export type SessionContext = SchemaMap['SessionContextVo']
export type SessionUser = SessionContext['user']
export type SessionContextUserInfo = SchemaMap['UserInfo']
export type EffectiveSessionCapability = SessionContext['capabilities'][number]
export type TenantBusinessDataContext = SessionContext['business_data']
export type TenantBusinessState = TenantBusinessDataContext['state']
