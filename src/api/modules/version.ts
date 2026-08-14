import { rawRequest } from '@/shared/http/client'

export interface ApiVersionInfo {
  multi_tenancy_enabled?: boolean
}

/** 获取无需认证的服务端运行能力。 */
export function getApiVersion() {
  return rawRequest<ApiVersionInfo>({
    url: '/version',
    method: 'get',
    skipAuthRefresh: true,
    skipTenantHeader: true,
  })
}
