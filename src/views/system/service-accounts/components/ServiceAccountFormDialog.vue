<template>
  <el-dialog
    v-model="visible"
    :title="account ? t('serviceAccounts.editAccount') : t('serviceAccounts.createAccount')"
    width="min(560px, calc(100vw - 24px))"
    destroy-on-close
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    @open="initializeForm"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item :label="t('serviceAccounts.code')" prop="code">
        <el-input
          v-model="form.code"
          :disabled="Boolean(account)"
          :placeholder="t('serviceAccounts.codePlaceholder')"
          maxlength="64"
          autocomplete="off"
        />
      </el-form-item>
      <el-form-item :label="t('serviceAccounts.name')" prop="name">
        <el-input
          v-model="form.name"
          :placeholder="t('serviceAccounts.namePlaceholder')"
          maxlength="128"
          autocomplete="off"
        />
      </el-form-item>
      <el-form-item :label="t('serviceAccounts.description')" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          :placeholder="t('serviceAccounts.descriptionPlaceholder')"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      <el-form-item :label="t('serviceAccounts.department')" prop="dept_id">
        <el-tree-select
          v-model="form.dept_id"
          :data="departmentTree"
          :props="departmentProps"
          value-key="id"
          check-strictly
          clearable
          filterable
          :render-after-expand="false"
          :disabled="!canListDepartments"
          :placeholder="t('serviceAccounts.noDepartment')"
          class="full-width"
        />
      </el-form-item>
      <el-form-item :label="t('serviceAccounts.maxRequests')" prop="max_requests_per_minute">
        <el-input-number
          v-model="form.max_requests_per_minute"
          :min="1"
          :max="10000"
          :step="10"
          controls-position="right"
          class="full-width"
        />
        <p class="form-hint">{{ t('serviceAccounts.maxRequestsHint') }}</p>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">
        {{ t('serviceAccounts.cancel') }}
      </el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="submitting"
        @click="submit"
      >
        {{ t('serviceAccounts.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type {
  CreateServiceAccountInput,
  ServiceAccount,
  UpdateServiceAccountInput,
} from '@/api/modules/serviceAccount'
import type { DeptNode } from '@/api/modules/dept'

interface ServiceAccountFormState {
  code: string
  name: string
  description: string
  dept_id: string | undefined
  max_requests_per_minute: number
}

const props = defineProps<{
  account: ServiceAccount | null
  departmentTree: readonly DeptNode[]
  canListDepartments: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  submit: [input: CreateServiceAccountInput | UpdateServiceAccountInput]
}>()

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()
const departmentProps = { label: 'name', children: 'children', value: 'id' } as const

function emptyForm(): ServiceAccountFormState {
  return {
    code: '',
    name: '',
    description: '',
    dept_id: undefined,
    max_requests_per_minute: 60,
  }
}

const form = ref<ServiceAccountFormState>(emptyForm())
const rules = computed<FormRules<ServiceAccountFormState>>(() => ({
  code: [
    { required: true, message: t('serviceAccounts.codeRequired'), trigger: 'blur' },
    { pattern: /^[a-z0-9_-]{1,64}$/, message: t('serviceAccounts.codeInvalid'), trigger: 'blur' },
  ],
  name: [{ required: true, message: t('serviceAccounts.nameRequired'), trigger: 'blur' }],
  max_requests_per_minute: [{
    validator: (_rule, value: number, callback) => {
      if (Number.isInteger(value) && value >= 1 && value <= 10000) callback()
      else callback(new Error(t('serviceAccounts.maxRequestsInvalid')))
    },
    trigger: 'change',
  }],
}))

function initializeForm(): void {
  const account = props.account
  form.value = account
    ? {
        code: account.code,
        name: account.name,
        description: account.description ?? '',
        dept_id: account.dept_id ?? undefined,
        max_requests_per_minute: account.max_requests_per_minute,
      }
    : emptyForm()
}

function resetForm(): void {
  form.value = emptyForm()
  formRef.value?.clearValidate()
}

async function submit(): Promise<void> {
  if (props.submitting) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const input = props.account
    ? {
        name: form.value.name.trim(),
        description: form.value.description.trim() || null,
        dept_id: props.canListDepartments
          ? form.value.dept_id ?? null
          : props.account.dept_id ?? null,
        max_requests_per_minute: form.value.max_requests_per_minute,
      }
    : {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        description: form.value.description.trim() || null,
        dept_id: form.value.dept_id ?? null,
        max_requests_per_minute: form.value.max_requests_per_minute,
      }
  emit('submit', input)
}
</script>

<style scoped>
.full-width {
  width: 100%;
}

.form-hint {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (width < 480px) {
  :deep(.el-dialog__footer) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :deep(.el-dialog__footer .el-button) {
    min-height: 44px;
    margin-left: 0;
  }
}
</style>
