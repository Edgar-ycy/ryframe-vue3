import { login, type LoginParams } from '@/api/modules/auth'
import { isSessionContext } from '@/api/modules/sessionContext'
import { translate } from '@/i18n'
import { getServerStateRequestContext } from '@/shared/query/client'
import { ensureCsrfToken } from './csrf'
import { publishAuthenticatedSession } from './lifecycle'
import { assertSessionEpoch } from './state'

export async function authenticateWithPassword(credentials: LoginParams, tenantId: string) {
  const context = getServerStateRequestContext()
  const csrfToken = await ensureCsrfToken()
  assertSessionEpoch(context.sessionEpoch)
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
    throw new Error(translate('shell.session.loginResponseMissingTenant'))
  }

  publishAuthenticatedSession(authData.access_token, sessionContext)
  return response
}
