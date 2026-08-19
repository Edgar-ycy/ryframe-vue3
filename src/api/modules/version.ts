import { requestOperation } from '@/api/operationRequest'
import { get_version } from '@/api/generated/operations'
import type { OperationData } from '@/api/contract'

export type ApiVersionInfo = OperationData<'get_version'>

/** 获取无需认证的服务端运行能力。 */
export function getApiVersion() {
  return requestOperation(get_version, { transport: 'raw' })
}
