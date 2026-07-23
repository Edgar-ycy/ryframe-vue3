<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="login-title">RyFrame 管理后台</h2>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        size="large"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="tenant_id">
          <el-input
            v-model="loginForm.tenant_id"
            placeholder="租户标识"
            prefix-icon="OfficeBuilding"
            autocomplete="organization"
          />
        </el-form-item>
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item v-if="captchaEnabled" prop="captcha_code">
          <div style="display:flex;gap:8px">
            <el-input
              v-model="loginForm.captcha_code"
              placeholder="验证码"
              prefix-icon="Picture"
              maxlength="4"
              style="flex:1"
            />
            <div style="width:120px;height:40px;cursor:pointer;flex-shrink:0" @click="refreshCaptcha">
              <img
                v-if="captchaImage"
                :src="captchaImage"
                alt="验证码"
                style="width:100%;height:100%;border-radius:4px"
              >
              <div v-else class="captcha-placeholder">
                加载中...
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCaptcha, getCaptchaConfig } from '@/api/modules/auth'
import { useUserStore } from '@/stores/user'
import { getTenantId } from '@/utils/auth'
import { createTenantIdFormRules } from '@/utils/tenantIdFormRules'
import { createInitialLoginForm, resolveLoginRedirect } from './loginState'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = ref(createInitialLoginForm(getTenantId(), import.meta.env.DEV))

const loginRules: FormRules = {
  tenant_id: createTenantIdFormRules(),
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captcha_code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

const captchaEnabled = ref(false)
const captchaImage = ref('')
const captchaId = ref('')

async function loadCaptchaConfig() {
  try {
    const res = await getCaptchaConfig()
    captchaEnabled.value = res.data?.captcha_enabled === true
  } catch {
    captchaEnabled.value = true
  }
}

async function refreshCaptcha() {
  try {
    const res = await getCaptcha()
    if (!res.data) throw new Error('验证码响应缺少数据')
    const data = res.data
    captchaId.value = data.captcha_id
    captchaImage.value = data.image_base64
    loginForm.value.captcha_code = ''
  } catch {
    captchaImage.value = ''
  }
}

const handleLogin = async () => {
  const valid = await loginFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(
      loginForm.value.username,
      loginForm.value.password,
      loginForm.value.tenant_id.trim(),
      captchaEnabled.value ? captchaId.value : undefined,
      captchaEnabled.value ? loginForm.value.captcha_code : undefined,
    )
    ElMessage.success('登录成功')
    await router.replace(resolveLoginRedirect(route.query.redirect))
  } catch {
    if (captchaEnabled.value) {
      await refreshCaptcha()
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCaptchaConfig()
  if (captchaEnabled.value) {
    await refreshCaptcha()
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100dvh;
  padding: 24px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: min(400px, calc(100vw - 32px));
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 30px rgb(0 0 0 / 15%);
}

.login-title {
  text-align: center;
  margin-bottom: 30px;
  font-size: 24px;
  color: var(--color-text-primary);
}

.captcha-placeholder {
  width: 100%;
  height: 100%;
  background: var(--border-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 12px;
  border-radius: 4px;
}

@media (width <= 480px) {
  .login-card {
    padding: 24px 18px;
  }

  .login-title {
    margin-bottom: 22px;
    font-size: 20px;
  }
}
</style>
