<template>
  <div v-loading="loading" class="page-container">
    <div class="profile-layout">
      <ProfileDetailsForm
        :profile="profile"
        :username="userStore.username"
        @saved="handleProfileSaved"
      />
      <div class="profile-side">
        <ProfileAvatar :src="avatarPreview" @updated="handleAvatarUpdated" />
        <ProfilePasswordForm />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  getProfile,
  type ProfileInfo,
  type ProfileUpdateParams,
} from '@/api/modules/auth'
import { normalizeLocale } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import ProfileAvatar from './components/ProfileAvatar.vue'
import ProfileDetailsForm from './components/ProfileDetailsForm.vue'
import ProfilePasswordForm from './components/ProfilePasswordForm.vue'

const userStore = useUserStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const loading = ref(false)

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
const avatarPreview = computed(() => profile.value.avatar || userStore.avatar)

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

async function loadProfile(): Promise<void> {
  loading.value = true
  try {
    const response = await getProfile()
    if (!response.data) throw new Error(t('profile.responseMissing'))
    applyProfile(response.data)
  }
  finally {
    loading.value = false
  }
}

function handleProfileSaved(payload: ProfileUpdateParams): void {
  profile.value = {
    ...profile.value,
    nickname: payload.nickname,
    email: payload.email ?? '',
    phone: payload.phone ?? '',
  }
  userStore.nickname = payload.nickname
  userStore.email = payload.email ?? ''
  userStore.phone = payload.phone ?? ''
}

function handleAvatarUpdated(avatarUrl: string): void {
  profile.value = { ...profile.value, avatar: avatarUrl }
  userStore.avatar = avatarUrl
}

onMounted(() => {
  void loadProfile()
})
</script>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 16px;
  align-items: start;
}

.profile-side {
  display: grid;
  min-width: 0;
  gap: 12px;
}

@media (width <= 900px) {
  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
