import { watch } from 'vue'
import { getConfigByKey } from '@/api/modules/config'
import { queryClient, tenantQueryKey } from '@/shared/query/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useSettingsStore, type ShellServerSettings } from '@/stores/settings'
import { useUserStore } from '@/stores/user'

const SHELL_SETTINGS_RESOURCE = 'configs'
const SHELL_SETTINGS_PARAMS = { scope: 'shell-theme' }

/** 刷新 Shell 已订阅的服务端主题设置。 */
export async function refreshShellSettings(tenantId: string | undefined): Promise<void> {
  await queryClient.refetchQueries(
    {
      queryKey: tenantQueryKey(tenantId, SHELL_SETTINGS_RESOURCE, SHELL_SETTINGS_PARAMS),
      type: 'active',
    },
    { throwOnError: true },
  )
}

export function useShellSettingsQuery() {
  const settingsStore = useSettingsStore()
  const userStore = useUserStore()
  const settingsQuery = useTenantQuery<ShellServerSettings>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated',
    SHELL_SETTINGS_RESOURCE,
    () => SHELL_SETTINGS_PARAMS,
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
}
