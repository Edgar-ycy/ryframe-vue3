<template>
  <div class="page-container tenant-page">
    <el-card shadow="never" class="tenant-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('account.tenantManagement') }}</span>
          <div>
            <el-button v-perm="'tenant:add'" type="primary" icon="Plus" @click="openCreate">{{ t('account.createTenant') }}</el-button>
          </div>
        </div>
      </template>

      <div class="table-scroll">
        <el-table v-loading="loading" :data="tenants ?? []" border stripe class="tenant-table">
          <el-table-column prop="tenant_id" :label="t('account.tenantId')" min-width="130" show-overflow-tooltip />
          <el-table-column prop="name" :label="t('account.tenantName')" min-width="150" show-overflow-tooltip />
          <el-table-column prop="domain" :label="t('account.domain')" min-width="160" show-overflow-tooltip />
          <el-table-column :label="t('account.expiry')" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ formatExpiry(row.expire_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('account.quota')" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              {{ t('account.tenantQuota', {
                users: row.max_users,
                roles: row.max_roles,
                storage: row.max_storage_mb,
                requests: row.max_requests_per_min,
              }) }}
            </template>
          </el-table-column>
          <el-table-column :label="t('account.status')" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === '1' ? 'success' : 'danger'">
                {{ row.status === '1' ? t('account.enabled') : t('account.disabled') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('account.actions')" width="180" fixed="right" align="center">
            <template #default="{ row }">
              <el-button v-perm="'tenant:edit'" type="primary" link icon="Edit" :disabled="statusUpdating" @click="openEdit(row)">{{ t('account.editTenant') }}</el-button>
              <el-button
                v-perm="'tenant:status'"
                :type="row.status === '1' ? 'warning' : 'success'"
                link
                :disabled="row.tenant_id === 'system' || statusUpdating"
                :loading="togglingTenantId === row.tenant_id"
                @click="toggle(row)"
              >
                {{ row.status === '1' ? t('account.disabled') : t('account.enabled') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog v-model="visible" :title="editingTenantId ? t('account.editTenant') : t('account.createTenant')" width="520px" class="tenant-dialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="tenant-form">
        <el-form-item :label="t('account.tenantId')" prop="tenant_id">
          <el-input v-model="form.tenant_id" :disabled="!!editingTenantId" />
        </el-form-item>
        <el-form-item :label="t('account.tenantName')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item v-if="!editingTenantId" :label="t('account.adminUsername')" prop="admin_username">
          <el-input v-model="form.admin_username" />
        </el-form-item>
        <el-form-item v-if="!editingTenantId" :label="t('account.initialPassword')" prop="admin_password">
          <el-input
            v-model="form.admin_password"
            type="password"
            :maxlength="PASSWORD_POLICY.max_length"
            :placeholder="t('account.passwordHint', { min: PASSWORD_POLICY.min_length })"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('account.domain')">
          <el-input v-model="form.domain" />
        </el-form-item>
        <el-form-item :label="t('account.expiry')">
          <el-date-picker
            v-model="form.expire_at"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            clearable
          />
        </el-form-item>
        <el-form-item :label="t('account.maxUsers')">
          <el-input-number v-model="form.max_users" :min="1" />
        </el-form-item>
        <el-form-item :label="t('account.maxRoles')">
          <el-input-number v-model="form.max_roles" :min="2" />
        </el-form-item>
        <el-form-item :label="t('account.storageQuota')">
          <el-input-number v-model="form.max_storage_mb" :min="1" />
        </el-form-item>
        <el-form-item :label="t('account.requestsPerMinute')">
          <el-input-number v-model="form.max_requests_per_min" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">{{ t('account.cancel') }}</el-button>
        <el-button v-if="editingTenantId" v-perm="'tenant:edit'" type="primary" :loading="submitLoading" @click="submit">{{ t('account.save') }}</el-button>
        <el-button v-else v-perm="'tenant:add'" type="primary" :loading="submitLoading" @click="submit">{{ t('account.createTenant') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  createTenant,
  listTenants,
  updateTenant,
  updateTenantStatus,
  type CreateTenantPayload,
  type Tenant,
  type TenantStatus,
  type UpdateTenantPayload,
} from '@/api/modules/tenant'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import {
  PASSWORD_POLICY,
} from '@/shared/security/passwordPolicy'
import { isValidTenantId } from '@/shared/security/tenantId'
import { requireOperationData } from '@/shared/http/client'
import { useUserStore } from '@/stores/user'
import { formatLocalizedDate } from '@/i18n'
import { confirmAction } from '@/utils/confirmAction'

const { t } = useI18n()
const userStore = useUserStore()
const authenticated = () => userStore.sessionStatus === 'authenticated'

const visible = ref(false)
const editingTenantId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const tenantsQuery = useTenantQuery<Tenant[]>(
  () => userStore.tenantId,
  authenticated,
  'tenants',
  () => ({ scope: 'platform-list' }),
  async signal => {
    const response = await listTenants(signal)
    return requireOperationData(response)
  },
)
const tenants = tenantsQuery.data
const loading = tenantsQuery.isFetching

const form = reactive<CreateTenantPayload>({
  tenant_id: '',
  name: '',
  domain: '',
  expire_at: '',
  max_users: 100,
  max_roles: 20,
  max_storage_mb: 1024,
  max_requests_per_min: 1000,
  admin_username: '',
  admin_password: '',
})

const validateNewPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  const message = passwordValidationMessage(String(value ?? ''))
  callback(message ? new Error(message) : undefined)
}

const rules = computed<FormRules>(() => ({
  tenant_id: [
    { required: true, message: t('account.enterTenantId'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        callback(isValidTenantId(String(value ?? '')) ? undefined : new Error(t('account.tenantIdInvalid')))
      },
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: t('account.enterTenantName'), trigger: 'blur' }],
  admin_username: [{ required: true, message: t('account.enterAdminUsername'), trigger: 'blur' }],
  admin_password: [
    { required: true, message: t('account.enterInitialPassword'), trigger: 'blur' },
    { validator: validateNewPassword, trigger: 'blur' },
  ],
}))

type SaveTenantCommand =
  | { kind: 'create'; data: CreateTenantPayload }
  | { kind: 'update'; tenantId: string; data: UpdateTenantPayload }

const saveMutation = useTenantMutation<void, SaveTenantCommand>(
  () => userStore.tenantId,
  'tenants',
  {
    mutationFn: async command => {
      if (command.kind === 'create') {
        await createTenant(command.data)
      } else {
        await updateTenant(command.tenantId, command.data)
      }
    },
    onSuccess: (_data, command) => {
      ElMessage.success(t(command.kind === 'create'
        ? 'account.tenantCreated'
        : 'account.tenantUpdated'))
    },
  },
)
const submitLoading = saveMutation.pending

type ToggleTenantCommand = { tenantId: string; status: TenantStatus }
const statusMutation = useTenantMutation<void, ToggleTenantCommand>(
  () => userStore.tenantId,
  'tenants',
  {
    mutationFn: async command => {
      await updateTenantStatus(command.tenantId, command.status)
    },
    onSuccess: () => {
      ElMessage.success(t('account.tenantStatusUpdated'))
    },
  },
)
const togglingTenantId = computed(() => (
  statusMutation.pending.value ? statusMutation.variables.value?.tenantId ?? null : null
))
const statusUpdating = statusMutation.pending

function resetForm() {
  Object.assign(form, {
    tenant_id: '',
    name: '',
    domain: '',
    expire_at: '',
    max_users: 100,
    max_roles: 20,
    max_storage_mb: 1024,
    max_requests_per_min: 1000,
    admin_username: '',
    admin_password: '',
  })
}

function openCreate() {
  editingTenantId.value = null
  resetForm()
  visible.value = true
}

function openEdit(row: Tenant) {
  editingTenantId.value = row.tenant_id
  Object.assign(form, {
    tenant_id: row.tenant_id,
    name: row.name,
    domain: row.domain || '',
    expire_at: row.expire_at || '',
    max_users: row.max_users,
    max_roles: row.max_roles,
    max_storage_mb: row.max_storage_mb,
    max_requests_per_min: row.max_requests_per_min,
    admin_username: '',
    admin_password: '',
  })
  visible.value = true
}

async function submit() {
  if (saveMutation.pending.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (editingTenantId.value) {
    await saveMutation.mutateAsync({
      kind: 'update',
      tenantId: editingTenantId.value,
      data: {
        name: form.name,
        domain: form.domain || undefined,
        expire_at: form.expire_at || undefined,
        max_users: form.max_users || 1,
        max_roles: form.max_roles || 2,
        max_storage_mb: form.max_storage_mb || 1,
        max_requests_per_min: form.max_requests_per_min || 1,
      },
    })
  } else {
    await saveMutation.mutateAsync({
      kind: 'create',
      data: {
        ...form,
        domain: form.domain || undefined,
        expire_at: form.expire_at || undefined,
      },
    })
  }

  visible.value = false
  await tenantsQuery.refetch({ throwOnError: true })
}

async function toggle(row: Tenant) {
  if (statusMutation.pending.value) return
  if (row.tenant_id === 'system') {
    ElMessage.warning(t('account.systemTenantCannotDisable'))
    return
  }
  const nextStatus: TenantStatus = row.status === '1' ? '0' : '1'
  const confirmed = await confirmAction(
    t('account.tenantStatusConfirm', {
      name: row.name || row.tenant_id,
      status: nextStatus === '1' ? t('account.enabled') : t('account.disabled'),
    }),
    t('account.tenantStatusConfirmTitle'),
    { type: 'warning' },
  )
  if (!confirmed || statusMutation.pending.value) return
  await statusMutation.mutateAsync({
    tenantId: row.tenant_id,
    status: nextStatus,
  })
  await tenantsQuery.refetch({ throwOnError: true })
}

function formatExpiry(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return formatLocalizedDate(value)
  }
  catch {
    return value
  }
}

function passwordValidationMessage(password: string): string | undefined {
  if (password.length < PASSWORD_POLICY.min_length) {
    return t('account.passwordTooShort', { min: PASSWORD_POLICY.min_length })
  }
  if (password.length > PASSWORD_POLICY.max_length) {
    return t('account.passwordTooLong', { max: PASSWORD_POLICY.max_length })
  }
  if (!/^[!-~]+$/.test(password)) return t('account.passwordVisibleAscii')
  if (PASSWORD_POLICY.required_classes.includes('uppercase') && !/[A-Z]/.test(password)) {
    return t('account.passwordNeedsUppercase')
  }
  if (PASSWORD_POLICY.required_classes.includes('lowercase') && !/[a-z]/.test(password)) {
    return t('account.passwordNeedsLowercase')
  }
  if (PASSWORD_POLICY.required_classes.includes('digit') && !/[0-9]/.test(password)) {
    return t('account.passwordNeedsDigit')
  }
  if (PASSWORD_POLICY.required_classes.includes('special') && !/[^A-Za-z0-9]/.test(password)) {
    return t('account.passwordNeedsSpecial')
  }
  return undefined
}
</script>

<style scoped>
.tenant-page {
  min-width: 0;
  max-width: 100%;
}

.table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.tenant-table {
  min-width: 1120px;
}

@media (width <= 480px) {
  .tenant-form :deep(.el-form-item) {
    display: block;
  }

  .tenant-form :deep(.el-form-item__label) {
    display: block;
    width: 100% !important;
    height: auto;
    padding: 0 0 6px;
    line-height: 1.4;
    text-align: left;
  }

  .tenant-form :deep(.el-form-item__content) {
    display: flex;
    width: 100%;
    margin-left: 0 !important;
  }

  .tenant-form :deep(.el-input),
  .tenant-form :deep(.el-input-number),
  .tenant-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}
</style>
