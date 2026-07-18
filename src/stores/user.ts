import { defineStore } from 'pinia'
import { getUserInfo, login as loginApi, type UserInfo } from '@/api/modules/auth'
import { ensureCsrfToken, publishAuthenticatedSession } from '@/app/session/sessionCoordinator'
import type { Id } from '@/shared/http/types'
import { getTenantId, setTenantId } from '@/utils/auth'

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
      if (!authData) throw new Error('登录响应缺少认证数据')
      const userInfo = authData.user_info

      if (!authData.access_token || !userInfo?.tenant_id) {
        throw new Error('登录响应缺少租户信息')
      }

      this.token = authData.access_token
      this.sessionStatus = 'authenticated'
      this.tenantId = userInfo.tenant_id
      this.tenantName = userInfo.tenant_name || userInfo.tenant_id
      setTenantId(userInfo.tenant_id)

      this.userId = userInfo.id
      this.username = userInfo.username
      this.nickname = userInfo.nickname || ''
      this.email = userInfo.email || ''
      this.phone = userInfo.phone || ''
      this.avatar = userInfo.avatar || ''
      this.roles = userInfo.roles || []
      this.permissions = userInfo.perms || []
      publishAuthenticatedSession(authData.access_token, userInfo)
      return res
    },

    async getUserInfo() {
      const res = await getUserInfo()
      if (!res.data) throw new Error('用户信息响应缺少数据')
      this.applyUserInfo(res.data)
      return res
    },

    applyUserInfo(userInfo: UserInfo) {
      this.tenantId = userInfo.tenant_id
      this.tenantName = userInfo.tenant_name || userInfo.tenant_id
      setTenantId(userInfo.tenant_id)
      this.userId = userInfo.id
      this.username = userInfo.username
      this.nickname = userInfo.nickname || ''
      this.email = userInfo.email || ''
      this.phone = userInfo.phone || ''
      this.avatar = userInfo.avatar || ''
      this.roles = userInfo.roles || []
      this.permissions = userInfo.perms || []
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
      this.roles = []
      this.permissions = []
    },
  },
})
