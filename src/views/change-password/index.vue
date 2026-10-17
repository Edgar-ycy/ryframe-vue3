<template>
  <AuthLayout :brand="t('account.appTitle')" :description="t('account.welcomeDescription')">
    <h2 class="auth-title">{{ t('account.initialPasswordTitle') }}</h2>
    <p class="auth-description">{{ t('account.initialPasswordDescription') }}</p>
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      size="large"
      class="auth-form"
      @submit.prevent="submit"
    >
      <el-form-item prop="old_password" :label="t('account.currentPassword')">
        <el-input
          v-model="form.old_password"
          type="password"
          show-password
          autocomplete="current-password"
        />
      </el-form-item>
      <el-form-item prop="new_password" :label="t('account.newPassword')">
        <el-input
          v-model="form.new_password"
          type="password"
          show-password
          autocomplete="new-password"
          :maxlength="PASSWORD_POLICY.max_length"
        />
      </el-form-item>
      <el-form-item prop="confirmation" :label="t('account.confirmNewPassword')">
        <el-input
          v-model="form.confirmation"
          type="password"
          show-password
          autocomplete="new-password"
          :maxlength="PASSWORD_POLICY.max_length"
        />
      </el-form-item>
      <el-button
        class="password-submit"
        type="primary"
        native-type="submit"
        :loading="mutation.pending.value"
      >
        {{ t('account.submit') }}
      </el-button>
      <el-button
        class="password-exit"
        link
        :disabled="mutation.pending.value"
        @click="logoutSession"
      >
        {{ t('account.backToSignIn') }}
      </el-button>
    </el-form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/components/AuthLayout.vue'
import { changePassword, type PasswordChangeParams } from '@/api/modules/auth'
import { logoutSession, terminateSession } from '@/app/session/sessionCoordinator'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { PASSWORD_POLICY, newPasswordValidationMessage } from '@/shared/security/passwordPolicy'

const { t } = useI18n()
const formRef = ref<FormInstance>()
const form = reactive({ old_password: '', new_password: '', confirmation: '' })
const rules = computed<FormRules>(() => ({
  old_password: [{ required: true, message: t('account.enterCurrentPassword'), trigger: 'blur' }],
  new_password: [
    {
      required: true,
      validator: (_rule, value: string, callback) => {
        if (value === form.old_password) callback(new Error(t('account.passwordSameAsCurrent')))
        else if (newPasswordValidationMessage(value))
          callback(new Error(t('account.passwordHint', { min: PASSWORD_POLICY.min_length })))
        else callback()
      },
      trigger: 'blur',
    },
  ],
  confirmation: [
    {
      required: true,
      validator: (_rule, value: string, callback) => {
        if (value !== form.new_password) callback(new Error(t('account.passwordMismatch')))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}))

const mutation = useServerStateMutation<void, PasswordChangeParams>('initial-password', {
  invalidateOnSuccess: false,
  mutationFn: async (password, { signal }) => {
    await changePassword(password, signal)
  },
  onSuccess: async () => {
    form.old_password = ''
    form.new_password = ''
    form.confirmation = ''
    ElMessage.success(t('account.passwordChangedSignInAgain'))
    await terminateSession()
  },
})

async function submit(): Promise<void> {
  if (mutation.pending.value || !(await formRef.value?.validate().catch(() => false))) return
  mutation.mutate({ old_password: form.old_password, new_password: form.new_password })
}
</script>

<style scoped>
:deep(.el-form-item) {
  display: block;
}

.password-submit {
  width: 100%;
  margin-top: 8px;
}

.password-exit {
  display: block;
  margin: 18px auto 0;
}
</style>
