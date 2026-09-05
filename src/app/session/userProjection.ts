import type { SessionContextUserInfo } from '@/features/session/contracts'
import { setLocale } from '@/app/settings/coordinator'
import { normalizeLocale, type AppLocale } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { setTenantId } from '@/utils/auth'

export function applyUserIdentity(userInfo: SessionContextUserInfo, isSuperAdmin: boolean): void {
  const user = useUserStore()
  setTenantId(userInfo.tenant_id)
  const preferredLocale = getPreferredLocale(userInfo)
  if (preferredLocale) setLocale(preferredLocale)
  user.applyIdentity(userInfo, isSuperAdmin, preferredLocale)
}

function getPreferredLocale(userInfo: SessionContextUserInfo): AppLocale | undefined {
  return normalizeLocale(userInfo.preferred_locale)
}
