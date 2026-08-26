<template>
  <el-dialog
    v-model="visible"
    :title="t('profile.serviceDelegations.createTitle')"
    width="min(580px, calc(100vw - 24px))"
    destroy-on-close
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    @open="initializeForm"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item
        :label="t('profile.serviceDelegations.serviceAccount')"
        prop="service_account_id"
      >
        <el-select
          v-model="form.service_account_id"
          filterable
          :placeholder="t('profile.serviceDelegations.accountPlaceholder')"
          class="full-width"
          @change="handleAccountChange"
        >
          <el-option
            v-for="target in targets"
            :key="target.account_id"
            :value="target.account_id"
            :label="`${target.account_name} (${target.account_code})`"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('profile.serviceDelegations.capabilities')" prop="capability_keys">
        <el-select
          v-model="form.capability_keys"
          multiple
          filterable
          :disabled="!form.service_account_id"
          :placeholder="t('profile.serviceDelegations.capabilitiesPlaceholder')"
          class="full-width"
        >
          <el-option
            v-for="capability in selectedCapabilities()"
            :key="capability.key"
            :value="capability.key"
            :label="capability.key"
          >
            <span>{{ capability.key }}</span>
            <small class="capability-permission">{{ capability.permission }}</small>
          </el-option>
        </el-select>
        <p class="form-hint">{{ t('profile.serviceDelegations.capabilityHint') }}</p>
      </el-form-item>
      <el-form-item :label="t('profile.serviceDelegations.reason')" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          :placeholder="t('profile.serviceDelegations.reasonPlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="t('profile.serviceDelegations.expiration')" prop="expires_at">
        <el-date-picker
          v-model="form.expires_at"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
          :disabled-date="disableOutsideRange"
          class="full-width"
        />
        <p class="form-hint">{{ t('profile.serviceDelegations.defaultExpiration') }}</p>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">
        {{ t('profile.serviceDelegations.cancel') }}
      </el-button>
      <el-button type="primary" :loading="submitting" :disabled="submitting" @click="submit">
        {{ t('profile.serviceDelegations.submit') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type {
  CreateProfileServiceDelegationInput,
  ProfileServiceCapability,
  ProfileServiceDelegationTarget,
} from '@/api/modules/profileServiceDelegation'

interface DelegationFormState {
  service_account_id: string
  capability_keys: string[]
  reason: string
  expires_at: string
}

const props = defineProps<{
  targets: readonly ProfileServiceDelegationTarget[]
  submitting: boolean
}>()
const emit = defineEmits<{ submit: [input: CreateProfileServiceDelegationInput] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()

function defaultExpiration(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

function emptyForm(): DelegationFormState {
  return {
    service_account_id: '',
    capability_keys: [],
    reason: '',
    expires_at: defaultExpiration(),
  }
}

const form = ref<DelegationFormState>(emptyForm())
const rules = computed<FormRules<DelegationFormState>>(() => ({
  service_account_id: [
    { required: true, message: t('profile.serviceDelegations.accountRequired'), trigger: 'change' },
  ],
  capability_keys: [
    {
      validator: (_rule, value: string[], callback) => {
        if (value.length >= 1 && value.length <= 16) callback()
        else callback(new Error(t('profile.serviceDelegations.capabilitiesRequired')))
      },
      trigger: 'change',
    },
  ],
  reason: [
    { required: true, message: t('profile.serviceDelegations.reasonRequired'), trigger: 'blur' },
  ],
  expires_at: [
    {
      validator: (_rule, value: string, callback) => {
        const timestamp = Date.parse(value)
        const maximum = Date.now() + 30 * 24 * 60 * 60 * 1000
        if (timestamp > Date.now() && timestamp <= maximum) callback()
        else callback(new Error(t('profile.serviceDelegations.expirationInvalid')))
      },
      trigger: 'change',
    },
  ],
}))

function initializeForm(): void {
  form.value = emptyForm()
}

function resetForm(): void {
  form.value = emptyForm()
  formRef.value?.clearValidate()
}

function handleAccountChange(): void {
  form.value.capability_keys = []
  formRef.value?.clearValidate('capability_keys')
}

function selectedCapabilities(): readonly ProfileServiceCapability[] {
  return (
    props.targets.find((target) => target.account_id === form.value.service_account_id)
      ?.capabilities ?? []
  )
}

function disableOutsideRange(value: Date): boolean {
  const start = new Date().setHours(0, 0, 0, 0)
  const end = Date.now() + 30 * 24 * 60 * 60 * 1000
  return value.getTime() < start || value.getTime() > end
}

async function submit(): Promise<void> {
  if (props.submitting) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', {
    service_account_id: form.value.service_account_id,
    capability_keys: [...form.value.capability_keys],
    reason: form.value.reason.trim(),
    expires_at: new Date(form.value.expires_at).toISOString(),
  })
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

.capability-permission {
  float: right;
  margin-left: 12px;
  color: var(--el-text-color-secondary);
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
