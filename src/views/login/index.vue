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
              <img v-if="captchaImage" :src="captchaImage" alt="验证码" style="width:100%;height:100%;border-radius:4px" />
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
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useUserStore} from '@/stores/user'
import {getCaptcha, getCaptchaConfig} from '@/api/modules/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

interface LoginForm {
  username: string
  password: string
  captcha_code: string
}

const loginForm = ref<LoginForm>({
  username: 'admin',
  password: 'admin123',
  captcha_code: '',
})

const loginRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captcha_code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

// ----- 验证码 -----
const captchaEnabled = ref(false)
const captchaImage = ref('')
const captchaId = ref('')

async function loadCaptchaConfig() {
  try {
    const res = await getCaptchaConfig() as any
    const data = res.data || res
    captchaEnabled.value = data.captcha_enabled === true
  } catch {
    // 接口不可用时默认显示验证码
    captchaEnabled.value = true
  }
}

async function refreshCaptcha() {
  try {
    const res = await getCaptcha() as any
    const data = res.data || res
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
    // 登录（验证码开启时才传 captcha_id/captcha_code）
    await userStore.login(
      loginForm.value.username,
      loginForm.value.password,
      captchaEnabled.value ? captchaId.value : undefined,
      captchaEnabled.value ? loginForm.value.captcha_code : undefined,
    )
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect === '/login' ? '/' : redirect)
  } catch (error) {
    // 错误信息已在拦截器中处理
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
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15);
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
</style>
