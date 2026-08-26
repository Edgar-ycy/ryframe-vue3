import { login, type LoginParams } from '@/api/modules/auth'
import { isSessionContext } from '@/api/modules/sessionContext'
import { translate } from '@/i18n'
import { clearServerState } from '@/shared/query/client'
import { ensureCsrfToken } from './csrf'
import { publishAuthenticatedSession } from './lifecycle'

export async function authenticateWithPassword(credentials: LoginParams, tenantId: string) {
  const csrfToken = await ensureCsrfToken()
  const response = await login(credentials, tenantId, csrfToken)
  const authData = response.data
  if (!authData) throw new Error(translate('shell.session.loginResponseMissingAuth'))

  const context = authData.session_context
  if (!authData.access_token || !isSessionContext(context) || !context.user.tenant_id) {
    throw new Error(translate('shell.session.loginResponseMissingTenant'))
  }

  clearServerState()
  publishAuthenticatedSession(authData.access_token, context)
  return response
}
