import { onActivated, onDeactivated, ref, watch } from 'vue'
import { getProfile, type ProfileInfo, type ProfileUpdateParams } from '@/api/modules/auth'
import { normalizeLocale } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import {
  getServerStateScope,
  isServerStateScopeCurrent,
  useServerStateScope,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'

type Translate = (key: string) => string

interface ScopedProfile {
  profile: ProfileInfo
  scope: ServerStateScope
}

function emptyProfile(): ProfileInfo {
  return {
    user_id: '',
    username: '',
    nickname: '',
    email: '',
    phone: '',
    avatar: '',
    created_at: '',
    dept_name: '',
    permissions: [],
    roles: [],
    status: '',
  }
}

export function useProfileManagement(t: Translate) {
  const userStore = useUserStore()
  const settingsStore = useSettingsStore()
  const serverStateScope = useServerStateScope()
  const pageActive = ref(true)

  function initialProfile(): ProfileInfo {
    return {
      user_id: userStore.userId,
      username: userStore.username,
      nickname: userStore.nickname,
      email: userStore.email,
      phone: userStore.phone,
      avatar: userStore.avatar,
      created_at: '',
      dept_name: '',
      permissions: userStore.permissions,
      roles: userStore.roles,
      status: '',
      preferred_locale: userStore.preferredLocale,
    }
  }

  const profile = ref<ProfileInfo>(
    serverStateScope.value && pageActive.value ? initialProfile() : emptyProfile(),
  )
  const profileQuery = useServerStateQuery<ScopedProfile>(
    () =>
      pageActive.value && userStore.sessionStatus === 'authenticated' && Boolean(userStore.userId),
    'profile',
    () => ({ scope: 'self', userId: String(userStore.userId || 'anonymous') }),
    async (signal) => {
      const active = getServerStateScope()
      if (!active || active.signal.aborted) {
        throw new HttpError('个人信息会话已失效', { status: 401, kind: 'cancelled' })
      }
      const scope: ServerStateScope = {
        tenantId: active.tenantId,
        subjectId: active.subjectId,
        sessionEpoch: active.sessionEpoch,
      }
      const response = await getProfile(signal)
      if (!response.data) throw new Error(t('profile.responseMissing'))
      return { profile: response.data, scope }
    },
  )

  const loading = profileQuery.isFetching

  function applyProfile(nextProfile: ProfileInfo): void {
    profile.value = nextProfile
    userStore.nickname = nextProfile.nickname
    userStore.email = nextProfile.email ?? ''
    userStore.phone = nextProfile.phone ?? ''
    userStore.avatar = nextProfile.avatar ?? ''
    const preferredLocale = normalizeLocale(nextProfile.preferred_locale)
    if (preferredLocale) {
      userStore.setPreferredLocale(preferredLocale)
      settingsStore.setLocale(preferredLocale)
    }
  }

  watch(
    () => profileQuery.data.value,
    (result) => {
      if (pageActive.value && result && isServerStateScopeCurrent(result.scope)) {
        applyProfile(result.profile)
      }
    },
    { immediate: true, flush: 'sync' },
  )

  watch(
    serverStateScope,
    (scope) => {
      profile.value = scope && pageActive.value ? initialProfile() : emptyProfile()
    },
    { flush: 'sync' },
  )

  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    profile.value = serverStateScope.value ? initialProfile() : emptyProfile()
    const cached = profileQuery.data.value
    if (cached && isServerStateScopeCurrent(cached.scope)) applyProfile(cached.profile)
  })

  onDeactivated(() => {
    pageActive.value = false
    profile.value = emptyProfile()
  })

  async function refreshProfile(): Promise<void> {
    if (!pageActive.value || !serverStateScope.value) return
    await profileQuery.refetch({ throwOnError: true })
  }

  async function handleProfileSaved(payload: ProfileUpdateParams): Promise<void> {
    if (!pageActive.value || !serverStateScope.value) return
    profile.value = {
      ...profile.value,
      nickname: payload.nickname,
      email: payload.email ?? '',
      phone: payload.phone ?? '',
    }
    userStore.nickname = payload.nickname
    userStore.email = payload.email ?? ''
    userStore.phone = payload.phone ?? ''
    await refreshProfile()
  }

  async function handleAvatarUpdated(avatarUrl: string): Promise<void> {
    if (!pageActive.value || !serverStateScope.value) return
    profile.value = { ...profile.value, avatar: avatarUrl }
    userStore.avatar = avatarUrl
    await refreshProfile()
  }

  return {
    handleAvatarUpdated,
    handleProfileSaved,
    loading,
    profile,
    refreshProfile,
    userStore,
  }
}
