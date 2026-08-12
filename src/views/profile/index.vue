<template>
  <div class="page-container">
    <div v-loading="loading" class="profile-layout">
      <ProfileDetailsForm
        :profile="profile"
        :username="userStore.username"
        @saved="handleProfileSaved"
      />
      <div class="profile-side">
        <ProfileAvatar :src="profile.avatar || userStore.avatar" @updated="handleAvatarUpdated" />
        <ProfilePasswordForm />
      </div>
    </div>
    <ProfileSessionsCard
      :devices="sessionDevices"
      :has-other-devices="hasOtherDevices()"
      :has-error="Boolean(sessionsError)"
      :loading="sessionsLoading"
      :pending-device-key="pendingDeviceKey"
      :refreshing="sessionsRefreshing"
      :revoke-others-pending="revokeOthersPending"
      @refresh="refreshSessions"
      @revoke="revokeSession"
      @revoke-others="revokeOtherSessions"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { installProfileSessionsMessages } from '@/i18n/catalog/profile-sessions'
import ProfileAvatar from './components/ProfileAvatar.vue'
import ProfileDetailsForm from './components/ProfileDetailsForm.vue'
import ProfilePasswordForm from './components/ProfilePasswordForm.vue'
import ProfileSessionsCard from './components/ProfileSessionsCard.vue'
import { useAuthSessionManagement } from './useAuthSessionManagement'
import { useProfileManagement } from './useProfileManagement'

installProfileSessionsMessages()
const { t } = useI18n()
const {
  handleAvatarUpdated,
  handleProfileSaved,
  loading,
  profile,
  userStore,
} = useProfileManagement(t)

const {
  devices: sessionDevices,
  error: sessionsError,
  hasOtherDevices,
  loading: sessionsLoading,
  pendingDeviceKey,
  refresh: refreshSessions,
  refreshing: sessionsRefreshing,
  revokeOtherSessions,
  revokeOthersPending,
  revokeSession,
} = useAuthSessionManagement()
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
