<template>
  <el-dialog
    v-model="visible"
    :title="t('serviceAccounts.rotateKey')"
    width="min(500px, calc(100vw - 24px))"
    destroy-on-close
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    @open="initializeForm"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item :label="t('serviceAccounts.credentialLabel')" prop="label">
        <el-input
          v-model="form.label"
          :placeholder="t('serviceAccounts.credentialLabelPlaceholder')"
          maxlength="128"
          autocomplete="off"
        />
      </el-form-item>
      <el-form-item :label="t('serviceAccounts.expiresAt')" prop="expires_at">
        <el-date-picker
          v-model="form.expires_at"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
          :disabled-date="disablePastDate"
          class="full-width"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">
        {{ t('serviceAccounts.cancel') }}
      </el-button>
      <el-button type="primary" :loading="submitting" :disabled="submitting" @click="submit">
        {{ t('serviceAccounts.rotateKey') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { CreateServiceCredentialInput } from '@/api/modules/serviceAccount'

interface CredentialFormState {
  label: string
  expires_at: string
}

const props = defineProps<{ submitting: boolean }>()
const emit = defineEmits<{ submit: [input: CreateServiceCredentialInput] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()

function defaultExpiration(): string {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
}

function emptyForm(): CredentialFormState {
  return { label: '', expires_at: defaultExpiration() }
}

const form = ref<CredentialFormState>(emptyForm())
const rules = computed<FormRules<CredentialFormState>>(() => ({
  label: [
    { required: true, message: t('serviceAccounts.credentialLabelPlaceholder'), trigger: 'blur' },
  ],
  expires_at: [{ required: true, message: t('serviceAccounts.expiresAt'), trigger: 'change' }],
}))

function initializeForm(): void {
  form.value = emptyForm()
}

function resetForm(): void {
  form.value = emptyForm()
  formRef.value?.clearValidate()
}

function disablePastDate(value: Date): boolean {
  return value.getTime() < new Date().setHours(0, 0, 0, 0)
}

async function submit(): Promise<void> {
  if (props.submitting) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', {
    label: form.value.label.trim(),
    expires_at: new Date(form.value.expires_at).toISOString(),
  })
}
</script>

<style scoped>
.full-width {
  width: 100%;
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
