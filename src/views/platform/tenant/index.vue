<template>
  <div class="app-container">
    <el-card>
      <template #header>
        <div class="header">
          <span>租户管理</span>
          <el-button v-perm="'tenant:add'" type="primary" @click="openCreate">创建租户</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="tenants">
        <el-table-column prop="tenant_id" label="租户标识" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="domain" label="域名" />
        <el-table-column prop="expire_at" label="有效期" />
        <el-table-column label="配额" min-width="260">
          <template #default="{ row }">
            用户 {{ row.max_users }} / 角色 {{ row.max_roles }} / 存储 {{ row.max_storage_mb }}MB / {{ row.max_requests_per_min }} RPM
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'">
              {{ row.status === '1' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button v-perm="'tenant:edit'" link @click="openEdit(row)">编辑</el-button>
            <el-button v-perm="'tenant:status'" link :disabled="row.tenant_id === 'system'" @click="toggle(row)">
              {{ row.status === '1' ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="visible" :title="editingTenantId ? '编辑租户' : '创建租户'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="租户标识" prop="tenant_id">
          <el-input v-model="form.tenant_id" :disabled="!!editingTenantId" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item v-if="!editingTenantId" label="管理员账号" prop="admin_username">
          <el-input v-model="form.admin_username" />
        </el-form-item>
        <el-form-item v-if="!editingTenantId" label="初始密码" prop="admin_password">
          <el-input
            v-model="form.admin_password"
            type="password"
            :maxlength="PASSWORD_POLICY.max_length"
            placeholder="至少 8 位，含大小写字母、数字和符号"
            show-password
          />
        </el-form-item>
        <el-form-item label="域名">
          <el-input v-model="form.domain" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker
            v-model="form.expire_at"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            clearable
          />
        </el-form-item>
        <el-form-item label="最大用户数">
          <el-input-number v-model="form.max_users" :min="1" />
        </el-form-item>
        <el-form-item label="最大角色数">
          <el-input-number v-model="form.max_roles" :min="1" />
        </el-form-item>
        <el-form-item label="存储配额(MB)">
          <el-input-number v-model="form.max_storage_mb" :min="1" />
        </el-form-item>
        <el-form-item label="每分钟请求数">
          <el-input-number v-model="form.max_requests_per_min" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button v-if="editingTenantId" v-perm="'tenant:edit'" type="primary" @click="submit">保存</el-button>
        <el-button v-else v-perm="'tenant:add'" type="primary" @click="submit">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
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
  newPasswordValidationMessage,
} from '@/shared/security/passwordPolicy'

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
  const message = newPasswordValidationMessage(String(value ?? ''))
  callback(message ? new Error(message) : undefined)
}

const rules: FormRules = {
  tenant_id: [{ required: true, message: '请输入租户标识', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  admin_username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  admin_password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { validator: validateNewPassword, trigger: 'blur' },
  ],
}

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
      max_roles: form.max_roles || 1,
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
  ElMessage.success(editingTenantId.value ? '租户已更新' : '租户已创建')
  await load()
}

async function toggle(row: Tenant) {
  if (row.tenant_id === 'system') {
    ElMessage.warning('system 租户不能停用')
    return
  }
  await updateTenantStatus(row.tenant_id, row.status === '1' ? '0' : '1')
  ElMessage.success('状态已更新')
  await load()
}

onMounted(load)
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
