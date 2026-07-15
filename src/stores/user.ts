import { defineStore } from 'pinia'
import { getUserInfo, login as loginApi, logout as logoutApi } from '@/api/modules/auth'
import { getTenantId, getToken, removeTenantId, removeToken, setRefreshToken, setTenantId, setToken } from '@/utils/auth'
import { usePermissionStore } from '@/stores/permission'
import { useTagsViewStore } from '@/stores/tagsView'

interface UserState {
  token: string
  tenantId: string
  tenantName: string
  userId: number | string
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
    token: getToken() || '',
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
      const res = await loginApi(
        { username, password, captcha_id: captchaId, captcha_code: captchaCode },
        tenantId,
      ) as any
      const authData = res.data || res
      const userInfo = authData.user_info

      if (!authData.access_token || !userInfo?.tenant_id) {
        throw new Error('登录响应缺少租户信息')
      }

      this.token = authData.access_token
      setToken(authData.access_token)
      this.tenantId = userInfo.tenant_id
      this.tenantName = userInfo.tenant_name || userInfo.tenant_id
      setTenantId(userInfo.tenant_id)

      if (authData.refresh_token) {
        setRefreshToken(authData.refresh_token)
      }

      this.userId = userInfo.id
      this.username = userInfo.username
      this.nickname = userInfo.nickname
      this.email = userInfo.email || ''
      this.phone = userInfo.phone || ''
      this.avatar = userInfo.avatar || ''
      this.roles = userInfo.roles || []
      this.permissions = userInfo.perms || []
      return res
    },

    async getUserInfo() {
      const res = await getUserInfo() as any
      const d = res.data || res
      if (d) {
        if (d.tenant_id) {
          this.tenantId = d.tenant_id
          this.tenantName = d.tenant_name || d.tenant_id
          setTenantId(d.tenant_id)
        }
        this.userId = d.id
        this.username = d.username
        this.nickname = d.nickname
        this.email = d.email || ''
        this.phone = d.phone || ''
        this.avatar = d.avatar || ''
        this.roles = d.roles || []
        this.permissions = d.perms || []
      }
      return res
    },

    async logout() {
      try {
        await logoutApi()
      } catch {
        // ignore
      }
      await this.clearClientState()
    },

    async clearClientState() {
      this.resetState()
      usePermissionStore().resetRoutes()
      useTagsViewStore().closeAllViews()
      removeToken()
      removeTenantId()
      const { resetDynamicRoutes } = await import('@/router')
      resetDynamicRoutes()
    },

    resetState() {
      this.token = ''
      this.tenantId = 'system'
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
