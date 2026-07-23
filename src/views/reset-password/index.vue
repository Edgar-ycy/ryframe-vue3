<template>
  <div class="reset-page">
    <section class="reset-panel">
      <div class="reset-brand">RyFrame</div>
      <h1>重置密码</h1>

      <el-alert
        v-if="missingParams"
        type="error"
        title="重置链接无效或已失效"
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
            placeholder="至少 8 位，含大小写字母、数字和符号"
            prefix-icon="Lock"
            show-password
            :maxlength="PASSWORD_POLICY.max_length"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认新密码"
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
            提交
          </el-button>
        </el-form-item>
      </el-form>

      <el-button link icon="ArrowLeft" class="login-link" @click="goLogin">
        返回登录
      </el-button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { completePasswordReset } from '@/api/modules/auth'
import type { FormItemRule } from 'element-plus'
import {
  PASSWORD_POLICY,
  newPasswordValidationMessage,
} from '@/shared/security/passwordPolicy'
import { isValidTenantId } from '@/shared/security/tenantId'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const tenantId = String(route.query.tenant_id || '')
const resetRequestIdentifier = String(route.query.request_id || '')
const token = String(route.query.token || '')
if (typeof window !== 'undefined' && window.location.search) {
  window.history.replaceState(window.history.state, '', route.path)
}
const missingParams = computed(
  () => !isValidTenantId(tenantId) || !resetRequestIdentifier || !token,
)

const form = ref({
  newPassword: '',
  confirmPassword: '',
})

const validateConfirm = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== form.value.newPassword) {
    callback(new Error('两次输入的密码不一致'))
    return
  }
  callback()
}

const validateNewPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  const message = newPasswordValidationMessage(String(value ?? ''))
  callback(message ? new Error(message) : undefined)
}

const rules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { validator: validateNewPassword, trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

async function handleSubmit() {
  if (missingParams.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await completePasswordReset({
      tenant_id: tenantId,
      request_id: resetRequestIdentifier,
      token,
      new_password: form.value.newPassword,
    })
    ElMessage.success('密码已重置')
    await router.replace('/login')
  } finally {
    loading.value = false
  }
}

function goLogin() {
  router.replace('/login')
}
</script>

<style scoped>
.reset-page {
  min-height: 100dvh;
  padding: 24px 16px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 72%), rgb(255 255 255 / 90%)),
    #eef2f6;
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
