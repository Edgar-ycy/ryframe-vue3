<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="login-title">{{ t('account.appTitle') }}</h2>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        size="large"
        @keyup.enter="handleLogin"
      >
        <el-form-item v-if="runtimeCapabilities.multiTenancyEnabled" prop="tenant_id">
          <el-input
            v-model="loginForm.tenant_id"
            :placeholder="t('account.tenantId')"
            prefix-icon="OfficeBuilding"
            autocomplete="organization"
            @blur="syncCaptchaForTenant"
          />
        </el-form-item>
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            :placeholder="t('account.username')"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            :placeholder="t('account.password')"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item v-if="captchaEnabled" prop="captcha_code">
          <div class="captcha-control">
            <div class="captcha-field">
              <el-input
                v-model="loginForm.captcha_code"
                class="captcha-input"
                :placeholder="t('account.captcha')"
                prefix-icon="Picture"
                maxlength="4"
                autocomplete="one-time-code"
                autocapitalize="characters"
                spellcheck="false"
                :disabled="captchaRefreshing"
                @input="normalizeCaptchaCode"
              />
              <button
                type="button"
                class="captcha-refresh"
                :aria-label="t('account.refreshCaptcha')"
                :aria-busy="captchaRefreshing"
                :disabled="captchaRefreshing"
                :title="t('account.refreshCaptcha')"
                @click="refreshCaptcha"
              >
                <img
                  v-if="captchaImage"
                  :src="captchaImage"
                  :alt="t('account.captcha')"
                  class="captcha-image"
                />
                <span v-else class="captcha-placeholder">
                  {{
                    captchaLoadFailed ? t('account.captchaLoadFailed') : t('account.captchaLoading')
                  }}
                </span>
              </button>
            </div>
            <p class="captcha-hint" aria-live="polite">
              {{ t('account.captchaHint') }}
            </p>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="handleLogin">
            {{ t('account.signIn') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getCaptcha, getCaptchaConfig } from '@/api/modules/auth'
import { authenticateWithPassword } from '@/app/session/login'
import { isValidTenantId } from '@/shared/security/tenantId'
import { useRuntimeCapabilitiesStore } from '@/stores/runtimeCapabilities'
import { DEFAULT_TENANT_ID, getTenantId } from '@/utils/auth'
import { ensureAccessibleRoutes, resolveAccessibleRoute } from '@/router'
import { createInitialLoginForm, resolveLoginRedirect } from './loginState'

const router = useRouter()
const route = useRoute()
const runtimeCapabilities = useRuntimeCapabilitiesStore()
const { t } = useI18n()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = ref(createInitialLoginForm(getTenantId(), import.meta.env.DEV))

const loginRules = computed<FormRules>(() => {
  const rules: FormRules = {
    username: [{ required: true, message: t('account.enterUsername'), trigger: 'blur' }],
    password: [{ required: true, message: t('account.enterPassword'), trigger: 'blur' }],
    captcha_code: [{ required: true, message: t('account.enterCaptcha'), trigger: 'blur' }],
  }
  if (runtimeCapabilities.multiTenancyEnabled) {
    rules.tenant_id = [
      { required: true, message: t('account.enterTenantId'), trigger: 'blur' },
      {
        validator: (_rule, value, callback) => {
          callback(
            isValidTenantId(String(value ?? ''))
              ? undefined
              : new Error(t('account.tenantIdInvalid')),
          )
        },
        trigger: 'blur',
      },
    ]
  }
  return rules
})

const captchaEnabled = ref(false)
const captchaImage = ref('')
const captchaId = ref('')
const captchaRefreshing = ref(false)
const captchaLoadFailed = ref(false)
const captchaTenantId = ref('')
let captchaRequestVersion = 0

function resolveCaptchaTenantId(): string {
  return runtimeCapabilities.multiTenancyEnabled
    ? loginForm.value.tenant_id.trim()
    : DEFAULT_TENANT_ID
}

function resetCaptcha(): void {
  captchaId.value = ''
  captchaImage.value = ''
  loginForm.value.captcha_code = ''
}

function normalizeCaptchaCode(value: string): void {
  loginForm.value.captcha_code = value.replaceAll(/\s/gu, '').toUpperCase()
}

async function syncCaptchaForTenant(): Promise<boolean> {
  const tenantId = resolveCaptchaTenantId()
  if (runtimeCapabilities.multiTenancyEnabled && !isValidTenantId(tenantId)) return false
  if (captchaRefreshing.value) return false
  if (captchaTenantId.value === tenantId && (captchaImage.value || !captchaEnabled.value))
    return true

  const requestVersion = ++captchaRequestVersion
  captchaRefreshing.value = true
  captchaLoadFailed.value = false
  try {
    try {
      const res = await getCaptchaConfig(tenantId)
      if (requestVersion !== captchaRequestVersion) return false
      captchaEnabled.value = res.data?.captcha_enabled === true
    } catch {
      if (requestVersion !== captchaRequestVersion) return false
      captchaEnabled.value = true
    }
    captchaTenantId.value = tenantId
    resetCaptcha()
    if (!captchaEnabled.value) return true

    const res = await getCaptcha(tenantId)
    if (requestVersion !== captchaRequestVersion) return false
    if (!res.data) throw new Error(t('account.captchaResponseMissing'))
    captchaId.value = res.data.captcha_id
    captchaImage.value = res.data.image_base64
    return true
  } catch {
    if (requestVersion === captchaRequestVersion) {
      resetCaptcha()
      captchaLoadFailed.value = true
    }
    return false
  } finally {
    if (requestVersion === captchaRequestVersion) captchaRefreshing.value = false
  }
}

async function refreshCaptcha(): Promise<void> {
  const tenantId = resolveCaptchaTenantId()
  if (captchaTenantId.value !== tenantId) {
    await syncCaptchaForTenant()
    return
  }
  captchaTenantId.value = ''
  await syncCaptchaForTenant()
}

const handleLogin = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const tenantId = resolveCaptchaTenantId()
    if (
      captchaTenantId.value !== tenantId &&
      (!runtimeCapabilities.multiTenancyEnabled || isValidTenantId(tenantId))
    ) {
      const synchronized = await syncCaptchaForTenant()
      if (!synchronized) return
    }
    const valid = await loginFormRef.value?.validate().catch(() => false)
    if (!valid) return

    if (
      captchaEnabled.value &&
      (captchaRefreshing.value || !captchaId.value || !captchaImage.value)
    ) {
      const refreshed = await syncCaptchaForTenant()
      ElMessage.warning(refreshed ? t('account.captchaRefreshed') : t('account.captchaLoadFailed'))
      return
    }

    await authenticateWithPassword(
      {
        username: loginForm.value.username,
        password: loginForm.value.password,
        captcha_id: captchaEnabled.value ? captchaId.value : undefined,
        captcha_code: captchaEnabled.value ? loginForm.value.captcha_code : undefined,
      },
      runtimeCapabilities.multiTenancyEnabled
        ? loginForm.value.tenant_id.trim()
        : DEFAULT_TENANT_ID,
    )
    await ensureAccessibleRoutes({ skipAuthRefresh: true })
    ElMessage.success(t('account.signInSuccess'))
    const redirect = resolveLoginRedirect(route.query.redirect)
    await router.replace(resolveAccessibleRoute(redirect))
  } catch (error) {
    ElMessage.error(
      error instanceof Error && error.message ? error.message : t('shell.http.requestFailed'),
    )
    if (captchaEnabled.value) {
      await refreshCaptcha()
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await syncCaptchaForTenant()
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
  line-height: 1.35;
  padding: 0 8px;
  text-align: center;
  border-radius: 4px;
}

.captcha-control {
  width: 100%;
}

.captcha-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.captcha-input {
  min-width: 0;
  flex: 1;
}

.captcha-refresh {
  width: 160px;
  height: 56px;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-light);
  cursor: pointer;
}

.captcha-refresh:disabled {
  cursor: wait;
}

.captcha-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.captcha-refresh:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.captcha-hint {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (width <= 480px) {
  .login-card {
    padding: 24px 18px;
  }

  .login-title {
    margin-bottom: 22px;
    font-size: 20px;
  }

  .captcha-refresh {
    width: 132px;
    height: 46px;
  }
}
</style>
