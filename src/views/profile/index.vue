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
import ProfileAvatar from './components/ProfileAvatar.vue'
import ProfileDetailsForm from './components/ProfileDetailsForm.vue'
import ProfilePasswordForm from './components/ProfilePasswordForm.vue'
import { useProfileManagement } from './useProfileManagement'

const { t } = useI18n()
const {
  avatarPreview,
  handleAvatarUpdated,
  handleProfileSaved,
  loading,
  profile,
  userStore,
} = useProfileManagement(t)
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
