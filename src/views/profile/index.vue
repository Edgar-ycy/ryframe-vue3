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
    <ProfileServiceDelegationsCard
      v-if="tenantContext.hasCapability(SERVICE_ACCOUNTS_CAPABILITY)"
      ref="serviceDelegationsCardRef"
      :delegations="serviceDelegations"
      :targets="serviceDelegationTargets"
      :loading="serviceDelegationsLoading || serviceDelegationTargetsLoading"
      :has-error="Boolean(serviceDelegationsError || serviceDelegationTargetsError)"
      :create-pending="serviceDelegationCreatePending"
      :revoking-id="serviceDelegationRevokingId"
      :sensitive-material-generation="serviceDelegationSensitiveGeneration"
      :capture-identity="captureServiceDelegationIdentity"
      @refresh="refreshServiceDelegations"
      @create="createServiceDelegation"
      @revoke="revokeServiceDelegation"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import ProfileAvatar from './components/ProfileAvatar.vue'
import ProfileDetailsForm from './components/ProfileDetailsForm.vue'
import ProfilePasswordForm from './components/ProfilePasswordForm.vue'
import ProfileSessionsCard from './components/ProfileSessionsCard.vue'
import ProfileServiceDelegationsCard from './components/ProfileServiceDelegationsCard.vue'
import type {
  CreateProfileServiceDelegationInput,
  ProfileServiceDelegation,
} from '@/api/modules/profileServiceDelegation'
import { useAuthSessionManagement } from './useAuthSessionManagement'
import { useProfileManagement } from './useProfileManagement'
import { useServiceDelegationManagement } from './useServiceDelegationManagement'
import { SERVICE_ACCOUNTS_CAPABILITY } from '@/features/service-accounts/manifest'
import { useTenantContextStore } from '@/stores/tenantContext'

const { t } = useI18n()
const tenantContext = useTenantContextStore()
const { handleAvatarUpdated, handleProfileSaved, loading, profile, userStore } =
  useProfileManagement(t)

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

const {
  createPending: serviceDelegationCreatePending,
  captureIdentity: captureServiceDelegationIdentity,
  delegations: serviceDelegations,
  error: serviceDelegationsError,
  issueDelegation,
  identityMatches: serviceDelegationIdentityMatches,
  loading: serviceDelegationsLoading,
  refresh: refreshServiceDelegations,
  revokeDelegation,
  revokingId: serviceDelegationRevokingId,
  targets: serviceDelegationTargets,
  targetsError: serviceDelegationTargetsError,
  targetsLoading: serviceDelegationTargetsLoading,
  onIdentityChanged: onServiceDelegationIdentityChanged,
} = useServiceDelegationManagement()

const serviceDelegationSensitiveGeneration = ref(0)
const serviceDelegationsCardRef = ref<{ clearSensitiveMaterial: () => void }>()
const unsubscribeServiceDelegationIdentity = onServiceDelegationIdentityChanged(() => {
  serviceDelegationsCardRef.value?.clearSensitiveMaterial()
  serviceDelegationSensitiveGeneration.value += 1
})
onDeactivated(() => {
  serviceDelegationsCardRef.value?.clearSensitiveMaterial()
  serviceDelegationSensitiveGeneration.value += 1
})
onBeforeUnmount(() => {
  serviceDelegationsCardRef.value?.clearSensitiveMaterial()
  unsubscribeServiceDelegationIdentity()
})

async function createServiceDelegation(
  input: CreateProfileServiceDelegationInput,
  guard: string | undefined,
  done: (token: string | null) => void,
): Promise<void> {
  if (!serviceDelegationIdentityMatches(guard)) return
  const result = await issueDelegation(input, guard)
  ElMessage.success(t('profile.serviceDelegations.created'))
  done(result.token ?? null)
}

async function revokeServiceDelegation(
  delegation: ProfileServiceDelegation,
  guard: string | undefined,
): Promise<void> {
  if (!serviceDelegationIdentityMatches(guard)) return
  await revokeDelegation(delegation, guard)
  ElMessage.success(t('profile.serviceDelegations.revokedSuccess'))
}
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
