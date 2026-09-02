import { ElMessage } from 'element-plus'
import type { AuthSession } from '@/api/modules/auth'
import { ensureCsrfToken } from '@/app/session/sessionCoordinator'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import type { ServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { OwnsServerStateOperation } from '@/shared/query/scopedConfirmation'
import { authSessionQueryKey } from './authSessionSupport'

/** 在 CSRF 获取和重试边界重复校验页面与完整会话范围。 */
export async function withAuthSessionCsrfRetry<T>(
  operation: ServerStatePageOperation,
  ownsOperation: OwnsServerStateOperation,
  execute: (csrfToken: string) => Promise<T>,
): Promise<T> {
  const csrfToken = await ensureCsrfToken()
  operation.assertCurrent(ownsOperation)
  try {
    return await execute(csrfToken)
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 403) throw error
    operation.assertCurrent(ownsOperation)
    const renewedCsrfToken = await ensureCsrfToken(true)
    operation.assertCurrent(ownsOperation)
    return execute(renewedCsrfToken)
  }
}

/** 仅允许仍拥有操作的页面更新对应完整范围下的会话缓存。 */
export async function removeCachedAuthSession(
  operation: ServerStatePageOperation,
  ownsOperation: OwnsServerStateOperation,
  sid: string,
): Promise<void> {
  operation.assertCurrent(ownsOperation)
  const key = authSessionQueryKey(operation.scope)
  await queryClient.cancelQueries({ queryKey: key, exact: true })
  operation.assertCurrent(ownsOperation)
  queryClient.setQueryData<AuthSession[]>(
    key,
    (current) => current?.filter((session) => session.sid !== sid) ?? [],
  )
}

export function reportAuthSessionWriteError(error: unknown): void {
  if (error instanceof HttpError && error.kind === 'cancelled') return
  if (error instanceof HttpError && error.status === 503) {
    ElMessage.error(translate('profile.sessions.serviceUnavailable'))
    return
  }
  ElMessage.error(
    error instanceof Error && error.message ? error.message : translate('shell.http.requestFailed'),
  )
}
