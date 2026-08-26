<template>
  <div class="reset-page">
    <section class="reset-panel">
      <div class="reset-brand">RyFrame</div>
      <h1>{{ t('account.resetPassword') }}</h1>

      <el-alert
        v-if="missingParams"
        type="error"
        :title="t('account.invalidResetLink')"
        :closable="false"
        show-icon
      />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        class="reset-form"
        @keyup.enter="handleSubmit"
      >
        <el-form-item prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            :placeholder="t('account.passwordHint', { min: PASSWORD_POLICY.min_length })"
            prefix-icon="Lock"
            show-password
            :maxlength="PASSWORD_POLICY.max_length"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            :placeholder="t('account.confirmNewPassword')"
            prefix-icon="Lock"
            show-password
            :maxlength="PASSWORD_POLICY.max_length"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            icon="Check"
            :loading="loading"
            :disabled="missingParams"
            class="submit-button"
            @click="handleSubmit"
          >
            {{ t('account.submit') }}
          </el-button>
        </el-form-item>
      </el-form>

      <el-button link icon="ArrowLeft" class="login-link" @click="goLogin">
        {{ t('account.backToSignIn') }}
      </el-button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { completePasswordReset } from '@/api/modules/auth'
import type { FormItemRule } from 'element-plus'
import { PASSWORD_POLICY } from '@/shared/security/passwordPolicy'
import { isValidTenantId } from '@/shared/security/tenantId'
import { consumeResetPasswordFragment } from './resetCredentials'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const formRef = ref<FormInstance>()
const loading = ref(false)

const resetCredentials =
  typeof window === 'undefined'
    ? { tenantId: '', resetRequestKey: '', token: '' }
    : consumeResetPasswordFragment(window.location, window.history, route.path)
const { tenantId, resetRequestKey, token } = resetCredentials
const missingParams = !isValidTenantId(tenantId) || !resetRequestKey || !token

const form = ref({
  newPassword: '',
  confirmPassword: '',
})

const validateConfirm = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== form.value.newPassword) {
    callback(new Error(t('account.passwordMismatch')))
    return
  }
  callback()
}

const validateNewPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  const message = passwordValidationMessage(String(value ?? ''))
  callback(message ? new Error(message) : undefined)
}

const rules = computed<FormRules>(() => ({
  newPassword: [
    { required: true, message: t('account.enterNewPassword'), trigger: 'blur' },
    { validator: validateNewPassword, trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: t('account.enterConfirmPassword'), trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}))

async function handleSubmit() {
  if (missingParams || loading.value) return
  loading.value = true
  try {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return

    await completePasswordReset({
      tenant_id: tenantId,
      request_id: resetRequestKey,
      token,
      new_password: form.value.newPassword,
    })
    ElMessage.success(t('account.passwordResetSuccess'))
    await router.replace('/login')
  } finally {
    loading.value = false
  }
}

function goLogin() {
  router.replace('/login')
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
.reset-page {
  min-height: 100dvh;
  padding: 24px 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, rgb(255 255 255 / 72%), rgb(255 255 255 / 90%)), #eef2f6;
}

.reset-panel {
  width: min(420px, calc(100vw - 32px));
  padding: 34px 32px 28px;
  background: #fff;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  box-shadow: 0 18px 46px rgb(38 52 75 / 16%);
}

.reset-brand {
  margin-bottom: 10px;
  color: #2f5d62;
  font-size: 14px;
  font-weight: 700;
}

h1 {
  margin: 0 0 24px;
  color: #1f2937;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.reset-form {
  margin-top: 18px;
}

.submit-button {
  width: 100%;
}

.login-link {
  width: 100%;
  margin-top: 4px;
}

@media (width <= 480px) {
  .reset-panel {
    padding: 28px 18px 22px;
  }

  h1 {
    font-size: 22px;
  }
}
</style>
