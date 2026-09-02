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
          <ServiceAccountList
            :accounts="accounts"
            :has-error="Boolean(accountsError)"
            :loading="accountsLoading"
            :page="queryParams.page"
            :page-size="queryParams.page_size"
            :pending-account-id="pendingAccountId"
            :remove-pending="removePending"
            :status-pending="statusPending"
            @refresh="refresh"
            @details="openDetails"
            @edit="openEditDialog"
            @status="confirmStatusChange"
            @remove="confirmRemove"
            @update:page="queryParams.page = $event"
            @update:page-size="queryParams.page_size = $event"
            @page-change="fetchAccounts"
          />
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

        <el-tab-pane v-if="canListAudits" :label="t('serviceAccounts.auditsTab')" name="audits">
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
import type { ServiceAccount } from '@/api/modules/serviceAccount'
import OneTimeMaterialDialog from '@/components/common/OneTimeMaterialDialog.vue'
import IssueCredentialDialog from './components/IssueCredentialDialog.vue'
import ServiceAccessAuditsPanel from './components/ServiceAccessAuditsPanel.vue'
import ServiceAccountDetailDrawer from './components/ServiceAccountDetailDrawer.vue'
import ServiceAccountFormDialog from './components/ServiceAccountFormDialog.vue'
import ServiceAccountList from './components/ServiceAccountList.vue'
import ServiceDelegationsPanel from './components/ServiceDelegationsPanel.vue'
import { useServiceAccountManagement } from './composables/useServiceAccountManagement'
import { createServiceAccountPageActions } from './serviceAccountPageActions'

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

const serviceAccountManagement = useServiceAccountManagement()
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
  issueCredentialPending,
  identityMatches,
  onIdentityChanged,
  queryParams,
  refresh,
  removePending,
  revokingCredentialId,
  revokingDelegationId,
  roleIds,
  rolesPending,
  savePending,
  selectedAccount,
  statusPending,
} = serviceAccountManagement

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
  } finally {
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

const {
  closeDetails,
  confirmRemove,
  confirmRevokeCredential,
  confirmRevokeDelegation,
  confirmStatusChange,
  openDetails,
  submitAccount,
  submitCredential,
  submitRoles,
} = createServiceAccountPageActions({
  management: serviceAccountManagement,
  state: {
    accountDialogVisible,
    accountFormIdentity,
    credentialDialogVisible,
    credentialSecret,
    detailDrawerVisible,
    detailIdentity,
    editingAccount,
    pendingAccountId,
    secretDialogVisible,
  },
  t,
})
</script>

<style scoped src="./serviceAccountsPage.css"></style>
