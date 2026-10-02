import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { getCaptcha, getCaptchaConfig } from '@/api/modules/auth'
import { isValidTenantId } from '@/shared/security/tenantId'
import type { LoginFormModel } from './loginState'

/** 验证码请求随租户切换取消，只有当前请求可以回写。 */
export function useLoginCaptcha(
  form: Ref<LoginFormModel>,
  tenantId: () => string,
  t: (key: string) => string,
) {
  const captchaEnabled = ref(false)
  const captchaImage = ref('')
  const captchaId = ref('')
  const captchaRefreshing = ref(false)
  const captchaLoadFailed = ref(false)
  const captchaTenantId = ref('')
  let captchaRequestVersion = 0
  let controller: AbortController | undefined

  function resolveCaptchaTenantId(): string {
    return tenantId()
  }

  function resetCaptcha(): void {
    captchaId.value = ''
    captchaImage.value = ''
    form.value.captcha_code = ''
  }

  function normalizeCaptchaCode(value: string): void {
    form.value.captcha_code = value.replaceAll(/\s/gu, '').toUpperCase()
  }

  async function syncCaptchaForTenant(): Promise<boolean> {
    const tenantId = resolveCaptchaTenantId()
    if (!isValidTenantId(tenantId)) return false
    if (captchaTenantId.value === tenantId && (captchaImage.value || !captchaEnabled.value))
      return true

    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    resetCaptcha()
    const requestVersion = ++captchaRequestVersion
    captchaRefreshing.value = true
    captchaLoadFailed.value = false
    try {
      try {
        const res = await getCaptchaConfig(tenantId, signal)
        if (requestVersion !== captchaRequestVersion) return false
        captchaEnabled.value = res.data?.captcha_enabled === true
      } catch {
        if (requestVersion !== captchaRequestVersion) return false
        captchaEnabled.value = true
      }
      captchaTenantId.value = tenantId
      resetCaptcha()
      if (!captchaEnabled.value) return true

      const res = await getCaptcha(tenantId, undefined, signal)
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

  watch(tenantId, () => {
    controller?.abort()
    captchaRequestVersion += 1
    captchaRefreshing.value = false
    captchaTenantId.value = ''
    resetCaptcha()
    void syncCaptchaForTenant()
  })
  onBeforeUnmount(() => {
    captchaRequestVersion += 1
    controller?.abort()
  })
  return {
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
  }
}
