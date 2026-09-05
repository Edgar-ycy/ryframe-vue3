import { watch } from 'vue'
import { getShellSettings } from '@/api/modules/common'
import { applyServerSettings } from '@/app/settings/coordinator'
import { HttpError } from '@/shared/http/client'
import {
  getServerStateScope,
  isServerStateScopeCurrent,
  queryClient,
  serverStateQueryKey,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import type { ShellServerSettings } from '@/stores/settings'
import { useUserStore } from '@/stores/user'

const SHELL_SETTINGS_RESOURCE = 'configs'
const SHELL_SETTINGS_PARAMS = { scope: 'shell-theme' }

interface ScopedShellSettings {
  scope: ServerStateScope
  settings: ShellServerSettings
}

/** 刷新 Shell 已订阅的服务端主题设置。 */
export async function refreshShellSettings(): Promise<void> {
  const scope = getServerStateScope()
  if (!scope) return
  await queryClient.refetchQueries(
    {
      queryKey: serverStateQueryKey(scope, SHELL_SETTINGS_RESOURCE, SHELL_SETTINGS_PARAMS),
      type: 'active',
    },
    { throwOnError: true },
  )
}

export function useShellSettingsQuery() {
  const userStore = useUserStore()
  const settingsQuery = useServerStateQuery<ScopedShellSettings>(
    () => userStore.sessionStatus === 'authenticated',
    SHELL_SETTINGS_RESOURCE,
    () => SHELL_SETTINGS_PARAMS,
    async (signal) => {
      const scope = getServerStateScope()
      if (!scope) throw new HttpError('会话已失效，设置请求已取消', { kind: 'cancelled' })
      const response = await getShellSettings(signal)
      return {
        scope: {
          tenantId: scope.tenantId,
          subjectId: scope.subjectId,
          sessionEpoch: scope.sessionEpoch,
        },
        settings: {
          sideTheme: response.data?.side_theme ?? undefined,
          skinName: response.data?.skin_name ?? undefined,
        },
      }
    },
  )

  watch(
    () => settingsQuery.data.value,
    (result) => {
      if (result && isServerStateScopeCurrent(result.scope)) applyServerSettings(result.settings)
    },
    { immediate: true },
  )
}
