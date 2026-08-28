import type { SessionContextUserInfo } from '@/shared/session/contracts'
import { normalizeLocale, type AppLocale } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { setTenantId } from '@/utils/auth'

export function applyUserIdentity(userInfo: SessionContextUserInfo, isSuperAdmin: boolean): void {
  const user = useUserStore()
  setTenantId(userInfo.tenant_id)
  const preferredLocale = getPreferredLocale(userInfo)
  if (preferredLocale) useSettingsStore().setLocale(preferredLocale)
  user.applyIdentity(userInfo, isSuperAdmin, preferredLocale)
}

function getPreferredLocale(userInfo: SessionContextUserInfo): AppLocale | undefined {
  return normalizeLocale(userInfo.preferred_locale)
}
