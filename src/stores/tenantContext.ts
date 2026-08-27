import { defineStore } from 'pinia'
import type {
  EffectiveSessionCapability,
  SessionContext,
  TenantBusinessDataContext,
} from '@/api/modules/sessionContext'

export type TenantContextStatus = 'idle' | 'loading' | 'loaded' | 'failed'

export interface TenantContextState {
  status: TenantContextStatus
  identity: string
  authorizationEpoch: string
  runtimeEpoch: string
  businessData?: TenantBusinessDataContext
  context?: SessionContext
}

function capabilityCodes(capabilities: readonly EffectiveSessionCapability[]): string[] {
  return capabilities.map((capability) => capability.code)
}

function hasCapability(capabilities: readonly EffectiveSessionCapability[], code: string): boolean {
  return capabilities.some((capability) => capability.code === code)
}

function hasCapabilities(
  capabilities: readonly EffectiveSessionCapability[],
  required: readonly string[],
): boolean {
  return required.every((code) => hasCapability(capabilities, code))
}

export const useTenantContextStore = defineStore('tenant-context', {
  state: (): TenantContextState => ({
    status: 'idle',
    identity: '',
    authorizationEpoch: '',
    runtimeEpoch: '',
    businessData: undefined,
    context: undefined,
  }),

  getters: {
    capabilityCodes: (state) =>
      state.status === 'loaded' ? capabilityCodes(state.context?.capabilities ?? []) : [],
    hasCapability:
      (state) =>
      (code: string): boolean =>
        state.status === 'loaded' && hasCapability(state.context?.capabilities ?? [], code),
    hasCapabilities:
      (state) =>
      (codes: readonly string[]): boolean =>
        state.status === 'loaded' && hasCapabilities(state.context?.capabilities ?? [], codes),
    canWriteBusinessData: (state) =>
      state.status === 'loaded' && state.businessData?.state === 'active',
  },

  actions: {
    markLoading(): void {
      this.status = 'loading'
    },

    applyContext(context: SessionContext, identity: string): void {
      this.$patch((state) => {
        state.status = 'loaded'
        state.identity = identity
        state.authorizationEpoch = context.authorization_epoch
        state.runtimeEpoch = context.runtime_epoch
        state.businessData = context.business_data
        state.context = context
      })
    },

    failClosedState(): void {
      this.status = 'failed'
      this.identity = ''
      this.authorizationEpoch = ''
      this.runtimeEpoch = ''
      this.businessData = undefined
      this.context = undefined
    },

    resetState(): void {
      this.status = 'idle'
      this.identity = ''
      this.authorizationEpoch = ''
      this.runtimeEpoch = ''
      this.businessData = undefined
      this.context = undefined
    },
  },
})
