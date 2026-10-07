import { login, type LoginParams } from '@/api/modules/auth'
import { isSessionContext } from '@/api/modules/sessionContext'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { getServerStateRequestContext } from '@/shared/query/client'
import { ensureCsrfToken, invalidateCsrfToken } from './csrf'
import { publishAuthenticatedSession } from './lifecycle'
import { assertSessionEpoch } from './state'

export async function authenticateWithPassword(credentials: LoginParams, tenantId: string) {
  const context = getServerStateRequestContext()
  const csrfToken = await ensureCsrfToken()
  assertSessionEpoch(context.sessionEpoch)
  try {
    const response = await login(credentials, tenantId, csrfToken, context.signal)
    assertSessionEpoch(context.sessionEpoch)
    const authData = response.data
    if (!authData) throw new Error(translate('shell.session.loginResponseMissingAuth'))

    const sessionContext = authData.session_context
    if (
      !authData.access_token ||
      !isSessionContext(sessionContext) ||
      !sessionContext.user.tenant_id
    ) {
      throw new HttpError(translate('shell.session.loginResponseInvalid'), {
        kind: 'invalid_response',
      })
    }

    publishAuthenticatedSession(authData.access_token, sessionContext)
    return response
  } finally {
    // 登录可能已经更新会话 Cookie，即使响应校验失败，下次也必须获取匹配的新挑战。
    invalidateCsrfToken(csrfToken)
  }
}
