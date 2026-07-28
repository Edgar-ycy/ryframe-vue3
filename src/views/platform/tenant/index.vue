<template>
  <div class="app-container">
    <el-card>
      <template #header>
        <div class="header">
          <span>{{ t('account.tenantManagement') }}</span>
          <el-button v-perm="'tenant:add'" type="primary" @click="openCreate">{{ t('account.createTenant') }}</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="tenants">
        <el-table-column prop="tenant_id" :label="t('account.tenantId')" />
        <el-table-column prop="name" :label="t('account.tenantName')" />
        <el-table-column prop="domain" :label="t('account.domain')" />
        <el-table-column prop="expire_at" :label="t('account.expiry')" />
        <el-table-column :label="t('account.quota')" min-width="260">
          <template #default="{ row }">
            {{ t('account.tenantQuota', {
              users: row.max_users,
              roles: row.max_roles,
              storage: row.max_storage_mb,
              requests: row.max_requests_per_min,
            }) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('account.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'">
              {{ row.status === '1' ? t('account.enabled') : t('account.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('account.actions')" width="180">
          <template #default="{ row }">
            <el-button v-perm="'tenant:edit'" link @click="openEdit(row)">{{ t('account.editTenant') }}</el-button>
            <el-button v-perm="'tenant:status'" link :disabled="row.tenant_id === 'system'" @click="toggle(row)">
              {{ row.status === '1' ? t('account.disabled') : t('account.enabled') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="visible" :title="editingTenantId ? t('account.editTenant') : t('account.createTenant')" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
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
        <el-button v-if="editingTenantId" v-perm="'tenant:edit'" type="primary" @click="submit">{{ t('account.save') }}</el-button>
        <el-button v-else v-perm="'tenant:add'" type="primary" @click="submit">{{ t('account.createTenant') }}</el-button>
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
} from '@/api/modules/tenant'
import {
  PASSWORD_POLICY,
} from '@/shared/security/passwordPolicy'
import { isValidTenantId } from '@/shared/security/tenantId'

const { t } = useI18n()

const loading = ref(false)
const visible = ref(false)
const editingTenantId = ref<string | null>(null)
const tenants = ref<Tenant[]>([])
const formRef = ref<FormInstance>()

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

async function load() {
  loading.value = true
  try {
    const result = await listTenants()
    tenants.value = result.data ?? []
  } finally {
    loading.value = false
  }
}

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
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (editingTenantId.value) {
    await updateTenant(editingTenantId.value, {
      name: form.name,
      domain: form.domain || undefined,
      expire_at: form.expire_at || undefined,
      max_users: form.max_users || 1,
      max_roles: form.max_roles || 2,
      max_storage_mb: form.max_storage_mb || 1,
      max_requests_per_min: form.max_requests_per_min || 1,
    })
  } else {
    await createTenant({
      ...form,
      domain: form.domain || undefined,
      expire_at: form.expire_at || undefined,
    })
  }

  visible.value = false
  ElMessage.success(editingTenantId.value ? t('account.tenantUpdated') : t('account.tenantCreated'))
  await load()
}

async function toggle(row: Tenant) {
  if (row.tenant_id === 'system') {
    ElMessage.warning(t('account.systemTenantCannotDisable'))
    return
  }
  await updateTenantStatus(row.tenant_id, row.status === '1' ? '0' : '1')
  ElMessage.success(t('account.tenantStatusUpdated'))
  await load()
}

onMounted(load)

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
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
