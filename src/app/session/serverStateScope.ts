import type { SessionContext } from '@/shared/session/contracts'
import { transitionServerStateScope } from '@/shared/query/client'

/** 将权威会话上下文归一成服务端状态范围；令牌轮换本身不改变范围。 */
export function transitionAuthenticatedServerState(
  context: SessionContext,
  applyProjection: () => void,
  options: { force?: boolean } = {},
): boolean {
  return transitionServerStateScope(
    {
      tenantId: context.user.tenant_id,
      subjectId: String(context.user.id),
      authorizationFingerprint: authorizationFingerprint(context),
    },
    applyProjection,
    options,
  )
}

function authorizationFingerprint(context: SessionContext): string {
  return JSON.stringify({
    authorizationEpoch: context.authorization_epoch,
    businessData: context.business_data,
    capabilities: [...context.capabilities].sort((left, right) =>
      left.code.localeCompare(right.code),
    ),
    isSuperAdmin: context.is_super_admin,
    menus: context.menus,
    permissions: [...context.permissions].sort(),
    roles: [...context.roles].sort(),
    runtimeEpoch: context.runtime_epoch,
  })
}
