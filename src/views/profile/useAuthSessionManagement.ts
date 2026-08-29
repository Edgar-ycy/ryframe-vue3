import { ElMessage } from 'element-plus'
import { getCurrentScope, onScopeDispose, watch } from 'vue'
import {
  getAuthSessions,
  revokeAuthSession,
  revokeOtherAuthSessions,
  type AuthSession,
} from '@/api/modules/auth'
import { ensureCsrfToken, terminateSession } from '@/app/session/sessionCoordinator'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { translate } from '@/i18n'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { isServerStateScopeCurrent, queryClient, useServerStateScope } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import {
  authSessionQueryKey,
  authSessionView,
  currentAuthSessionScope,
  sameAuthSessionScope,
  type AuthSessionView,
} from './authSessionSupport'

export type { AuthSessionView } from './authSessionSupport'

/** 管理当前身份的登录设备，不建立轮询或跨身份缓存。 */
export function useAuthSessionManagement() {
  const userStore = useUserStore()
  const pageActive = ref(true)
  const refreshing = ref(false)
  const pendingDeviceKey = ref<string>()
  const revokeOthersPending = ref(false)
  let activeController: AbortController | undefined
  let activeScope: ServerStateScope | undefined
  let trackedScope = currentAuthSessionScope()
  let refreshGeneration = 0
  let disposed = false

  const sessionsQuery = useServerStateQuery<AuthSession[], AuthSessionView[]>(
    () => pageActive.value && currentAuthSessionScope() !== undefined,
    'profile-auth-sessions',
    () => ({ scope: 'self', userId: String(userStore.userId || 'anonymous') }),
    async (signal) => requireOperationData(await getAuthSessions(signal)),
    {
      select: (sessions) => sessions.map(authSessionView),
      initialData: () => [],
      staleTime: 0,
      gcTime: 10 * 60_000,
      refetchInterval: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      meta: { errorMode: 'silent' },
    },
  )

  const devices = sessionsQuery.data
  const loading = sessionsQuery.isFetching

  function hasOtherDevices(): boolean {
    return devices.value.some((device) => !device.current)
  }

  async function refresh(): Promise<void> {
    if (!pageActive.value || currentAuthSessionScope() === undefined || refreshing.value) return
    const generation = ++refreshGeneration
    refreshing.value = true
    try {
      await sessionsQuery.refetch()
    } finally {
      if (refreshGeneration === generation) refreshing.value = false
    }
  }

  function requireCurrentScope(): ServerStateScope {
    const scope = currentAuthSessionScope()
    if (!scope) {
      throw new HttpError(translate('shell.session.expired'), { status: 401, kind: 'http' })
    }
    return scope
  }

  function ensureScopeCurrent(scope: ServerStateScope): void {
    if (!isServerStateScopeCurrent(scope)) {
      throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
    }
  }

  async function withCsrfRetry<T>(
    scope: ServerStateScope,
    execute: (csrfToken: string) => Promise<T>,
  ): Promise<T> {
    const csrfToken = await ensureCsrfToken()
    ensureScopeCurrent(scope)
    try {
      return await execute(csrfToken)
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 403) throw error
      ensureScopeCurrent(scope)
      const renewedCsrfToken = await ensureCsrfToken(true)
      ensureScopeCurrent(scope)
      return execute(renewedCsrfToken)
    }
  }

  async function removeCachedSession(scope: ServerStateScope, sid: string): Promise<void> {
    if (!isServerStateScopeCurrent(scope)) return
    const key = authSessionQueryKey(scope)
    await queryClient.cancelQueries({ queryKey: key, exact: true })
    if (!isServerStateScopeCurrent(scope)) return
    queryClient.setQueryData<AuthSession[]>(
      key,
      (current) => current?.filter((session) => session.sid !== sid) ?? [],
    )
  }

  function reportWriteError(error: unknown): void {
    if (error instanceof HttpError && error.kind === 'cancelled') return
    if (error instanceof HttpError && error.status === 503) {
      ElMessage.error(translate('profile.sessions.serviceUnavailable'))
      return
    }
    ElMessage.error(
      error instanceof Error && error.message
        ? error.message
        : translate('shell.http.requestFailed'),
    )
  }

  async function revokeSession(device: AuthSessionView): Promise<void> {
    if (activeController || revokeOthersPending.value || pendingDeviceKey.value) return
    const scope = requireCurrentScope()
    const confirmed = await confirmAction(
      translate(
        device.current
          ? 'profile.sessions.revokeCurrentConfirm'
          : 'profile.sessions.revokeSessionConfirm',
        { device: device.device },
      ),
      translate('profile.sessions.confirmTitle'),
      { type: 'warning' },
    )
    if (
      !confirmed ||
      disposed ||
      !isServerStateScopeCurrent(scope) ||
      activeController ||
      revokeOthersPending.value ||
      pendingDeviceKey.value
    )
      return

    const controller = new AbortController()
    activeController = controller
    activeScope = scope
    pendingDeviceKey.value = device.key
    try {
      await withCsrfRetry(scope, (csrfToken) =>
        revokeAuthSession(device.key, csrfToken, controller.signal),
      )
      ensureScopeCurrent(scope)
      if (device.current) {
        ElMessage.success(translate('profile.sessions.revokeCurrentSuccess'))
        await terminateSession()
        return
      }
      await removeCachedSession(scope, device.key)
      ensureScopeCurrent(scope)
      ElMessage.success(translate('profile.sessions.revokeSuccess'))
    } catch (error) {
      if (!isServerStateScopeCurrent(scope)) return
      if (error instanceof HttpError && error.status === 404 && isServerStateScopeCurrent(scope)) {
        await removeCachedSession(scope, device.key)
        ensureScopeCurrent(scope)
        ElMessage.info(translate('profile.sessions.alreadyGone'))
      } else {
        reportWriteError(error)
      }
    } finally {
      if (activeController === controller) {
        activeController = undefined
        activeScope = undefined
        pendingDeviceKey.value = undefined
      }
    }
  }

  async function revokeOtherSessions(): Promise<void> {
    if (activeController || revokeOthersPending.value || pendingDeviceKey.value) return
    const scope = requireCurrentScope()
    const confirmed = await confirmAction(
      translate('profile.sessions.revokeOthersConfirm'),
      translate('profile.sessions.confirmTitle'),
      { type: 'warning' },
    )
    if (
      !confirmed ||
      disposed ||
      !isServerStateScopeCurrent(scope) ||
      activeController ||
      revokeOthersPending.value ||
      pendingDeviceKey.value
    )
      return

    const controller = new AbortController()
    activeController = controller
    activeScope = scope
    revokeOthersPending.value = true
    try {
      const result = requireOperationData(
        await withCsrfRetry(scope, (csrfToken) =>
          revokeOtherAuthSessions(csrfToken, controller.signal),
        ),
      )
      ensureScopeCurrent(scope)
      await queryClient.cancelQueries({
        queryKey: authSessionQueryKey(scope),
        exact: true,
      })
      ensureScopeCurrent(scope)
      queryClient.setQueryData<AuthSession[]>(
        authSessionQueryKey(scope),
        (current) => current?.filter((session) => session.current) ?? [],
      )
      ElMessage.success(
        translate('profile.sessions.revokeOthersSuccess', {
          count: result.revoked_count,
        }),
      )
      // 服务端撤销已经提交后，补拉失败不能把本次安全操作误报为失败；
      // 当前缓存已经只保留本设备，后续手动刷新或页面重新激活会继续对账。
      void sessionsQuery.refetch()
    } catch (error) {
      if (isServerStateScopeCurrent(scope)) reportWriteError(error)
    } finally {
      if (activeController === controller) {
        activeController = undefined
        activeScope = undefined
        revokeOthersPending.value = false
      }
    }
  }

  const stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      const nextScope = currentAuthSessionScope()
      if (sameAuthSessionScope(trackedScope, nextScope)) return
      const previousScope = trackedScope
      trackedScope = nextScope
      if (activeScope && !isServerStateScopeCurrent(activeScope)) {
        activeController?.abort()
        activeController = undefined
        activeScope = undefined
        pendingDeviceKey.value = undefined
        revokeOthersPending.value = false
      }
      refreshGeneration += 1
      refreshing.value = false
      if (!previousScope) return
      const previousKey = authSessionQueryKey(previousScope)
      void queryClient.cancelQueries({ queryKey: previousKey, exact: true })
      queryClient.removeQueries({ queryKey: previousKey, exact: true })
    },
    { flush: 'sync' },
  )

  useKeepAlivePageActive(pageActive, refresh)

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
      activeController?.abort()
      stopScopeWatch()
    })
  }

  return {
    devices,
    error: sessionsQuery.error,
    hasOtherDevices,
    loading,
    pageActive,
    pendingDeviceKey,
    refresh,
    refreshing,
    revokeOtherSessions,
    revokeOthersPending,
    revokeSession,
    userStore,
  }
}
