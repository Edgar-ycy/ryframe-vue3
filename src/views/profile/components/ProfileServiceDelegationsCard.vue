<template>
  <el-card class="delegations-card" shadow="never">
    <template #header>
      <div class="card-heading">
        <div>
          <h2>{{ t('profile.serviceDelegations.title') }}</h2>
          <p>{{ t('profile.serviceDelegations.description') }}</p>
        </div>
        <div class="card-heading__actions">
          <el-button
            :loading="loading"
            :disabled="loading || createPending"
            @click="emit('refresh')"
          >
            {{ t('profile.serviceDelegations.refresh') }}
          </el-button>
          <el-button
            type="primary"
            :disabled="loading || createPending || targets.length === 0"
            @click="openCreateDialog"
          >
            {{ t('profile.serviceDelegations.create') }}
          </el-button>
        </div>
      </div>
    </template>

    <div :aria-busy="loading" aria-live="polite">
      <el-alert
        v-if="hasError"
        :title="t('profile.serviceDelegations.loadFailed')"
        type="error"
        show-icon
        :closable="false"
        class="load-alert"
      />
      <el-button v-if="hasError && delegations.length === 0" @click="emit('refresh')">
        {{ t('profile.serviceDelegations.retry') }}
      </el-button>
      <el-skeleton v-if="loading && delegations.length === 0 && !hasError" :rows="4" animated />
      <el-empty
        v-else-if="delegations.length === 0 && !hasError"
        :description="t('profile.serviceDelegations.empty')"
      />

      <template v-else-if="delegations.length > 0">
        <div
          class="delegations-table"
          role="region"
          :aria-label="t('profile.serviceDelegations.title')"
        >
          <el-table :data="[...delegations]" row-key="id">
            <el-table-column
              :label="t('profile.serviceDelegations.serviceAccount')"
              min-width="190"
            >
              <template #default="{ row }">{{ accountLabel(row.account_id) }}</template>
            </el-table-column>
            <el-table-column :label="t('profile.serviceDelegations.capabilities')" min-width="260">
              <template #default="{ row }">
                <div class="capability-tags">
                  <el-tag v-for="key in row.capability_keys" :key="key" type="info" size="small">
                    {{ key }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              prop="reason"
              :label="t('profile.serviceDelegations.reason')"
              min-width="190"
              show-overflow-tooltip
            />
            <el-table-column :label="t('profile.serviceDelegations.status')" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTypeById(row.id)">{{ statusLabelById(row.id) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('profile.serviceDelegations.expiresAt')" min-width="180">
              <template #default="{ row }">{{ formatLocalizedDate(row.expires_at) }}</template>
            </el-table-column>
            <el-table-column
              :label="t('profile.serviceDelegations.actions')"
              width="100"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  v-if="canRevokeById(row.id)"
                  type="danger"
                  link
                  :loading="revokingId === row.id"
                  :disabled="Boolean(revokingId)"
                  @click="confirmRevokeById(row.id)"
                >
                  {{ t('profile.serviceDelegations.revoke') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="delegations-mobile">
          <article v-for="delegation in delegations" :key="delegation.id" class="delegation-card">
            <div class="delegation-card__heading">
              <strong>{{ accountLabel(delegation.account_id) }}</strong>
              <el-tag :type="statusType(delegation)">{{ statusLabel(delegation) }}</el-tag>
            </div>
            <p>{{ delegation.reason }}</p>
            <div class="capability-tags">
              <el-tag v-for="key in delegation.capability_keys" :key="key" type="info" size="small">
                {{ key }}
              </el-tag>
            </div>
            <dl>
              <div>
                <dt>{{ t('profile.serviceDelegations.effectiveAt') }}</dt>
                <dd>{{ formatLocalizedDate(delegation.not_before) }}</dd>
              </div>
              <div>
                <dt>{{ t('profile.serviceDelegations.expiresAt') }}</dt>
                <dd>{{ formatLocalizedDate(delegation.expires_at) }}</dd>
              </div>
              <div>
                <dt>{{ t('profile.serviceDelegations.createdAt') }}</dt>
                <dd>{{ formatLocalizedDate(delegation.created_at) }}</dd>
              </div>
            </dl>
            <el-button
              v-if="canRevoke(delegation)"
              type="danger"
              plain
              :loading="revokingId === delegation.id"
              :disabled="Boolean(revokingId)"
              @click="confirmRevoke(delegation)"
            >
              {{ t('profile.serviceDelegations.revoke') }}
            </el-button>
          </article>
        </div>
      </template>
    </div>

    <CreateServiceDelegationDialog
      v-model="createDialogVisible"
      :targets="targets"
      :submitting="createPending"
      @submit="createDelegation"
    />
    <OneTimeMaterialDialog
      ref="delegationMaterialDialogRef"
      v-model="tokenDialogVisible"
      :title="t('profile.serviceDelegations.tokenTitle')"
      :material-label="t('profile.serviceDelegations.token')"
      :material="delegationToken"
      :description="t('profile.serviceDelegations.tokenWarning')"
      @cleared="delegationToken = null"
    />
  </el-card>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type {
  CreateProfileServiceDelegationInput,
  ProfileServiceDelegation,
  ProfileServiceDelegationTarget,
} from '@/api/modules/profileServiceDelegation'
import OneTimeMaterialDialog from '@/components/common/OneTimeMaterialDialog.vue'
import { formatLocalizedDate } from '@/i18n'
import { confirmAction } from '@/utils/confirmAction'
import CreateServiceDelegationDialog from './CreateServiceDelegationDialog.vue'

const props = defineProps<{
  delegations: readonly ProfileServiceDelegation[]
  targets: readonly ProfileServiceDelegationTarget[]
  loading: boolean
  hasError: boolean
  createPending: boolean
  revokingId?: string
  sensitiveMaterialGeneration?: number
  captureIdentity?: () => string | undefined
}>()

const emit = defineEmits<{
  refresh: []
  create: [
    input: CreateProfileServiceDelegationInput,
    identitySnapshot: string | undefined,
    done: (token: string | null) => void,
  ]
  revoke: [delegation: ProfileServiceDelegation, identitySnapshot: string | undefined]
}>()

const { t } = useI18n()
const createDialogVisible = ref(false)
const tokenDialogVisible = ref(false)
const delegationToken = ref<string | null>(null)
const delegationMaterialDialogRef = ref<{ clearNow: () => void }>()
let observedSensitiveGeneration = props.sensitiveMaterialGeneration ?? 0
let createIdentitySnapshot: string | undefined

function accountLabel(accountId: string): string {
  const target = props.targets.find((item) => item.account_id === accountId)
  return target ? `${target.account_name} (${target.account_code})` : accountId
}

function effectiveStatus(item: ProfileServiceDelegation): 'active' | 'expired' | 'revoked' {
  if (item.revoked_at || item.status === 'revoked') return 'revoked'
  if (Date.parse(item.expires_at) <= Date.now()) return 'expired'
  return 'active'
}

function statusLabel(item: ProfileServiceDelegation): string {
  return t(`profile.serviceDelegations.${effectiveStatus(item)}`)
}

function statusType(item: ProfileServiceDelegation): TagProps['type'] {
  const status = effectiveStatus(item)
  if (status === 'active') return 'success'
  if (status === 'expired') return 'warning'
  return 'info'
}

function canRevoke(item: ProfileServiceDelegation): boolean {
  return !item.revoked_at && item.status !== 'revoked'
}

function findDelegation(id: string): ProfileServiceDelegation | undefined {
  return props.delegations.find((delegation) => delegation.id === id)
}

function statusLabelById(id: string): string {
  const delegation = findDelegation(id)
  return delegation ? statusLabel(delegation) : t('profile.serviceDelegations.expired')
}

function statusTypeById(id: string): TagProps['type'] {
  const delegation = findDelegation(id)
  return delegation ? statusType(delegation) : 'info'
}

function canRevokeById(id: string): boolean {
  const delegation = findDelegation(id)
  return delegation ? canRevoke(delegation) : false
}

function openCreateDialog(): void {
  createIdentitySnapshot = props.captureIdentity?.()
  createDialogVisible.value = true
}

function createDelegation(input: CreateProfileServiceDelegationInput): void {
  emit('create', input, createIdentitySnapshot, (token) => {
    createDialogVisible.value = false
    delegationToken.value = token
    nextTick(() => {
      tokenDialogVisible.value = true
    }).catch(() => undefined)
  })
}

async function confirmRevoke(delegation: ProfileServiceDelegation): Promise<void> {
  const identitySnapshot = props.captureIdentity?.()
  const confirmed = await confirmAction(
    t('profile.serviceDelegations.revokeConfirm', { account: accountLabel(delegation.account_id) }),
    t('profile.serviceDelegations.revokeConfirmTitle'),
    { type: 'error', confirmButtonText: t('profile.serviceDelegations.revoke') },
  )
  if (confirmed) emit('revoke', delegation, identitySnapshot)
}

async function confirmRevokeById(id: string): Promise<void> {
  const delegation = findDelegation(id)
  if (delegation) await confirmRevoke(delegation)
}

onBeforeUnmount(() => {
  clearSensitiveMaterial()
})

function clearSensitiveMaterial(): void {
  delegationMaterialDialogRef.value?.clearNow()
  tokenDialogVisible.value = false
  createDialogVisible.value = false
  delegationToken.value = null
  createIdentitySnapshot = undefined
}

onDeactivated(clearSensitiveMaterial)
onUpdated(() => {
  const nextGeneration = props.sensitiveMaterialGeneration ?? 0
  if (nextGeneration === observedSensitiveGeneration) return
  observedSensitiveGeneration = nextGeneration
  clearSensitiveMaterial()
})

defineExpose({ clearSensitiveMaterial })
</script>

<style scoped src="./ProfileServiceDelegationsCard.css"></style>
