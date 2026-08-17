import { defineStore } from 'pinia'
import { login as loginApi, type UserInfo } from '@/api/modules/auth'
import { ensureCsrfToken, publishAuthenticatedSession } from '@/app/session/sessionCoordinator'
import type { Id } from '@/shared/http/types'
import { getTenantId, setTenantId } from '@/utils/auth'
import { clearServerState } from '@/shared/query/client'
import { normalizeLocale, translate, type AppLocale } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'

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
    roles: [],
    permissions: [],
  }),

  getters: {
    isAdmin: (state): boolean => state.roles.includes('admin'),
    isSuper: (state): boolean => state.roles.includes('admin') || state.permissions.includes('*:*:*'),
    isLoggedIn: (state): boolean => !!state.token,
  },

  actions: {
    async login(
      username: string,
      password: string,
      tenantId: string,
      captchaId?: string,
      captchaCode?: string,
    ) {
      const csrfToken = await ensureCsrfToken()
      const res = await loginApi(
        { username, password, captcha_id: captchaId, captcha_code: captchaCode },
        tenantId,
        csrfToken,
      )
      const authData = res.data
      if (!authData) throw new Error(translate('shell.session.loginResponseMissingAuth'))
      const context = authData.session_context

      if (!authData.access_token || !context?.user.tenant_id) {
        throw new Error(translate('shell.session.loginResponseMissingTenant'))
      }

      clearServerState()
      publishAuthenticatedSession(authData.access_token, context)
      return res
    },

    applyUserInfo(userInfo: UserInfo) {
      if (this.userId !== userInfo.id || this.tenantId !== userInfo.tenant_id) {
        clearServerState()
      }
      this.tenantId = userInfo.tenant_id
      this.tenantName = userInfo.tenant_name || userInfo.tenant_id
      setTenantId(userInfo.tenant_id)
      this.userId = userInfo.id
      this.username = userInfo.username
      this.nickname = userInfo.nickname || ''
      this.email = userInfo.email || ''
      this.phone = userInfo.phone || ''
      this.avatar = userInfo.avatar || ''
      const preferredLocale = getPreferredLocale(userInfo)
      this.preferredLocale = preferredLocale
      if (preferredLocale) useSettingsStore().setLocale(preferredLocale)
      this.roles = userInfo.roles || []
      this.permissions = userInfo.perms || []
    },

    setPreferredLocale(locale: AppLocale | undefined) {
      this.preferredLocale = locale
    },

    resetState() {
      this.token = ''
      this.sessionStatus = 'anonymous'
      this.tenantId = getTenantId()
      this.tenantName = ''
      this.userId = ''
      this.username = ''
      this.nickname = ''
      this.avatar = ''
      this.email = ''
      this.phone = ''
      this.preferredLocale = undefined
      this.roles = []
      this.permissions = []
    },
  },
})

function getPreferredLocale(userInfo: UserInfo): AppLocale | undefined {
  return normalizeLocale((userInfo as UserInfo & { preferred_locale?: unknown }).preferred_locale)
}
