import { logoutSession } from '@/app/session/sessionCoordinator'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'

/** 确认框打开前固定完整会话范围，过期确认不得注销后来切换到的新身份。 */
export async function confirmAndLogoutCurrentSession(
  requestConfirmation: () => Promise<boolean>,
): Promise<boolean> {
  const operation = await confirmServerStatePageOperation(requestConfirmation)
  if (!operation) return false
  operation.assertCurrent()
  await logoutSession()
  return true
}
