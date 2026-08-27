import { get_version } from '@/api/generated/operations/core'
import type { OperationData } from '@/api/contract'

export type ApiVersionInfo = OperationData<'get_version'>

/** 获取无需认证的服务端运行能力。 */
export function getApiVersion() {
  return get_version({ transport: 'raw' })
}
