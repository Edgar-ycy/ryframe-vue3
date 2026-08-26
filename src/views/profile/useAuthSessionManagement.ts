import { getCurrentScope, onScopeDispose } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  getAuthSessions,
  revokeAuthSession,
  revokeOtherAuthSessions,
  type AuthSession,
} from '@/api/modules/auth'
import { ensureCsrfToken, terminateSession } from '@/app/session/sessionCoordinator'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { formatLocalizedDate, translate } from '@/i18n'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { queryClient, tenantQueryKey } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

interface SessionIdentity {
  tenantId: string
  userId: string
}

/** 仅供个人中心展示使用，字段全部由生成的会话契约派生。 */
export interface AuthSessionView {
  key: AuthSession['sid']
  current: AuthSession['current']
  device: string
  browser: string
  operatingSystem: string
  ipAddress: AuthSession['ipaddr']
  loginLocation: string
  loginTime: string
  lastActivity: string
  expiresAt: string
}

function authSessionQueryKey(identity: SessionIdentity) {
  return tenantQueryKey(identity.tenantId, 'profile-auth-sessions', {
    scope: 'self',
    userId: identity.userId,
  })
}

function currentIdentity(): SessionIdentity | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) {
    return undefined
  }
  return { tenantId: user.tenantId, userId: String(user.userId) }
}

function sameIdentity(
  left: SessionIdentity | undefined,
  right: SessionIdentity | undefined,
): boolean {
  return left?.tenantId === right?.tenantId && left?.userId === right?.userId
}

function sessionView(session: AuthSession): AuthSessionView {
  const browser = session.browser || translate('profile.sessions.unknownValue')
  const operatingSystem = session.os || translate('profile.sessions.unknownValue')
  const knownDeviceParts = [session.browser, session.os].filter(Boolean)
  return {
    key: session.sid,
    current: session.current,
    device: knownDeviceParts.join(' · ') || translate('profile.sessions.unknownDevice'),
    browser,
    operatingSystem,
    ipAddress: session.ipaddr,
    loginLocation: session.login_location || translate('profile.sessions.unknownValue'),
    loginTime: formatLocalizedDate(session.login_time),
    lastActivity: formatLocalizedDate(session.last_access_time),
    expiresAt: formatLocalizedDate(session.expires_at),
  }
}

/** 管理当前身份的登录设备，不建立轮询或跨身份缓存。 */
export function useAuthSessionManagement() {
  const userStore = useUserStore()
  const pageActive = ref(true)
  const refreshing = ref(false)
  const pendingDeviceKey = ref<string>()
  const revokeOthersPending = ref(false)
  let activeController: AbortController | undefined
  let activeIdentity: SessionIdentity | undefined
  let trackedIdentity = currentIdentity()
  let disposed = false

  const sessionsQuery = useQuery<AuthSession[], HttpError, AuthSessionView[]>({
    queryKey: computed(() =>
      authSessionQueryKey(
        currentIdentity() ?? {
          tenantId: 'anonymous',
          userId: 'anonymous',
        },
      ),
    ),
    enabled: computed(() => pageActive.value && currentIdentity() !== undefined),
    queryFn: async ({ signal }) => requireOperationData(await getAuthSessions(signal)),
    select: (sessions) => sessions.map(sessionView),
    initialData: () => [],
    staleTime: 0,
    gcTime: 10 * 60_000,
    refetchInterval: false,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    meta: { errorMode: 'silent' },
  })

  const devices = sessionsQuery.data
  const loading = sessionsQuery.isFetching

  function hasOtherDevices(): boolean {
    return devices.value.some((device) => !device.current)
  }

  async function refresh(): Promise<void> {
    if (!pageActive.value || currentIdentity() === undefined || refreshing.value) return
    refreshing.value = true
    try {
      await sessionsQuery.refetch()
    } finally {
      refreshing.value = false
    }
  }

  function identityStillCurrent(identity: SessionIdentity): boolean {
    return sameIdentity(identity, currentIdentity())
  }

  function requireCurrentIdentity(): SessionIdentity {
    const identity = currentIdentity()
    if (!identity) {
      throw new HttpError(translate('shell.session.expired'), { status: 401, kind: 'http' })
    }
    return identity
  }

  function ensureIdentityUnchanged(identity: SessionIdentity): void {
    if (!identityStillCurrent(identity)) {
      throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
    }
  }

  async function withCsrfRetry<T>(
    identity: SessionIdentity,
    execute: (csrfToken: string) => Promise<T>,
  ): Promise<T> {
    const csrfToken = await ensureCsrfToken()
    ensureIdentityUnchanged(identity)
    try {
      return await execute(csrfToken)
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 403) throw error
      ensureIdentityUnchanged(identity)
      const renewedCsrfToken = await ensureCsrfToken(true)
      ensureIdentityUnchanged(identity)
      return execute(renewedCsrfToken)
    }
  }

  async function removeCachedSession(identity: SessionIdentity, sid: string): Promise<void> {
    const key = authSessionQueryKey(identity)
    await queryClient.cancelQueries({ queryKey: key, exact: true })
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
    const identity = requireCurrentIdentity()
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
      !identityStillCurrent(identity) ||
      activeController ||
      revokeOthersPending.value ||
      pendingDeviceKey.value
    )
      return

    const controller = new AbortController()
    activeController = controller
    activeIdentity = identity
    pendingDeviceKey.value = device.key
    try {
      await withCsrfRetry(identity, (csrfToken) =>
        revokeAuthSession(device.key, csrfToken, controller.signal),
      )
      ensureIdentityUnchanged(identity)
      if (device.current) {
        ElMessage.success(translate('profile.sessions.revokeCurrentSuccess'))
        await terminateSession()
        return
      }
      await removeCachedSession(identity, device.key)
      ElMessage.success(translate('profile.sessions.revokeSuccess'))
    } catch (error) {
      if (error instanceof HttpError && error.status === 404 && identityStillCurrent(identity)) {
        await removeCachedSession(identity, device.key)
        ElMessage.info(translate('profile.sessions.alreadyGone'))
      } else {
        reportWriteError(error)
      }
    } finally {
      if (activeController === controller) {
        activeController = undefined
        activeIdentity = undefined
        pendingDeviceKey.value = undefined
      }
    }
  }

  async function revokeOtherSessions(): Promise<void> {
    if (activeController || revokeOthersPending.value || pendingDeviceKey.value) return
    const identity = requireCurrentIdentity()
    const confirmed = await confirmAction(
      translate('profile.sessions.revokeOthersConfirm'),
      translate('profile.sessions.confirmTitle'),
      { type: 'warning' },
    )
    if (
      !confirmed ||
      disposed ||
      !identityStillCurrent(identity) ||
      activeController ||
      revokeOthersPending.value ||
      pendingDeviceKey.value
    )
      return

    const controller = new AbortController()
    activeController = controller
    activeIdentity = identity
    revokeOthersPending.value = true
    try {
      const result = requireOperationData(
        await withCsrfRetry(identity, (csrfToken) =>
          revokeOtherAuthSessions(csrfToken, controller.signal),
        ),
      )
      ensureIdentityUnchanged(identity)
      await queryClient.cancelQueries({
        queryKey: authSessionQueryKey(identity),
        exact: true,
      })
      queryClient.setQueryData<AuthSession[]>(
        authSessionQueryKey(identity),
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
      reportWriteError(error)
    } finally {
      if (activeController === controller) {
        activeController = undefined
        activeIdentity = undefined
        revokeOthersPending.value = false
      }
    }
  }

  const unsubscribeUser = userStore.$subscribe(
    () => {
      const nextIdentity = currentIdentity()
      if (sameIdentity(trackedIdentity, nextIdentity)) return
      const previousIdentity = trackedIdentity
      trackedIdentity = nextIdentity
      if (activeIdentity && !sameIdentity(activeIdentity, nextIdentity)) {
        activeController?.abort()
      }
      if (!previousIdentity) return
      const previousKey = authSessionQueryKey(previousIdentity)
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
      unsubscribeUser()
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
