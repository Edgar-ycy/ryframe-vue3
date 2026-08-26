import { getApiVersion } from '@/api/modules/version'
import { useRuntimeCapabilitiesStore } from '@/stores/runtimeCapabilities'
import { DEFAULT_TENANT_ID, setTenantId } from '@/utils/auth'

let loadingPromise: Promise<void> | undefined

/** 合并并发探测，由应用层协调 API、被动 Store 与本地租户状态。 */
export function ensureRuntimeCapabilitiesLoaded(): Promise<void> {
  const capabilities = useRuntimeCapabilitiesStore()
  if (capabilities.loaded) return Promise.resolve()
  if (loadingPromise) return loadingPromise

  const pending = getApiVersion()
    .then((response) => {
      if (typeof response.data?.multi_tenancy_enabled !== 'boolean') {
        throw new Error('服务端版本响应缺少 multi_tenancy_enabled')
      }
      capabilities.apply(response.data.multi_tenancy_enabled)
      // 清理浏览器中残留的历史租户，避免公开请求携带冲突租户头。
      if (!capabilities.multiTenancyEnabled) setTenantId(DEFAULT_TENANT_ID)
    })
    .finally(() => {
      if (loadingPromise === pending) loadingPromise = undefined
    })

  loadingPromise = pending
  return pending
}
