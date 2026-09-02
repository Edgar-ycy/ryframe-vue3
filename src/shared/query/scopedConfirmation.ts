import { beginServerStatePageOperation, type ServerStatePageOperation } from './pageOperationScope'

export type RequestServerStateConfirmation = () => Promise<boolean>
export type OwnsServerStateOperation = () => boolean
export type ValidateServerStateOperation = () => Promise<boolean | void>

async function approveServerStatePageOperation(
  requestApproval: ValidateServerStateOperation,
  ownsOperation: OwnsServerStateOperation,
): Promise<ServerStatePageOperation | undefined> {
  const operation = beginServerStatePageOperation()
  if ((await requestApproval()) === false) return undefined
  return operation.isCurrent(ownsOperation) ? operation : undefined
}

/**
 * 在确认框出现前捕获完整服务端状态范围。确认期间若身份、租户、授权代次或
 * 页面 ownership 变化，则将确认结果视为过期，不允许调用方继续发起请求。
 */
export async function confirmServerStatePageOperation(
  requestConfirmation: RequestServerStateConfirmation,
  ownsOperation: OwnsServerStateOperation = () => true,
): Promise<ServerStatePageOperation | undefined> {
  return approveServerStatePageOperation(requestConfirmation, ownsOperation)
}

/** 在异步表单校验前捕获完整范围，过期表单不得继续构造或发送写请求。 */
export async function validateServerStatePageOperation(
  validate: ValidateServerStateOperation,
  ownsOperation: OwnsServerStateOperation = () => true,
): Promise<ServerStatePageOperation | undefined> {
  return approveServerStatePageOperation(validate, ownsOperation)
}
