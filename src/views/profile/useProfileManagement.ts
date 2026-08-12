import {
  getProfile,
  type ProfileInfo,
  type ProfileUpdateParams,
} from '@/api/modules/auth'
import { normalizeLocale } from '@/i18n'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'

type Translate = (key: string) => string

export function useProfileManagement(t: Translate) {
  const userStore = useUserStore()
  const settingsStore = useSettingsStore()

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

  const profile = ref<ProfileInfo>(initialProfile())
  const profileQuery = useTenantQuery<ProfileInfo>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated' && Boolean(userStore.userId),
    'profile',
    () => ({ scope: 'self', userId: String(userStore.userId || 'anonymous') }),
    async signal => {
      const response = await getProfile(signal)
      if (!response.data) throw new Error(t('profile.responseMissing'))
      return response.data
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
    nextProfile => {
      if (nextProfile) applyProfile(nextProfile)
    },
    { immediate: true },
  )

  async function refreshProfile(): Promise<void> {
    await profileQuery.refetch({ throwOnError: true })
  }

  async function handleProfileSaved(payload: ProfileUpdateParams): Promise<void> {
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
