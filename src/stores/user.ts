import { defineStore } from 'pinia'
import type { SessionContextUserInfo } from '@/shared/session/contracts'
import type { AppLocale } from '@/i18n'
import type { Id } from '@/shared/http/types'
import { getTenantId } from '@/utils/auth'

export type SessionStatus = 'initializing' | 'authenticated' | 'anonymous' | 'unavailable'

interface UserState {
  token: string
  sessionStatus: SessionStatus
  tenantId: string
  tenantName: string
  userId: Id | ''
  username: string
  nickname: string
  avatar: string
  email: string
  phone: string
  preferredLocale?: AppLocale
  isSuperAdmin: boolean
  roles: string[]
  permissions: string[]
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: '',
    sessionStatus: 'initializing',
    tenantId: getTenantId(),
    tenantName: '',
    userId: '',
    username: '',
    nickname: '',
    avatar: '',
    email: '',
    phone: '',
    preferredLocale: undefined,
    isSuperAdmin: false,
    roles: [],
    permissions: [],
  }),

  getters: {
    isLoggedIn: (state): boolean => !!state.token,
  },

  actions: {
    applyIdentity(
      userInfo: SessionContextUserInfo,
      isSuperAdmin: boolean,
      preferredLocale: AppLocale | undefined,
    ) {
      this.$patch({
        avatar: userInfo.avatar || '',
        email: userInfo.email || '',
        isSuperAdmin,
        nickname: userInfo.nickname || '',
        permissions: userInfo.perms || [],
        phone: userInfo.phone || '',
        preferredLocale,
        roles: userInfo.roles || [],
        tenantId: userInfo.tenant_id,
        tenantName: userInfo.tenant_name || userInfo.tenant_id,
        userId: userInfo.id,
        username: userInfo.username,
      })
    },

    setPreferredLocale(locale: AppLocale | undefined) {
      this.preferredLocale = locale
    },

    resetState() {
      this.$patch({
        avatar: '',
        email: '',
        isSuperAdmin: false,
        nickname: '',
        permissions: [],
        phone: '',
        preferredLocale: undefined,
        roles: [],
        sessionStatus: 'anonymous',
        tenantId: getTenantId(),
        tenantName: '',
        token: '',
        userId: '',
        username: '',
      })
    },
  },
})
