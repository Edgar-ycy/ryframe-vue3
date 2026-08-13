<template>
  <div class="page-container service-accounts-page">
    <el-card shadow="never">
      <template #header>
        <div class="page-heading">
          <div>
            <h1>{{ t('serviceAccounts.title') }}</h1>
            <p>{{ t('serviceAccounts.subtitle') }}</p>
          </div>
          <el-button
            v-if="activeTab === 'accounts'"
            v-perm="'system:service-account:add'"
            type="primary"
            icon="Plus"
            @click="openCreateDialog"
          >
            {{ t('serviceAccounts.createAccount') }}
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="management-tabs" @tab-change="handleTabChange">
        <el-tab-pane
          v-if="canListAccounts"
          :label="t('serviceAccounts.accountsTab')"
          name="accounts"
        >
          <div class="panel-toolbar">
            <span>{{ t('serviceAccounts.totalAccounts', { count: accounts?.total ?? 0 }) }}</span>
            <el-button :loading="accountsLoading" :disabled="accountsLoading" @click="refresh">
              {{ t('serviceAccounts.refresh') }}
            </el-button>
          </div>

          <el-alert
            v-if="accountsError"
            :title="t('serviceAccounts.loadFailed')"
            type="error"
            show-icon
            :closable="false"
            class="panel-alert"
          />
          <el-skeleton v-if="accountsLoading && !(accounts?.items.length)" :rows="6" animated />
          <el-empty
            v-else-if="!(accounts?.items.length)"
            :description="t('serviceAccounts.emptyAccounts')"
          />

          <template v-else>
            <div class="accounts-table" role="region" :aria-label="t('serviceAccounts.accountsTab')">
              <el-table :data="accounts.items" border stripe row-key="id">
                <el-table-column prop="code" :label="t('serviceAccounts.code')" min-width="180" show-overflow-tooltip />
                <el-table-column prop="name" :label="t('serviceAccounts.name')" min-width="180" show-overflow-tooltip />
                <el-table-column prop="description" :label="t('serviceAccounts.description')" min-width="210" show-overflow-tooltip />
                <el-table-column :label="t('serviceAccounts.status')" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === '1' ? 'success' : 'info'">
                      {{ row.status === '1' ? t('serviceAccounts.enabled') : t('serviceAccounts.disabled') }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="max_requests_per_minute" :label="t('serviceAccounts.maxRequests')" min-width="140" align="right" />
                <el-table-column :label="t('serviceAccounts.updatedAt')" min-width="180">
                  <template #default="{ row }">{{ formatLocalizedDate(row.updated_at) }}</template>
                </el-table-column>
                <el-table-column :label="t('serviceAccounts.actions')" min-width="310" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" link @click="openDetails(row)">
                      {{ t('serviceAccounts.details') }}
                    </el-button>
                    <el-button
                      v-perm="'system:service-account:edit'"
                      type="primary"
                      link
                      @click="openEditDialog(row)"
                    >
                      {{ t('serviceAccounts.edit') }}
                    </el-button>
                    <el-button
                      v-perm="'system:service-account:edit'"
                      :type="row.status === '1' ? 'warning' : 'success'"
                      link
                      :loading="statusPending && pendingAccountId === row.id"
                      :disabled="statusPending"
                      @click="confirmStatusChange(row)"
                    >
                      {{ row.status === '1' ? t('serviceAccounts.disable') : t('serviceAccounts.enable') }}
                    </el-button>
                    <el-button
                      v-perm="'system:service-account:remove'"
                      type="danger"
                      link
                      :loading="removePending && pendingAccountId === row.id"
                      :disabled="removePending"
                      @click="confirmRemove(row)"
                    >
                      {{ t('serviceAccounts.remove') }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="accounts-mobile">
              <article v-for="account in accounts.items" :key="account.id" class="account-card">
                <div class="account-card__heading">
                  <div>
                    <strong>{{ account.name }}</strong>
                    <code>{{ account.code }}</code>
                  </div>
                  <el-tag :type="account.status === '1' ? 'success' : 'info'">
                    {{ account.status === '1' ? t('serviceAccounts.enabled') : t('serviceAccounts.disabled') }}
                  </el-tag>
                </div>
                <p>{{ account.description || t('serviceAccounts.notAvailable') }}</p>
                <dl>
                  <div><dt>{{ t('serviceAccounts.maxRequests') }}</dt><dd>{{ account.max_requests_per_minute }}</dd></div>
                  <div><dt>{{ t('serviceAccounts.updatedAt') }}</dt><dd>{{ formatLocalizedDate(account.updated_at) }}</dd></div>
                </dl>
                <div class="account-card__actions">
                  <el-button type="primary" plain @click="openDetails(account)">
                    {{ t('serviceAccounts.details') }}
                  </el-button>
                  <el-button
                    v-perm="'system:service-account:edit'"
                    @click="openEditDialog(account)"
                  >
                    {{ t('serviceAccounts.edit') }}
                  </el-button>
                  <el-button
                    v-perm="'system:service-account:edit'"
                    :type="account.status === '1' ? 'warning' : 'success'"
                    plain
                    :loading="statusPending && pendingAccountId === account.id"
                    :disabled="statusPending"
                    @click="confirmStatusChange(account)"
                  >
                    {{ account.status === '1' ? t('serviceAccounts.disable') : t('serviceAccounts.enable') }}
                  </el-button>
                  <el-button
                    v-perm="'system:service-account:remove'"
                    type="danger"
                    plain
                    :loading="removePending && pendingAccountId === account.id"
                    :disabled="removePending"
                    @click="confirmRemove(account)"
                  >
                    {{ t('serviceAccounts.remove') }}
                  </el-button>
                </div>
              </article>
            </div>

            <el-pagination
              v-if="accounts.total > 0"
              v-model:current-page="queryParams.page"
              v-model:page-size="queryParams.page_size"
              :total="accounts.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              background
              class="pagination"
              @change="fetchAccounts"
            />
          </template>
        </el-tab-pane>

        <el-tab-pane
          v-if="canListDelegations"
          :label="t('serviceAccounts.delegationsTab')"
          name="delegations"
        >
          <ServiceDelegationsPanel
            :page="delegationsQueryParams.page ?? 1"
            :page-size="delegationsQueryParams.page_size ?? 20"
            :items="delegations?.items ?? []"
            :total="delegations?.total ?? 0"
            :loading="delegationsLoading"
            :has-error="Boolean(delegationsError)"
            :revoking-id="revokingDelegationId"
            @refresh="fetchDelegations"
            @page-change="fetchDelegations"
            @update:page="delegationsQueryParams.page = $event"
            @update:page-size="delegationsQueryParams.page_size = $event"
            @revoke="confirmRevokeDelegation"
          />
        </el-tab-pane>

        <el-tab-pane
          v-if="canListAudits"
          :label="t('serviceAccounts.auditsTab')"
          name="audits"
        >
          <ServiceAccessAuditsPanel
            :page="auditsQueryParams.page ?? 1"
            :page-size="auditsQueryParams.page_size ?? 20"
            :items="audits?.items ?? []"
            :total="audits?.total ?? 0"
            :loading="auditsLoading"
            :has-error="Boolean(auditsError)"
            @refresh="fetchAudits"
            @page-change="fetchAudits"
            @update:page="auditsQueryParams.page = $event"
            @update:page-size="auditsQueryParams.page_size = $event"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <ServiceAccountFormDialog
      v-model="accountDialogVisible"
      :account="editingAccount"
      :department-tree="departmentTree"
      :can-list-departments="canListDepartments"
      :submitting="savePending"
      @submit="submitAccount"
    />
    <ServiceAccountDetailDrawer
      ref="accountDetailDrawerRef"
      v-model="detailDrawerVisible"
      :account="detail?.account ?? selectedAccount"
      :role-ids="roleIds"
      :credentials="credentials"
      :detail-loading="detailLoading"
      :credentials-loading="credentialsLoading"
      :roles-saving="rolesPending"
      :revoking-credential-id="revokingCredentialId"
      :can-manage-roles="canManageRoles"
      :can-list-credentials="canListAccounts"
      @closed="closeDetails"
      @load-credentials="fetchCredentials"
      @save-roles="submitRoles"
      @issue-credential="credentialDialogVisible = true"
      @revoke-credential="confirmRevokeCredential"
    />
    <IssueCredentialDialog
      v-model="credentialDialogVisible"
      :submitting="issueCredentialPending"
      @submit="submitCredential"
    />
    <OneTimeMaterialDialog
      ref="credentialMaterialDialogRef"
      v-model="secretDialogVisible"
      :title="t('serviceAccounts.credentialSecretTitle')"
      :material-label="t('serviceAccounts.apiKey')"
      :material="credentialSecret"
      :description="t('serviceAccounts.credentialWarning')"
      @cleared="credentialSecret = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { TabsPaneContext } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { getDeptTree, type DeptNode } from '@/api/modules/dept'
import type {
  CreateServiceAccountInput,
  CreateServiceCredentialInput,
  ServiceAccount,
  ServiceCredential,
  ServiceDelegation,
  UpdateServiceAccountInput,
} from '@/api/modules/serviceAccount'
import OneTimeMaterialDialog from '@/components/common/OneTimeMaterialDialog.vue'
import { formatLocalizedDate } from '@/i18n'
import { installServiceAccountsMessages } from '@/i18n/catalog/service-accounts'
import { confirmAction } from '@/utils/confirmAction'
import IssueCredentialDialog from './components/IssueCredentialDialog.vue'
import ServiceAccessAuditsPanel from './components/ServiceAccessAuditsPanel.vue'
import ServiceAccountDetailDrawer from './components/ServiceAccountDetailDrawer.vue'
import ServiceAccountFormDialog from './components/ServiceAccountFormDialog.vue'
import ServiceDelegationsPanel from './components/ServiceDelegationsPanel.vue'
import { useServiceAccountManagement } from './composables/useServiceAccountManagement'

installServiceAccountsMessages()
const { t } = useI18n()
const activeTab = ref('accounts')
const accountDialogVisible = ref(false)
const detailDrawerVisible = ref(false)
const credentialDialogVisible = ref(false)
const secretDialogVisible = ref(false)
const editingAccount = ref<ServiceAccount | null>(null)
const pendingAccountId = ref<string>()
const credentialSecret = ref<string | null>(null)
const credentialMaterialDialogRef = ref<{ clearNow: () => void }>()
const accountDetailDrawerRef = ref<{ resetNow: () => void }>()
const departmentTree = ref<DeptNode[]>([])
let departmentTreeController: AbortController | undefined
const accountFormIdentity = ref<string>()
const detailIdentity = ref<string>()

const {
  accounts,
  accountsError,
  accountsLoading,
  audits,
  auditsError,
  auditsLoading,
  auditsQueryParams,
  canListAccounts,
  canListAudits,
  canListDepartments,
  canListDelegations,
  canManageRoles,
  captureIdentity,
  credentials,
  credentialsLoading,
  delegations,
  delegationsError,
  delegationsLoading,
  delegationsQueryParams,
  detail,
  detailLoading,
  fetchAccounts,
  fetchAudits,
  fetchCredentials,
  fetchDelegations,
  issueCredential,
  issueCredentialPending,
  identityMatches,
  onIdentityChanged,
  queryParams,
  refresh,
  removeAccount,
  removePending,
  revokeCredential,
  revokeDelegation,
  revokingCredentialId,
  revokingDelegationId,
  roleIds,
  rolesPending,
  saveAccount,
  savePending,
  saveRoles,
  selectAccount,
  selectedAccount,
  setAccountStatus,
  statusPending,
} = useServiceAccountManagement()

function clearSensitiveMaterial(): void {
  credentialMaterialDialogRef.value?.clearNow()
  accountDetailDrawerRef.value?.resetNow()
  departmentTreeController?.abort()
  departmentTreeController = undefined
  departmentTree.value = []
  secretDialogVisible.value = false
  credentialDialogVisible.value = false
  accountDialogVisible.value = false
  detailDrawerVisible.value = false
  editingAccount.value = null
  pendingAccountId.value = undefined
  accountFormIdentity.value = undefined
  detailIdentity.value = undefined
  credentialSecret.value = null
}

const unsubscribeIdentityChange = onIdentityChanged(clearSensitiveMaterial)
onDeactivated(clearSensitiveMaterial)
onBeforeUnmount(() => {
  clearSensitiveMaterial()
  unsubscribeIdentityChange()
})

function handleTabChange(value: TabsPaneContext['paneName']): void {
  const tab = String(value)
  if (tab === 'delegations' && canListDelegations.value) void fetchDelegations()
  if (tab === 'audits' && canListAudits.value) void fetchAudits()
}

async function loadDepartmentTree(): Promise<void> {
  departmentTreeController?.abort()
  const controller = new AbortController()
  departmentTreeController = controller
  const guard = captureIdentity()
  try {
    const response = await getDeptTree(controller.signal)
    if (!controller.signal.aborted && identityMatches(guard)) {
      departmentTree.value = response.data ?? []
    }
  }
  finally {
    if (departmentTreeController === controller) departmentTreeController = undefined
  }
}

function openCreateDialog(): void {
  accountFormIdentity.value = captureIdentity()
  editingAccount.value = null
  accountDialogVisible.value = true
  if (canListDepartments.value && departmentTree.value.length === 0) void loadDepartmentTree()
}

function openEditDialog(account: ServiceAccount): void {
  accountFormIdentity.value = captureIdentity()
  editingAccount.value = account
  accountDialogVisible.value = true
  if (canListDepartments.value && departmentTree.value.length === 0) void loadDepartmentTree()
}

async function submitAccount(input: CreateServiceAccountInput | UpdateServiceAccountInput): Promise<void> {
  const guard = accountFormIdentity.value
  if (!identityMatches(guard)) return
  const account = await saveAccount(input, editingAccount.value?.id, guard)
  ElMessage.success(t(editingAccount.value ? 'serviceAccounts.updated' : 'serviceAccounts.created'))
  editingAccount.value = account
  accountDialogVisible.value = false
}

async function openDetails(account: ServiceAccount): Promise<void> {
  detailIdentity.value = captureIdentity()
  await selectAccount(account)
  detailDrawerVisible.value = true
}

async function closeDetails(): Promise<void> {
  detailDrawerVisible.value = false
  detailIdentity.value = undefined
  await selectAccount(null)
}

async function confirmStatusChange(account: ServiceAccount): Promise<void> {
  const guard = captureIdentity()
  const nextStatus = account.status === '1' ? 'disabled' : 'enabled'
  const confirmed = await confirmAction(
    t('serviceAccounts.statusConfirm', {
      name: account.name,
      status: t(nextStatus === 'enabled' ? 'serviceAccounts.enabled' : 'serviceAccounts.disabled'),
    }),
    t('serviceAccounts.statusConfirmTitle'),
    { type: 'warning', confirmButtonText: t(nextStatus === 'enabled' ? 'serviceAccounts.enable' : 'serviceAccounts.disable') },
  )
  if (!confirmed || !identityMatches(guard)) return
  pendingAccountId.value = account.id
  try {
    await setAccountStatus(account, nextStatus, guard)
    ElMessage.success(t('serviceAccounts.statusUpdated'))
  }
  finally {
    pendingAccountId.value = undefined
  }
}

async function confirmRemove(account: ServiceAccount): Promise<void> {
  const guard = captureIdentity()
  const confirmed = await confirmAction(
    t('serviceAccounts.removeConfirm', { name: account.name }),
    t('serviceAccounts.removeConfirmTitle'),
    { type: 'error', confirmButtonText: t('serviceAccounts.remove') },
  )
  if (!confirmed || !identityMatches(guard)) return
  pendingAccountId.value = account.id
  try {
    await removeAccount(account, guard)
    ElMessage.success(t('serviceAccounts.removed'))
  }
  finally {
    pendingAccountId.value = undefined
  }
}

async function submitRoles(nextRoleIds: string[]): Promise<void> {
  const guard = detailIdentity.value
  const accountId = selectedAccount.value?.id
  if (!accountId || !identityMatches(guard)) return
  await saveRoles(accountId, nextRoleIds, guard)
  ElMessage.success(t('serviceAccounts.rolesSaved'))
}

async function submitCredential(input: CreateServiceCredentialInput): Promise<void> {
  const guard = detailIdentity.value
  const accountId = selectedAccount.value?.id
  if (!accountId || !identityMatches(guard)) return
  const result = await issueCredential(accountId, input, guard)
  credentialDialogVisible.value = false
  ElMessage.success(t('serviceAccounts.credentialCreated'))
  credentialSecret.value = result.secret ?? null
  await nextTick()
  secretDialogVisible.value = true
}

async function confirmRevokeCredential(credential: ServiceCredential): Promise<void> {
  const guard = detailIdentity.value
  const accountId = selectedAccount.value?.id
  if (!accountId || !identityMatches(guard)) return
  const confirmed = await confirmAction(
    t('serviceAccounts.revokeCredentialConfirm', { label: credential.label }),
    t('serviceAccounts.revokeCredentialTitle'),
    { type: 'error', confirmButtonText: t('serviceAccounts.revoke') },
  )
  if (!confirmed || !identityMatches(guard)) return
  await revokeCredential(accountId, credential, guard)
  ElMessage.success(t('serviceAccounts.credentialRevoked'))
}

async function confirmRevokeDelegation(delegation: ServiceDelegation): Promise<void> {
  const guard = captureIdentity()
  const confirmed = await confirmAction(
    t('serviceAccounts.revokeDelegationConfirm'),
    t('serviceAccounts.revokeDelegationTitle'),
    { type: 'error', confirmButtonText: t('serviceAccounts.revoke') },
  )
  if (!confirmed || !identityMatches(guard)) return
  await revokeDelegation(delegation, guard)
  ElMessage.success(t('serviceAccounts.delegationRevoked'))
}
</script>

<style scoped>
.service-accounts-page {
  min-width: 0;
}

.page-heading,
.panel-toolbar,
.account-card__heading,
.account-card__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.page-heading h1 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
}

.page-heading p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.55;
}

.management-tabs {
  min-width: 0;
}

.panel-toolbar {
  align-items: center;
  margin-bottom: 14px;
  color: var(--el-text-color-secondary);
}

.panel-alert {
  margin-bottom: 14px;
}

.accounts-table {
  max-width: 100%;
  overflow-x: auto;
}

.accounts-table :deep(.el-table) {
  min-width: 1200px;
}

.accounts-mobile {
  display: none;
}

.pagination {
  justify-content: flex-end;
  margin-top: 16px;
}

@media (width < 768px) {
  .accounts-table {
    display: none;
  }

  .accounts-mobile {
    display: grid;
    gap: 12px;
  }

  .account-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
    background: var(--el-fill-color-blank);
  }

  .account-card__heading > div {
    display: grid;
    min-width: 0;
    gap: 5px;
  }

  .account-card__heading code,
  .account-card p {
    overflow-wrap: anywhere;
  }

  .account-card p {
    color: var(--el-text-color-secondary);
    line-height: 1.55;
  }

  .account-card dl {
    display: grid;
    gap: 8px;
    margin: 14px 0;
  }

  .account-card dl > div {
    display: grid;
    grid-template-columns: minmax(110px, 45%) minmax(0, 1fr);
    gap: 8px;
  }

  .account-card dt {
    color: var(--el-text-color-secondary);
  }

  .account-card dd {
    margin: 0;
    text-align: right;
  }

  .account-card__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .account-card__actions :deep(.el-button) {
    width: 100%;
    min-height: 44px;
    margin-left: 0;
  }

  .pagination {
    justify-content: center;
  }
}

@media (width < 480px) {
  .page-heading,
  .panel-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .page-heading :deep(.el-button),
  .panel-toolbar :deep(.el-button) {
    width: 100%;
    min-height: 44px;
  }

  .account-card__actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
