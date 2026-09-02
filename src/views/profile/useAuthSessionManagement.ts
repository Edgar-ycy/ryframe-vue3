import { ElMessage } from 'element-plus'
import { getCurrentScope, onActivated, onScopeDispose, ref, watch } from 'vue'
import {
  getAuthSessions,
  revokeAuthSession,
  revokeOtherAuthSessions,
  type AuthSession,
} from '@/api/modules/auth'
import { terminateSession } from '@/app/session/sessionCoordinator'
import { translate } from '@/i18n'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { queryClient, useServerStateScope } from '@/shared/query/client'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
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
import {
  removeCachedAuthSession,
  reportAuthSessionWriteError,
  withAuthSessionCsrfRetry,
} from './authSessionMutationSupport'

export type { AuthSessionView } from './authSessionSupport'

/** 管理当前身份的登录设备，不建立轮询或跨身份缓存。 */
export function useAuthSessionManagement() {
  const userStore = useUserStore()
  const refreshing = ref(false)
  const pendingDeviceKey = ref<string>()
  const revokeOthersPending = ref(false)
  let activeController: AbortController | undefined
  let trackedScope = currentAuthSessionScope()
  let refreshGeneration = 0
  let disposed = false

  function invalidatePageOperations(): void {
    refreshGeneration += 1
    refreshing.value = false
    activeController?.abort()
    activeController = undefined
    pendingDeviceKey.value = undefined
    revokeOthersPending.value = false
  }

  const pageLifecycle = useServerStatePageLifecycle(invalidatePageOperations)
  const pageActive = pageLifecycle.pageActive

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

  async function revokeSession(device: AuthSessionView): Promise<void> {
    if (activeController || revokeOthersPending.value || pendingDeviceKey.value) return
    const expectedScope = requireCurrentScope()
    const ownsPage = pageLifecycle.captureOwnership()
    const ownsOperation = () =>
      ownsPage() && sameAuthSessionScope(currentAuthSessionScope(), expectedScope)
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate(
            device.current
              ? 'profile.sessions.revokeCurrentConfirm'
              : 'profile.sessions.revokeSessionConfirm',
            { device: device.device },
          ),
          translate('profile.sessions.confirmTitle'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (
      !operation ||
      !sameAuthSessionScope(operation.scope, expectedScope) ||
      disposed ||
      activeController ||
      revokeOthersPending.value ||
      pendingDeviceKey.value
    )
      return

    const controller = new AbortController()
    operation.assertCurrent(ownsOperation)
    activeController = controller
    pendingDeviceKey.value = device.key
    try {
      await withAuthSessionCsrfRetry(operation, ownsOperation, (csrfToken) =>
        revokeAuthSession(device.key, csrfToken, controller.signal),
      )
      operation.assertCurrent(ownsOperation)
      if (device.current) {
        operation.apply(
          () => ElMessage.success(translate('profile.sessions.revokeCurrentSuccess')),
          ownsOperation,
        )
        await terminateSession()
        return
      }
      await removeCachedAuthSession(operation, ownsOperation, device.key)
      operation.apply(
        () => ElMessage.success(translate('profile.sessions.revokeSuccess')),
        ownsOperation,
      )
    } catch (error) {
      if (!operation.isCurrent(ownsOperation)) return
      if (error instanceof HttpError && error.status === 404) {
        await removeCachedAuthSession(operation, ownsOperation, device.key)
        operation.apply(
          () => ElMessage.info(translate('profile.sessions.alreadyGone')),
          ownsOperation,
        )
      } else {
        reportAuthSessionWriteError(error)
      }
    } finally {
      if (activeController === controller) {
        activeController = undefined
        pendingDeviceKey.value = undefined
      }
    }
  }

  async function revokeOtherSessions(): Promise<void> {
    if (activeController || revokeOthersPending.value || pendingDeviceKey.value) return
    const expectedScope = requireCurrentScope()
    const ownsPage = pageLifecycle.captureOwnership()
    const ownsOperation = () =>
      ownsPage() && sameAuthSessionScope(currentAuthSessionScope(), expectedScope)
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('profile.sessions.revokeOthersConfirm'),
          translate('profile.sessions.confirmTitle'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (
      !operation ||
      !sameAuthSessionScope(operation.scope, expectedScope) ||
      disposed ||
      activeController ||
      revokeOthersPending.value ||
      pendingDeviceKey.value
    )
      return

    const scope = operation.scope
    const controller = new AbortController()
    operation.assertCurrent(ownsOperation)
    activeController = controller
    revokeOthersPending.value = true
    try {
      const result = requireOperationData(
        await withAuthSessionCsrfRetry(operation, ownsOperation, (csrfToken) =>
          revokeOtherAuthSessions(csrfToken, controller.signal),
        ),
      )
      operation.assertCurrent(ownsOperation)
      await queryClient.cancelQueries({
        queryKey: authSessionQueryKey(scope),
        exact: true,
      })
      operation.assertCurrent(ownsOperation)
      queryClient.setQueryData<AuthSession[]>(
        authSessionQueryKey(scope),
        (current) => current?.filter((session) => session.current) ?? [],
      )
      operation.apply(
        () =>
          ElMessage.success(
            translate('profile.sessions.revokeOthersSuccess', {
              count: result.revoked_count,
            }),
          ),
        ownsOperation,
      )
      // 服务端撤销已经提交后，补拉失败不能把本次安全操作误报为失败；
      // 当前缓存已经只保留本设备，后续手动刷新或页面重新激活会继续对账。
      if (operation.isCurrent(ownsOperation)) void sessionsQuery.refetch()
    } catch (error) {
      if (operation.isCurrent(ownsOperation)) reportAuthSessionWriteError(error)
    } finally {
      if (activeController === controller) {
        activeController = undefined
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
      refreshGeneration += 1
      refreshing.value = false
      if (!previousScope) return
      const previousKey = authSessionQueryKey(previousScope)
      void queryClient.cancelQueries({ queryKey: previousKey, exact: true })
      queryClient.removeQueries({ queryKey: previousKey, exact: true })
    },
    { flush: 'sync' },
  )

  onActivated(() => void refresh())

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
