import { watch } from 'vue'
import { getConfigByKey } from '@/api/modules/config'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useSettingsStore, type ShellServerSettings } from '@/stores/settings'
import { useUserStore } from '@/stores/user'

export function useShellSettingsQuery() {
  const settingsStore = useSettingsStore()
  const userStore = useUserStore()
  const settingsQuery = useTenantQuery<ShellServerSettings>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated',
    'configs',
    () => ({ scope: 'shell-theme' }),
    async signal => {
      const [sideThemeResponse, skinNameResponse] = await Promise.all([
        getConfigByKey('sys.index.sideTheme', signal),
        getConfigByKey('sys.index.skinName', signal),
      ])
      return {
        sideTheme: sideThemeResponse.data,
        skinName: skinNameResponse.data,
      }
    },
  )

  watch(
    () => settingsQuery.data.value,
    settings => {
      if (settings) settingsStore.applyServerSettings(settings)
    },
    { immediate: true },
  )

  async function refresh(): Promise<void> {
    await settingsQuery.refetch({ throwOnError: true })
  }

  return { refresh }
}
