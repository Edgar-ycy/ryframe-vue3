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
import { nextTick, onBeforeUnmount, onDeactivated, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CreateTenantPayload, TenantCapacity, UpdateTenantPayload } from '@/api/modules/tenant'
import { listAllDataTargetOptions, type DataTargetSummary } from '@/api/modules/dataTarget'
import {
  getProductPlan,
  listProductPlans,
  type ProductPlanVersion,
} from '@/api/modules/productPlan'
import { requireOperationData } from '@/shared/http/client'
import { useServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'
import { PASSWORD_POLICY } from '@/shared/security/passwordPolicy'
import { isValidTenantId } from '@/shared/security/tenantId'
import {
  buildCreateTenantPayload,
  buildUpdateTenantPayload,
  createDefaultTenantForm,
  tenantPasswordValidationMessage,
  type TenantFormModel,
} from './tenantFormModel'

type PublishedPlanVersionOption = ProductPlanVersion & { planName: string }

const props = defineProps<{
  tenant?: TenantCapacity
  submitting: boolean
}>()

const emit = defineEmits<{
  create: [payload: CreateTenantPayload, scope: ServerStateScope]
  update: [tenantId: string, payload: UpdateTenantPayload, scope: ServerStateScope]
}>()

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()
const form = reactive<TenantFormModel>(createDefaultTenantForm())
const creationOptionsLoading = ref(false)
const creationOptionsError = ref(false)
const publishedPlanVersions = ref<PublishedPlanVersionOption[]>([])
const dataTargets = ref<DataTargetSummary[]>([])
const pageGeneration = ref(0)
let optionsGeneration = 0

const validateNewPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  const message = tenantPasswordValidationMessage(String(value ?? ''), t)
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
      : createDefaultTenantForm(),
  )
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () => visible.value && pageGeneration.value === generation
  void nextTick(() => {
    if (operation.isCurrent(ownsOperation)) formRef.value?.clearValidate()
  })
  if (!props.tenant) void loadCreationOptions()
}

function handleClosed(): void {
  pageGeneration.value += 1
  optionsGeneration += 1
  creationOptionsLoading.value = false
  creationOptionsError.value = false
  publishedPlanVersions.value = []
  dataTargets.value = []
  formRef.value?.resetFields()
  Object.assign(form, createDefaultTenantForm())
}

async function submit(): Promise<void> {
  if (props.submitting) return
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () => visible.value && pageGeneration.value === generation
  const tenant = props.tenant
  const valid = await formRef.value?.validate().catch(() => false)
  if (!operation.isCurrent(ownsOperation)) return
  if (!valid) return
  if (tenant) {
    emit('update', tenant.tenant_id, buildUpdateTenantPayload(form), operation.scope)
    return
  }
  emit('create', buildCreateTenantPayload(form), operation.scope)
}

async function loadCreationOptions(): Promise<void> {
  const generation = ++optionsGeneration
  const page = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () =>
    visible.value && pageGeneration.value === page && optionsGeneration === generation
  creationOptionsLoading.value = true
  creationOptionsError.value = false
  try {
    const [planPage, targets] = await Promise.all([
      listProductPlans({ page: 1, page_size: 100 }).then(requireOperationData),
      listAllDataTargetOptions({ eligible_for: 'new_tenant' }),
    ])
    operation.assertCurrent(ownsOperation)
    const details = await Promise.all(
      planPage.items.map((plan) => getProductPlan(plan.id).then(requireOperationData)),
    )
    operation.apply(() => {
      publishedPlanVersions.value = details.flatMap((detail) =>
        detail.versions
          .filter((version) => version.status === 'published')
          .map((version) => ({ ...version, planName: detail.name })),
      )
      dataTargets.value = targets.filter((target) => target.eligible)
    }, ownsOperation)
  } catch {
    if (operation.isCurrent(ownsOperation)) {
      publishedPlanVersions.value = []
      dataTargets.value = []
      creationOptionsError.value = true
    }
  } finally {
    if (operation.isCurrent(ownsOperation)) creationOptionsLoading.value = false
  }
}

function invalidateForm(): void {
  pageGeneration.value += 1
  optionsGeneration += 1
  creationOptionsLoading.value = false
  creationOptionsError.value = false
  publishedPlanVersions.value = []
  dataTargets.value = []
  Object.assign(form, createDefaultTenantForm())
  visible.value = false
}

watch(useServerStateScope(), invalidateForm, { flush: 'sync' })
onDeactivated(invalidateForm)
onBeforeUnmount(invalidateForm)

function dataTargetLabel(target: DataTargetSummary): string {
  const detail = [target.mode, target.kind, target.region].filter(Boolean).join(' · ')
  return `${target.key}${detail ? ` · ${detail}` : ''}`
}
</script>

<style scoped src="./TenantFormDialog.css"></style>
