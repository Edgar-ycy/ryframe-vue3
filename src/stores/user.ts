import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi, getUserInfo } from '@/api/modules/auth'
import { getToken, setToken, removeToken, setRefreshToken, removeTenantId } from '@/utils/auth'
import { usePermissionStore } from '@/stores/permission'
import { useTagsViewStore } from '@/stores/tagsView'

interface UserState {
  token: string
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
    isLoggedIn: (state): boolean => !!state.token,
  },

  actions: {
    /** 登录 */
    async login(username: string, password: string, captchaId?: string, captchaCode?: string) {
      const res = await loginApi({ username, password, captcha_id: captchaId, captcha_code: captchaCode }) as any
      const authData = res.data || res
      this.token = authData.access_token
      setToken(authData.access_token)
      if (authData.refresh_token) {
        setRefreshToken(authData.refresh_token)
      }
      const userInfo = authData.user_info
      if (userInfo) {
        this.userId = userInfo.id
        this.username = userInfo.username
        this.nickname = userInfo.nickname
        this.email = userInfo.email || ''
        this.phone = userInfo.phone || ''
        this.avatar = userInfo.avatar || ''
        this.roles = userInfo.roles || []
        this.permissions = userInfo.perms || userInfo.permissions || []
      }
      return res
    },

    /** 获取用户信息 */
    async getUserInfo() {
      const res = await getUserInfo() as any
      const d = res.data || res
      if (d) {
        this.userId = d.id
        this.username = d.username
        this.nickname = d.nickname
        this.email = d.email || ''
        this.phone = d.phone || ''
        this.avatar = d.avatar || ''
        this.roles = d.roles || []
        // 后端可能返回 perms 或 permissions 字段，两者都尝试读取
        this.permissions = d.perms || d.permissions || []
      }
      return res
    },

    /** 登出 */
    async logout() {
      try { await logoutApi() } catch { /* ignore */ }
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

    /** 重置状态 */
    resetState() {
      this.token = ''
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
