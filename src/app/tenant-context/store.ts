import { defineStore } from 'pinia'
import {
  type SessionContext,
  type TenantBusinessDataContext,
} from '@/api/modules/sessionContext'
import {
  capabilityCodes,
  hasCapabilities,
  hasCapability,
} from './capability'

export type TenantContextStatus = 'idle' | 'loading' | 'loaded' | 'failed'

export interface TenantContextState {
  status: TenantContextStatus
  identity: string
  authorizationEpoch: string
  runtimeEpoch: string
  businessData?: TenantBusinessDataContext
  context?: SessionContext
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
    capabilityCodes: state => state.status === 'loaded'
      ? capabilityCodes(state.context?.capabilities ?? [])
      : [],
    hasCapability: state => (code: string): boolean => state.status === 'loaded'
      && hasCapability(state.context?.capabilities ?? [], code),
    hasCapabilities: state => (codes: readonly string[]): boolean => state.status === 'loaded'
      && hasCapabilities(state.context?.capabilities ?? [], codes),
    canWriteBusinessData: state => state.status === 'loaded'
      && state.businessData?.state === 'active',
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
