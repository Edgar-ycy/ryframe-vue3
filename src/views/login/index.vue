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
          <el-select
            v-model="loginForm.tenant_id"
            :placeholder="t('account.selectTenant')"
            :aria-label="t('account.selectTenant')"
            filterable
            remote
            :remote-method="searchTenants"
            :loading="tenantsLoading"
            style="width: 100%"
          >
            <el-option
              v-for="tenant in tenantOptions"
              :key="tenant.tenant_id"
              :label="tenant.name"
              :value="tenant.tenant_id"
              :data-testid="`login-tenant-${tenant.tenant_id}`"
            >
              <span>{{ tenant.name }}</span>
              <span class="tenant-option-id">{{ tenant.tenant_id }}</span>
            </el-option>
            <template #footer>
              <el-button v-if="tenantsFailed" text @click="searchTenants('')">
                {{ t('account.retry') }}
              </el-button>
              <el-button v-else-if="hasMoreTenants" text @click="loadMoreTenants">
                {{ t('account.loadMoreTenants') }}
              </el-button>
            </template>
          </el-select>
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
          <el-button
            type="primary"
            :loading="loading"
            :disabled="
              runtimeCapabilities.multiTenancyEnabled &&
              !tenantOptions.some((item) => item.tenant_id === loginForm.tenant_id)
            "
            style="width: 100%"
            @click="handleLogin"
          >
            {{ t('account.signIn') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLoginCaptcha } from './useLoginCaptcha'
import { useLoginTenants } from './useLoginTenants'
import {
  ensureRuntimeAccessibleRoutes,
  resolveRuntimeAccessibleRoute,
} from '@/app/navigation/runtime'
import { authenticateWithPassword } from '@/app/session/login'
import { HttpError } from '@/shared/http/client'
import { isValidTenantId } from '@/shared/security/tenantId'
import { useRuntimeCapabilitiesStore } from '@/stores/runtimeCapabilities'
import { DEFAULT_TENANT_ID, getTenantId } from '@/utils/auth'
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
      { required: true, message: t('account.selectTenant'), trigger: 'change' },
      {
        validator: (_rule, value, callback) => {
          callback(
            tenantOptions.value.some((option) => option.tenant_id === value)
              ? undefined
              : new Error(t('account.selectTenant')),
          )
        },
        trigger: 'blur',
      },
    ]
  }
  return rules
})

const {
  captchaEnabled,
  captchaImage,
  captchaId,
  captchaRefreshing,
  captchaLoadFailed,
  captchaTenantId,
  resolveCaptchaTenantId,
  normalizeCaptchaCode,
  syncCaptchaForTenant,
  refreshCaptcha,
} = useLoginCaptcha(
  loginForm,
  () => (runtimeCapabilities.multiTenancyEnabled ? loginForm.value.tenant_id : DEFAULT_TENANT_ID),
  t,
)
const {
  options: tenantOptions,
  loading: tenantsLoading,
  failed: tenantsFailed,
  search: searchTenants,
  loadMore: loadMoreTenants,
  hasMore: hasMoreTenants,
} = useLoginTenants(loginForm)

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
    await ensureRuntimeAccessibleRoutes({ skipAuthRefresh: true })
    ElMessage.success(t('account.signInSuccess'))
    const redirect = resolveLoginRedirect(route.query.redirect)
    await router.replace(resolveRuntimeAccessibleRoute(redirect))
  } catch (error) {
    if (error instanceof HttpError && error.kind === 'cancelled') return
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
  if (runtimeCapabilities.multiTenancyEnabled) await searchTenants('')
  await syncCaptchaForTenant()
})
</script>

<style scoped>
.tenant-option-id {
  float: right;
  margin-left: 16px;
  color: var(--el-text-color-secondary);
}

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
