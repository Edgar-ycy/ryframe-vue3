import {
  getAuthorizationDiagnostic,
  type AuthorizationDiagnostic,
} from '@/api/modules/authorizationDiagnostic'
import type { SelectOptionList } from '@/api/modules/option'
import { listUserOptions } from '@/api/modules/user'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { requireOperationData } from '@/shared/http/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

type Translate = (key: string, values?: Record<string, unknown>) => string

const SCOPE_KEYS: Record<string, string> = {
  all: 'scopeAll',
  custom: 'scopeCustom',
  department: 'scopeDepartment',
  department_and_children: 'scopeDepartmentChildren',
  self_only: 'scopeSelf',
}
const WARNING_KEYS: Record<string, string> = {
  user_disabled: 'warningUserDisabled',
  tenant_disabled: 'warningTenantDisabled',
  tenant_expired: 'warningTenantExpired',
  no_enabled_roles: 'warningNoEnabledRoles',
  authorization_cache_stale: 'warningCacheStale',
  authorization_cache_missing: 'warningCacheMissing',
  authorization_cache_unavailable: 'warningCacheUnavailable',
  invalid_menu_permission_reference: 'warningInvalidMenuPermission',
}
const REASON_KEYS: Record<string, string> = {
  tenant_unavailable: 'reasonTenantUnavailable',
  user_disabled: 'reasonUserDisabled',
  menu_disabled: 'reasonMenuDisabled',
  no_accessible_child: 'reasonNoAccessibleChild',
  permission_missing: 'reasonPermissionMissing',
  invalid_permission_reference: 'reasonInvalidPermission',
  permission_disabled: 'reasonPermissionDisabled',
  permission_not_granted: 'reasonPermissionNotGranted',
}

/** 授权诊断页面的查询、筛选与展示投影。 */
export function useAuthorizationDiagnostics(t: Translate) {
  const userStore = useUserStore()
  const pageActive = ref(true)
  const selectedUserId = ref('')
  const userSearch = ref('')
  const permissionSearch = ref('')
  const menuSearch = ref('')
  let userSearchTimer: number | undefined

  onUnmounted(() => {
    if (userSearchTimer !== undefined) window.clearTimeout(userSearchTimer)
  })

  const usersQuery = useTenantQuery<SelectOptionList>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    'user-options',
    () => ({ q: userSearch.value, limit: 50 }),
    async (signal) => {
      const response = await listUserOptions(
        { q: userSearch.value || undefined, limit: 50 },
        signal,
      )
      return response.data ?? { items: [], has_more: false }
    },
    { refetchInterval: false },
  )

  const diagnosticQuery = useTenantQuery<AuthorizationDiagnostic>(
    () => userStore.tenantId,
    () =>
      userStore.sessionStatus === 'authenticated' &&
      pageActive.value &&
      Boolean(selectedUserId.value),
    'authorization-diagnostic',
    () => ({ userId: selectedUserId.value }),
    async (signal) =>
      requireOperationData(await getAuthorizationDiagnostic(selectedUserId.value, signal)),
    { refetchInterval: false },
  )

  async function refreshActiveData(): Promise<void> {
    const requests: Promise<unknown>[] = [usersQuery.refetch()]
    if (selectedUserId.value) requests.push(diagnosticQuery.refetch())
    await Promise.all(requests)
  }

  useKeepAlivePageActive(pageActive, refreshActiveData)

  function searchUsers(value: string): void {
    if (userSearchTimer !== undefined) window.clearTimeout(userSearchTimer)
    userSearchTimer = window.setTimeout(() => {
      userSearch.value = value.trim()
      userSearchTimer = undefined
    }, 300)
  }

  function handleSelectorVisible(open: boolean): void {
    if (open && !usersQuery.data.value) void usersQuery.refetch()
  }

  function recalculate(): void {
    if (!selectedUserId.value || diagnosticQuery.isFetching.value) return
    void diagnosticQuery.refetch({ throwOnError: true })
  }

  function yesNo(value: boolean): string {
    return t(value ? 'system.common.yes' : 'system.common.no')
  }

  function availableLabel(value: boolean): string {
    return t(
      value
        ? 'system.authorizationDiagnostic.available'
        : 'system.authorizationDiagnostic.unavailable',
    )
  }

  function filteredPermissions() {
    const diagnostic = diagnosticQuery.data.value
    if (!diagnostic) return []
    const keyword = permissionSearch.value.trim().toLocaleLowerCase()
    if (!keyword) return diagnostic.permissions
    return diagnostic.permissions.filter(
      (permission) =>
        permission.code.toLocaleLowerCase().includes(keyword) ||
        permission.name.toLocaleLowerCase().includes(keyword),
    )
  }

  function filteredMenus() {
    const diagnostic = diagnosticQuery.data.value
    if (!diagnostic) return []
    const keyword = menuSearch.value.trim().toLocaleLowerCase()
    if (!keyword) return diagnostic.menus
    return diagnostic.menus.filter(
      (menu) =>
        menu.name.toLocaleLowerCase().includes(keyword) ||
        menu.route_key?.toLocaleLowerCase().includes(keyword) ||
        menu.permission_code?.toLocaleLowerCase().includes(keyword),
    )
  }

  function scopeLabel(scope: string): string {
    return t(`system.authorizationDiagnostic.${SCOPE_KEYS[scope] ?? 'scopeSelf'}`)
  }

  function warningLabel(warning: string): string {
    const key = WARNING_KEYS[warning]
    return key ? t(`system.authorizationDiagnostic.${key}`) : warning
  }

  function reasonLabel(reason: string): string {
    const key = REASON_KEYS[reason]
    return key ? t(`system.authorizationDiagnostic.${key}`) : reason
  }

  function departmentNames(
    departments: AuthorizationDiagnostic['data_scope']['department_path'],
  ): string {
    return departments.map((department) => department.name).join(' / ') || '—'
  }

  function scopeSources(): string {
    const sources = diagnosticQuery.data.value?.data_scope.sources ?? []
    return (
      sources.map((source) => `${source.role_code}：${scopeLabel(source.scope)}`).join('；') || '—'
    )
  }

  function cacheStatusLabel(status: string): string {
    const key =
      {
        current: 'cacheCurrent',
        stale: 'cacheStale',
        missing: 'cacheMissing',
        unavailable: 'cacheUnavailable',
      }[status] ?? 'cacheUnavailable'
    return t(`system.authorizationDiagnostic.${key}`)
  }

  function cacheStatusTag(status: string): 'danger' | 'info' | 'success' | 'warning' {
    if (status === 'current') return 'success'
    if (status === 'stale') return 'warning'
    if (status === 'missing') return 'info'
    return 'danger'
  }

  return {
    availableLabel,
    cacheStatusLabel,
    cacheStatusTag,
    departmentNames,
    diagnosticQuery,
    filteredMenus,
    filteredPermissions,
    handleSelectorVisible,
    menuSearch,
    permissionSearch,
    reasonLabel,
    recalculate,
    scopeLabel,
    scopeSources,
    searchUsers,
    selectedUserId,
    usersQuery,
    warningLabel,
    yesNo,
  }
}
