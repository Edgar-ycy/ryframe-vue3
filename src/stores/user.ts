import { defineStore } from 'pinia'
import { login as loginApi, type UserInfo } from '@/api/modules/auth'
import { isSessionContext } from '@/api/modules/sessionContext'
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

      if (!authData.access_token || !isSessionContext(context) || !context.user.tenant_id) {
        throw new Error(translate('shell.session.loginResponseMissingTenant'))
      }

      clearServerState()
      publishAuthenticatedSession(authData.access_token, context)
      return res
    },

    applyUserInfo(userInfo: UserInfo, isSuperAdmin: boolean) {
      if (this.userId !== userInfo.id || this.tenantId !== userInfo.tenant_id) {
        clearServerState()
      }
      setTenantId(userInfo.tenant_id)
      const preferredLocale = getPreferredLocale(userInfo)
      if (preferredLocale) useSettingsStore().setLocale(preferredLocale)
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

function getPreferredLocale(userInfo: UserInfo): AppLocale | undefined {
  return normalizeLocale((userInfo as UserInfo & { preferred_locale?: unknown }).preferred_locale)
}
