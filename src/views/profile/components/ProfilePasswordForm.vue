<template>
  <el-card shadow="never">
    <template #header>
      <span>{{ t('account.changePassword') }}</span>
    </template>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('account.currentPassword')" prop="old_password">
        <el-input
          v-model="form.old_password"
          type="password"
          :maxlength="PASSWORD_POLICY.max_length"
          :placeholder="t('account.enterCurrentPassword')"
          show-password
        />
      </el-form-item>
      <el-form-item :label="t('account.newPassword')" prop="new_password">
        <el-input
          v-model="form.new_password"
          type="password"
          :maxlength="PASSWORD_POLICY.max_length"
          :placeholder="t('account.passwordHint', { min: PASSWORD_POLICY.min_length })"
          show-password
        />
      </el-form-item>
      <el-form-item :label="t('account.confirmNewPassword')" prop="confirm_password">
        <el-input
          v-model="form.confirm_password"
          type="password"
          :maxlength="PASSWORD_POLICY.max_length"
          :placeholder="t('account.enterConfirmPassword')"
          show-password
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="submit">
          {{ t('account.changePassword') }}
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { FormItemRule } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  PASSWORD_POLICY,
} from '@/shared/security/passwordPolicy'
import { useProfilePasswordMutation } from '../useProfileMutations'

const formRef = ref<FormInstance>()
const form = ref({ old_password: '', new_password: '', confirm_password: '' })
const { t } = useI18n()
const { savePassword, submitting } = useProfilePasswordMutation(t, resetPasswordForm)

const validateNewPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  const password = String(value ?? '')
  if (password === form.value.old_password) {
    callback(new Error(t('account.passwordSameAsCurrent')))
    return
  }
  const message = passwordValidationMessage(password)
  callback(message ? new Error(message) : undefined)
}

const validateConfirmPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  callback(value === form.value.new_password ? undefined : new Error(t('account.passwordMismatch')))
}

const rules = computed<FormRules>(() => ({
  old_password: [{ required: true, message: t('account.enterCurrentPassword'), trigger: 'blur' }],
  new_password: [
    { required: true, message: t('account.enterNewPassword'), trigger: 'blur' },
    { validator: validateNewPassword, trigger: 'blur' },
  ],
  confirm_password: [
    { required: true, message: t('account.enterConfirmPassword'), trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}))

async function submit(): Promise<void> {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  await savePassword({
    old_password: form.value.old_password,
    new_password: form.value.new_password,
  })
}

function resetPasswordForm(): void {
  form.value = { old_password: '', new_password: '', confirm_password: '' }
  formRef.value?.resetFields()
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
