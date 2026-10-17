<template>
  <AuthLayout :brand="t('account.appTitle')" :description="t('account.welcomeDescription')">
    <h2 class="auth-title">{{ t('account.signIn') }}</h2>
    <el-form
      ref="loginFormRef"
      :model="loginForm"
      :rules="loginRules"
      size="large"
      class="auth-form"
      @keyup.enter="handleLogin"
    >
      <el-form-item v-if="runtimeCapabilitiesFailed">
        <div class="capability-status capability-status--error" role="alert">
          <span>{{ t('account.runtimeCapabilitiesLoadFailed') }}</span>
          <el-button text type="primary" @click="loadRuntimeCapabilities">
            {{ t('account.retry') }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item v-else-if="!runtimeCapabilities.loaded">
        <div class="capability-status" role="status">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>{{ t('account.checkingRuntimeCapabilities') }}</span>
        </div>
      </el-form-item>
      <el-form-item v-else-if="showTenantSelector" prop="tenant_id">
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
            !runtimeCapabilities.loaded ||
            runtimeCapabilitiesLoading ||
            (showTenantSelector &&
              !tenantOptions.some((item) => item.tenant_id === loginForm.tenant_id))
          "
          style="width: 100%"
          @click="handleLogin"
        >
          {{ t('account.signIn') }}
        </el-button>
      </el-form-item>
    </el-form>
  </AuthLayout>
</template>

<script setup lang="ts">
import AuthLayout from '@/components/AuthLayout.vue'
import { Loading } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
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
import { ensureRuntimeCapabilitiesLoaded } from '@/app/runtime-capabilities/coordinator'
import { authenticateWithPassword } from '@/app/session/login'
import { HttpError } from '@/shared/http/client'
import { isValidTenantId } from '@/shared/security/tenantId'
import { useRuntimeCapabilitiesStore } from '@/stores/runtimeCapabilities'
import { DEFAULT_TENANT_ID, getTenantId } from '@/utils/auth'
import {
  createInitialLoginForm,
  resolveLoginRedirect,
  resolveLoginTenantId,
  showLoginTenantSelector as hasLoadedMultiTenancy,
} from './loginState'

const router = useRouter()
const route = useRoute()
const runtimeCapabilities = useRuntimeCapabilitiesStore()
const { t } = useI18n()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)
const runtimeCapabilitiesLoading = ref(false)
const runtimeCapabilitiesFailed = ref(false)

const loginForm = ref(createInitialLoginForm(getTenantId()))
const showTenantSelector = computed(() =>
  hasLoadedMultiTenancy({
    loaded: runtimeCapabilities.loaded,
    multiTenancyEnabled: runtimeCapabilities.multiTenancyEnabled,
  }),
)
const loginTenantId = computed(() =>
  resolveLoginTenantId(
    loginForm.value.tenant_id,
    {
      loaded: runtimeCapabilities.loaded,
      multiTenancyEnabled: runtimeCapabilities.multiTenancyEnabled,
    },
    DEFAULT_TENANT_ID,
  ),
)

const loginRules = computed<FormRules>(() => {
  const rules: FormRules = {
    username: [{ required: true, message: t('account.enterUsername'), trigger: 'blur' }],
    password: [{ required: true, message: t('account.enterPassword'), trigger: 'blur' }],
    captcha_code: [{ required: true, message: t('account.enterCaptcha'), trigger: 'blur' }],
  }
  if (showTenantSelector.value) {
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
} = useLoginCaptcha(loginForm, () => loginTenantId.value, t)
const {
  options: tenantOptions,
  loading: tenantsLoading,
  failed: tenantsFailed,
  search: searchTenants,
  loadMore: loadMoreTenants,
  hasMore: hasMoreTenants,
} = useLoginTenants(loginForm)

const handleLogin = async () => {
  if (loading.value || !runtimeCapabilities.loaded) return
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
      loginTenantId.value,
    )
    if (useUserStore().passwordChangeRequired) {
      await router.replace('/change-password')
      return
    }
    await ensureRuntimeAccessibleRoutes({ skipAuthRefresh: true })
    const redirect = resolveLoginRedirect(route.query.redirect)
    await router.replace(resolveRuntimeAccessibleRoute(redirect))
    ElMessage.success(t('account.signInSuccess'))
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

async function loadRuntimeCapabilities(): Promise<void> {
  if (runtimeCapabilitiesLoading.value) return
  runtimeCapabilitiesLoading.value = true
  runtimeCapabilitiesFailed.value = false
  try {
    await ensureRuntimeCapabilitiesLoaded()
    if (showTenantSelector.value) await searchTenants('')
    await syncCaptchaForTenant()
  } catch {
    runtimeCapabilitiesFailed.value = true
  } finally {
    runtimeCapabilitiesLoading.value = false
  }
}

onMounted(loadRuntimeCapabilities)
</script>

<style scoped>
.tenant-option-id {
  float: right;
  margin-left: 16px;
  color: var(--el-text-color-secondary);
}

.capability-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.capability-status--error {
  justify-content: space-between;
  color: var(--el-color-danger);
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

  .captcha-refresh {
    width: 132px;
    height: 46px;
  }
}
</style>
