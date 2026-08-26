<template>
  <el-drawer
    v-model="visible"
    :title="t('serviceAccounts.accountDetails')"
    size="min(760px, 100vw)"
    destroy-on-close
    @open="handleOpen"
    @closed="emit('closed')"
  >
    <div v-loading="detailLoading" class="account-detail">
      <template v-if="account">
        <header class="account-heading">
          <div>
            <h2>{{ account.name }}</h2>
            <p>
              <code>{{ account.code }}</code>
            </p>
          </div>
          <el-tag :type="account.status === '1' ? 'success' : 'info'">
            {{
              account.status === '1' ? t('serviceAccounts.enabled') : t('serviceAccounts.disabled')
            }}
          </el-tag>
        </header>

        <el-descriptions :column="descriptionColumns()" border class="account-descriptions">
          <el-descriptions-item :label="t('serviceAccounts.description')">
            {{ account.description || t('serviceAccounts.notAvailable') }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('serviceAccounts.department')">
            {{ account.dept_id || t('serviceAccounts.noDepartment') }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('serviceAccounts.maxRequests')">
            {{ formatNumber(account.max_requests_per_minute) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('serviceAccounts.authorizationVersion')">
            {{ formatNumber(account.authorization_version) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('serviceAccounts.createdAt')">
            {{ formatLocalizedDate(account.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('serviceAccounts.updatedAt')">
            {{ formatLocalizedDate(account.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-tabs v-model="activeTab" class="detail-tabs" @tab-change="handleTabChange">
          <el-tab-pane v-if="canManageRoles" :label="t('serviceAccounts.rolesTab')" name="roles">
            <el-alert
              :title="t('serviceAccounts.rolesHint')"
              type="info"
              show-icon
              :closable="false"
              class="section-alert"
            />
            <el-select
              v-model="selectedRoleIds"
              multiple
              filterable
              remote
              clearable
              reserve-keyword
              :remote-method="searchRoles"
              :loading="rolesLoading"
              :placeholder="t('serviceAccounts.selectRoles')"
              class="full-width"
              :aria-label="t('serviceAccounts.selectRoles')"
            >
              <el-option
                v-for="option in standardRoleOptions"
                :key="option.value"
                :value="option.value"
                :label="option.label"
                :disabled="option.disabled"
              >
                <span>{{ option.label }}</span>
                <small v-if="option.description" class="option-description">
                  {{ option.description }}
                </small>
              </el-option>
            </el-select>
            <div class="section-actions">
              <el-button
                v-perm="'system:service-account:role'"
                type="primary"
                :loading="rolesSaving"
                :disabled="rolesSaving"
                @click="emit('save-roles', selectedRoleIds)"
              >
                {{ t('serviceAccounts.save') }}
              </el-button>
            </div>
          </el-tab-pane>

          <el-tab-pane
            v-if="canListCredentials"
            :label="t('serviceAccounts.credentialsTab')"
            name="credentials"
          >
            <div class="section-heading">
              <h3>{{ t('serviceAccounts.credentials') }}</h3>
              <el-button
                v-perm="'system:service-account:key-rotate'"
                type="primary"
                icon="Key"
                @click="emit('issue-credential')"
              >
                {{ t('serviceAccounts.rotateKey') }}
              </el-button>
            </div>
            <el-skeleton v-if="credentialsLoading && credentials.length === 0" :rows="4" animated />
            <el-empty
              v-else-if="credentials.length === 0"
              :description="t('serviceAccounts.noCredentials')"
            />
            <div v-else class="credential-list">
              <article
                v-for="credential in credentials"
                :key="credential.id"
                class="credential-card"
              >
                <div class="credential-card__header">
                  <div>
                    <strong>{{ credential.label }}</strong>
                    <code>{{ credential.key_id }}</code>
                  </div>
                  <el-tag :type="credentialStatusType(credential)">
                    {{ credentialStatusLabel(credential) }}
                  </el-tag>
                </div>
                <dl>
                  <div>
                    <dt>{{ t('serviceAccounts.expiresAt') }}</dt>
                    <dd>{{ formatLocalizedDate(credential.expires_at) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('serviceAccounts.lastUsedAt') }}</dt>
                    <dd>
                      {{
                        credential.last_used_at
                          ? formatLocalizedDate(credential.last_used_at)
                          : t('serviceAccounts.notAvailable')
                      }}
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('serviceAccounts.createdAt') }}</dt>
                    <dd>{{ formatLocalizedDate(credential.created_at) }}</dd>
                  </div>
                </dl>
                <el-button
                  v-if="credential.status === 'active' && !credential.revoked_at"
                  v-perm="'system:service-account:key-revoke'"
                  type="danger"
                  plain
                  :loading="revokingCredentialId === credential.id"
                  :disabled="Boolean(revokingCredentialId)"
                  @click="emit('revoke-credential', credential)"
                >
                  {{ t('serviceAccounts.revoke') }}
                </el-button>
              </article>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import type { TagProps, TabsPaneContext } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { listRoleOptions } from '@/api/modules/role'
import type { SelectOption } from '@/api/modules/option'
import type { ServiceAccount, ServiceCredential } from '@/api/modules/serviceAccount'
import { formatLocalizedDate, getApplicationLocale } from '@/i18n'

const props = defineProps<{
  account: ServiceAccount | null
  roleIds: readonly string[]
  credentials: readonly ServiceCredential[]
  detailLoading: boolean
  credentialsLoading: boolean
  rolesSaving: boolean
  revokingCredentialId?: string
  canManageRoles: boolean
  canListCredentials: boolean
}>()

const emit = defineEmits<{
  open: []
  closed: []
  'load-roles': []
  'load-credentials': []
  'save-roles': [roleIds: string[]]
  'issue-credential': []
  'revoke-credential': [credential: ServiceCredential]
}>()

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const activeTab = ref('')
const selectedRoleIds = ref<string[]>([])
const roleOptions = ref<SelectOption[]>([])
const rolesLoading = ref(false)
let roleSearchGeneration = 0
let roleIdsSnapshot = ''
let roleSearchController: AbortController | undefined

const standardRoleOptions = computed(() => roleOptions.value.filter((option) => !option.disabled))

function initializeTab(): void {
  if (props.canManageRoles) activeTab.value = 'roles'
  else if (props.canListCredentials) activeTab.value = 'credentials'
  else activeTab.value = ''
}

function handleOpen(): void {
  initializeTab()
  syncRoleIds()
  loadActiveTab()
  if (activeTab.value === 'roles') void searchRoles('')
  emit('open')
}

function syncRoleIds(): void {
  const nextSnapshot = props.roleIds.join('\u0000')
  if (nextSnapshot === roleIdsSnapshot) return
  roleIdsSnapshot = nextSnapshot
  selectedRoleIds.value = [...props.roleIds]
}

function loadActiveTab(): void {
  if (activeTab.value === 'roles') emit('load-roles')
  if (activeTab.value === 'credentials') emit('load-credentials')
}

function handleTabChange(value: TabsPaneContext['paneName']): void {
  activeTab.value = String(value)
  loadActiveTab()
}

async function searchRoles(value: string): Promise<void> {
  roleSearchController?.abort()
  const controller = new AbortController()
  roleSearchController = controller
  const generation = ++roleSearchGeneration
  rolesLoading.value = true
  try {
    const response = await listRoleOptions(
      {
        q: value.trim() || undefined,
        limit: 50,
        purpose: 'service_account_assignment',
      },
      controller.signal,
    )
    if (!controller.signal.aborted && generation === roleSearchGeneration) {
      roleOptions.value = response.data?.items ?? []
    }
  } finally {
    if (generation === roleSearchGeneration) {
      rolesLoading.value = false
      roleSearchController = undefined
    }
  }
}

function descriptionColumns(): number {
  return window.matchMedia('(width < 768px)').matches ? 1 : 2
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(getApplicationLocale()).format(value)
}

function credentialStatusLabel(credential: ServiceCredential): string {
  if (credential.revoked_at || credential.status === 'revoked') return t('serviceAccounts.revoked')
  if (Date.parse(credential.expires_at) <= Date.now()) return t('serviceAccounts.expired')
  return t('serviceAccounts.active')
}

function credentialStatusType(credential: ServiceCredential): TagProps['type'] {
  if (credential.revoked_at || credential.status === 'revoked') return 'info'
  if (Date.parse(credential.expires_at) <= Date.now()) return 'warning'
  return 'success'
}

onBeforeUnmount(() => {
  resetNow()
})

onMounted(initializeTab)
onUpdated(syncRoleIds)

function resetNow(): void {
  roleSearchController?.abort()
  roleSearchController = undefined
  roleSearchGeneration += 1
  rolesLoading.value = false
  roleOptions.value = []
  selectedRoleIds.value = []
  roleIdsSnapshot = ''
}

defineExpose({ resetNow })
</script>

<style scoped src="./ServiceAccountDetailDrawer.css"></style>
