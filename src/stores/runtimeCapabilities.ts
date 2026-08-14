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
    multiTenancyEnabled: true,
  }),

  actions: {
    ensureLoaded(): Promise<void> {
      if (this.loaded) return Promise.resolve()
      if (loadingPromise) return loadingPromise

      const pending = getApiVersion()
        .then((response) => {
          // 旧版本服务端没有此字段时继续启用多租户，避免误隐藏已有功能。
          this.multiTenancyEnabled = response.data?.multi_tenancy_enabled !== false
          // 清理浏览器中残留的历史租户，避免后续验证码等公开请求携带冲突租户头。
          if (!this.multiTenancyEnabled) setTenantId(DEFAULT_TENANT_ID)
        })
        .catch(() => {
          // 运行能力不可用时保持兼容模式，不阻断登录和导航。
          this.multiTenancyEnabled = true
        })
        .finally(() => {
          this.loaded = true
          if (loadingPromise === pending) loadingPromise = undefined
        })

      loadingPromise = pending
      return pending
    },
  },
})
