import { defineStore } from 'pinia'
import { getApiVersion } from '@/api/modules/version'
import { DEFAULT_TENANT_ID, setTenantId } from '@/utils/auth'

interface RuntimeCapabilitiesState {
  loaded: boolean
  multiTenancyEnabled: boolean
}

let loadingPromise: Promise<void> | undefined

export const useRuntimeCapabilitiesStore = defineStore('runtime-capabilities', {
  state: (): RuntimeCapabilitiesState => ({
    loaded: false,
    multiTenancyEnabled: false,
  }),

  actions: {
    ensureLoaded(): Promise<void> {
      if (this.loaded) return Promise.resolve()
      if (loadingPromise) return loadingPromise

      const pending = getApiVersion()
        .then((response) => {
          if (typeof response.data?.multi_tenancy_enabled !== 'boolean') {
            throw new Error('服务端版本响应缺少 multi_tenancy_enabled')
          }
          this.multiTenancyEnabled = response.data.multi_tenancy_enabled
          // 清理浏览器中残留的历史租户，避免后续验证码等公开请求携带冲突租户头。
          if (!this.multiTenancyEnabled) setTenantId(DEFAULT_TENANT_ID)
          this.loaded = true
        })
        .finally(() => {
          if (loadingPromise === pending) loadingPromise = undefined
        })

      loadingPromise = pending
      return pending
    },
  },
})
