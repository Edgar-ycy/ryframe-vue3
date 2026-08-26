<template>
  <el-dialog
    v-model="visible"
    :title="tenant ? t('tenantCapacity.editTenant') : t('tenantCapacity.createTenant')"
    width="min(560px, calc(100vw - 24px))"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    destroy-on-close
    @open="handleOpen"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="132px" class="tenant-form">
      <el-form-item :label="t('tenantCapacity.formTenantId')" prop="tenant_id">
        <el-input v-model="form.tenant_id" :disabled="Boolean(tenant)" maxlength="64" />
      </el-form-item>
      <el-form-item :label="t('tenantCapacity.formTenantName')" prop="name">
        <el-input v-model="form.name" maxlength="100" />
      </el-form-item>
      <el-form-item v-if="!tenant" :label="t('tenantCapacity.adminUsername')" prop="admin_username">
        <el-input v-model="form.admin_username" maxlength="64" autocomplete="off" />
      </el-form-item>
      <el-form-item
        v-if="!tenant"
        :label="t('tenantCapacity.initialPassword')"
        prop="admin_password"
      >
        <el-input
          v-model="form.admin_password"
          type="password"
          :maxlength="PASSWORD_POLICY.max_length"
          :placeholder="t('tenantCapacity.passwordHint', { min: PASSWORD_POLICY.min_length })"
          autocomplete="new-password"
          show-password
        />
      </el-form-item>
      <el-form-item
        v-if="!tenant"
        :label="t('tenantCapacity.productPlanVersion')"
        prop="plan_version_id"
      >
        <el-select
          v-model="form.plan_version_id"
          class="form-control"
          filterable
          :loading="creationOptionsLoading"
          :placeholder="t('tenantCapacity.selectPublishedPlanVersion')"
        >
          <el-option
            v-for="option in publishedPlanVersions"
            :key="option.id"
            :label="`${option.planName} · v${option.version}`"
            :value="option.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="!tenant" :label="t('tenantCapacity.dataTarget')" prop="data_target_key">
        <el-select
          v-model="form.data_target_key"
          class="form-control"
          filterable
          :loading="creationOptionsLoading"
          :placeholder="t('tenantCapacity.selectDataTarget')"
        >
          <el-option
            v-for="target in dataTargets"
            :key="target.key"
            :label="dataTargetLabel(target)"
            :value="target.key"
          />
        </el-select>
      </el-form-item>
      <el-alert
        v-if="!tenant && creationOptionsError"
        :title="t('tenantCapacity.creationOptionsUnavailable')"
        type="warning"
        show-icon
        :closable="false"
      />
      <el-form-item :label="t('tenantCapacity.formDomain')">
        <el-input v-model="form.domain" maxlength="255" />
      </el-form-item>
      <el-form-item :label="t('tenantCapacity.formExpireAt')">
        <el-date-picker
          v-model="form.expire_at"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
          clearable
          class="form-control"
        />
      </el-form-item>
      <el-divider content-position="left">{{ t('tenantCapacity.quotaConfiguration') }}</el-divider>
      <p class="quota-hint">{{ t('tenantCapacity.zeroUnlimitedHint') }}</p>
      <el-form-item :label="t('tenantCapacity.maxUsers')">
        <el-input-number
          v-model="form.max_users"
          :min="0"
          :max="2147483647"
          :precision="0"
          class="form-control"
        />
      </el-form-item>
      <el-form-item :label="t('tenantCapacity.maxRoles')" prop="max_roles">
        <el-input-number
          v-model="form.max_roles"
          :min="0"
          :max="2147483647"
          :precision="0"
          class="form-control"
        />
      </el-form-item>
      <el-form-item :label="t('tenantCapacity.maxStorage')">
        <el-input-number
          v-model="form.max_storage_mb"
          :min="0"
          :max="Number.MAX_SAFE_INTEGER"
          :precision="0"
          class="form-control"
        />
      </el-form-item>
      <el-form-item :label="t('tenantCapacity.maxRequests')">
        <el-input-number
          v-model="form.max_requests_per_min"
          :min="0"
          :max="2147483647"
          :precision="0"
          class="form-control"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">{{
        t('tenantCapacity.cancel')
      }}</el-button>
      <el-button
        v-perm="tenant ? 'tenant:edit' : 'tenant:add'"
        type="primary"
        :loading="submitting"
        :disabled="submitting"
        @click="submit"
      >
        {{ tenant ? t('tenantCapacity.save') : t('tenantCapacity.create') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { CreateTenantPayload, TenantCapacity, UpdateTenantPayload } from '@/api/modules/tenant'
import { listAllDataTargetOptions, type DataTargetSummary } from '@/api/modules/dataTarget'
import {
  getProductPlan,
  listProductPlans,
  type ProductPlanVersion,
} from '@/api/modules/productPlan'
import { requireOperationData } from '@/shared/http/client'
import { PASSWORD_POLICY } from '@/shared/security/passwordPolicy'
import { isValidTenantId } from '@/shared/security/tenantId'

type TenantFormModel = {
  tenant_id: string
  name: string
  domain: string
  expire_at: string
  max_users: number
  max_roles: number
  max_storage_mb: number
  max_requests_per_min: number
  admin_username: string
  admin_password: string
  plan_version_id: string
  data_target_key: string
}

type PublishedPlanVersionOption = ProductPlanVersion & { planName: string }

const props = defineProps<{
  tenant?: TenantCapacity
  submitting: boolean
}>()

const emit = defineEmits<{
  create: [payload: CreateTenantPayload]
  update: [tenantId: string, payload: UpdateTenantPayload]
}>()

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()
const form = reactive<TenantFormModel>(createDefaultForm())
const creationOptionsLoading = ref(false)
const creationOptionsError = ref(false)
const publishedPlanVersions = ref<PublishedPlanVersionOption[]>([])
const dataTargets = ref<DataTargetSummary[]>([])
let optionsGeneration = 0

const validateNewPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  const message = passwordValidationMessage(String(value ?? ''))
  callback(message ? new Error(message) : undefined)
}

const rules: FormRules<TenantFormModel> = {
  tenant_id: [
    { required: true, message: t('tenantCapacity.tenantIdRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        callback(
          isValidTenantId(String(value ?? ''))
            ? undefined
            : new Error(t('tenantCapacity.tenantIdInvalid')),
        )
      },
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: t('tenantCapacity.tenantNameRequired'), trigger: 'blur' }],
  admin_username: [
    { required: true, message: t('tenantCapacity.adminUsernameRequired'), trigger: 'blur' },
  ],
  admin_password: [
    { required: true, message: t('tenantCapacity.initialPasswordRequired'), trigger: 'blur' },
    { validator: validateNewPassword, trigger: 'blur' },
  ],
  plan_version_id: [
    { required: true, message: t('tenantCapacity.planVersionRequired'), trigger: 'change' },
  ],
  data_target_key: [
    { required: true, message: t('tenantCapacity.dataTargetRequired'), trigger: 'change' },
  ],
  max_roles: [
    {
      validator: (_rule, value, callback) => {
        const roleLimit = Number(value)
        callback(
          roleLimit === 0 || roleLimit >= 2
            ? undefined
            : new Error(t('tenantCapacity.maxRolesInvalid')),
        )
      },
      trigger: 'change',
    },
  ],
}

function createDefaultForm(): TenantFormModel {
  return {
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
    plan_version_id: '',
    data_target_key: '',
  }
}

function handleOpen(): void {
  Object.assign(
    form,
    props.tenant
      ? {
          tenant_id: props.tenant.tenant_id,
          name: props.tenant.name,
          domain: props.tenant.domain ?? '',
          expire_at: props.tenant.expire_at ?? '',
          max_users: props.tenant.max_users,
          max_roles: props.tenant.max_roles,
          max_storage_mb: props.tenant.max_storage_mb,
          max_requests_per_min: props.tenant.max_requests_per_min,
          admin_username: '',
          admin_password: '',
          plan_version_id: '',
          data_target_key: '',
        }
      : createDefaultForm(),
  )
  void nextTick(() => formRef.value?.clearValidate())
  if (!props.tenant) void loadCreationOptions()
}

function handleClosed(): void {
  optionsGeneration += 1
  creationOptionsLoading.value = false
  formRef.value?.resetFields()
  Object.assign(form, createDefaultForm())
}

async function submit(): Promise<void> {
  if (props.submitting) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (props.tenant) {
    emit('update', props.tenant.tenant_id, {
      name: form.name.trim(),
      domain: form.domain.trim() || undefined,
      expire_at: form.expire_at || undefined,
      max_users: form.max_users,
      max_roles: form.max_roles,
      max_storage_mb: form.max_storage_mb,
      max_requests_per_min: form.max_requests_per_min,
    })
    return
  }
  emit('create', {
    tenant_id: form.tenant_id.trim(),
    name: form.name.trim(),
    domain: form.domain.trim() || undefined,
    expire_at: form.expire_at || undefined,
    max_users: form.max_users,
    max_roles: form.max_roles,
    max_storage_mb: form.max_storage_mb,
    max_requests_per_min: form.max_requests_per_min,
    admin_username: form.admin_username.trim(),
    admin_password: form.admin_password,
    plan_version_id: form.plan_version_id,
    data_target_key: form.data_target_key,
  })
}

async function loadCreationOptions(): Promise<void> {
  const generation = ++optionsGeneration
  creationOptionsLoading.value = true
  creationOptionsError.value = false
  try {
    const [planPage, targets] = await Promise.all([
      listProductPlans({ page: 1, page_size: 100 }).then(requireOperationData),
      listAllDataTargetOptions({ eligible_for: 'new_tenant' }),
    ])
    const details = await Promise.all(
      planPage.items.map((plan) => getProductPlan(plan.id).then(requireOperationData)),
    )
    if (generation !== optionsGeneration) return
    publishedPlanVersions.value = details.flatMap((detail) =>
      detail.versions
        .filter((version) => version.status === 'published')
        .map((version) => ({ ...version, planName: detail.name })),
    )
    dataTargets.value = targets.filter((target) => target.eligible)
  } catch {
    if (generation !== optionsGeneration) return
    publishedPlanVersions.value = []
    dataTargets.value = []
    creationOptionsError.value = true
  } finally {
    if (generation === optionsGeneration) creationOptionsLoading.value = false
  }
}

function dataTargetLabel(target: DataTargetSummary): string {
  const detail = [target.mode, target.kind, target.region].filter(Boolean).join(' · ')
  return `${target.key}${detail ? ` · ${detail}` : ''}`
}

function passwordValidationMessage(password: string): string | undefined {
  if (password.length < PASSWORD_POLICY.min_length)
    return t('tenantCapacity.passwordTooShort', { min: PASSWORD_POLICY.min_length })
  if (password.length > PASSWORD_POLICY.max_length)
    return t('tenantCapacity.passwordTooLong', { max: PASSWORD_POLICY.max_length })
  if (!/^[!-~]+$/.test(password)) return t('tenantCapacity.passwordVisibleAscii')
  if (PASSWORD_POLICY.required_classes.includes('uppercase') && !/[A-Z]/.test(password))
    return t('tenantCapacity.passwordNeedsUppercase')
  if (PASSWORD_POLICY.required_classes.includes('lowercase') && !/[a-z]/.test(password))
    return t('tenantCapacity.passwordNeedsLowercase')
  if (PASSWORD_POLICY.required_classes.includes('digit') && !/[0-9]/.test(password))
    return t('tenantCapacity.passwordNeedsDigit')
  if (PASSWORD_POLICY.required_classes.includes('special') && !/[^A-Za-z0-9]/.test(password))
    return t('tenantCapacity.passwordNeedsSpecial')
  return undefined
}
</script>

<style scoped src="./TenantFormDialog.css"></style>
