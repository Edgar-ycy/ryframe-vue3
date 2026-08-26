import { defineStore } from 'pinia'

interface RuntimeCapabilitiesState {
  loaded: boolean
  multiTenancyEnabled: boolean
}

export const useRuntimeCapabilitiesStore = defineStore('runtime-capabilities', {
  state: (): RuntimeCapabilitiesState => ({
    loaded: false,
    multiTenancyEnabled: false,
  }),

  actions: {
    apply(multiTenancyEnabled: boolean): void {
      this.multiTenancyEnabled = multiTenancyEnabled
      this.loaded = true
    },
  },
})
