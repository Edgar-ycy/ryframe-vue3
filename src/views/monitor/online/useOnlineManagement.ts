import {
  forceLogout,
  listOnlineUser,
  type OnlineUserQuery,
  type OnlineUserRecord,
} from '@/api/modules/monitor'
import type { PageResponse } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

type Translate = (key: string, params?: Record<string, unknown>) => string

export function useOnlineManagement(t: Translate) {
  const userStore = useUserStore()
  const pageActive = ref(true)
  const queryParams = ref<OnlineUserQuery>({
    page: 1,
    page_size: 10,
    username: '',
    ipaddr: '',
  })
  const activeQueryParams = ref<OnlineUserQuery>({ ...queryParams.value })

  const onlineUsersQuery = useTenantQuery<PageResponse<OnlineUserRecord>>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    'monitor-online-users',
    () => ({ scope: 'list', filters: { ...activeQueryParams.value } }),
    async signal => {
      const response = await listOnlineUser({ ...activeQueryParams.value }, signal)
      return response.data ?? {
        items: [],
        page: activeQueryParams.value.page ?? 1,
        page_size: activeQueryParams.value.page_size ?? 10,
        total: 0,
        total_pages: 0,
        max_page_size: activeQueryParams.value.page_size ?? 10,
      }
    },
  )
  const logoutMutation = useTenantMutation<void, OnlineUserRecord>(
    () => userStore.tenantId,
    'monitor-online-users',
    {
      mutationFn: async user => {
        await forceLogout(user.sid)
      },
      onSuccess: () => {
        ElMessage.success(t('monitor.online.forceLogoutSuccess'))
      },
    },
  )

  const loading = computed(() => onlineUsersQuery.isFetching.value)
  const tableData = computed(() => onlineUsersQuery.data.value?.items ?? [])
  const total = computed(() => onlineUsersQuery.data.value?.total ?? 0)
  const forceLogoutPending = logoutMutation.pending
  const forcingSid = computed(() => (
    logoutMutation.pending.value ? logoutMutation.variables.value?.sid ?? null : null
  ))

  async function fetchData(): Promise<void> {
    const nextParams = { ...queryParams.value }
    if (JSON.stringify(nextParams) !== JSON.stringify(activeQueryParams.value)) {
      activeQueryParams.value = nextParams
      return
    }
    await onlineUsersQuery.refetch({ throwOnError: true })
  }

  function handleSearch(): void {
    queryParams.value.page = 1
    void fetchData()
  }

  function handleReset(): void {
    queryParams.value = {
      page: 1,
      page_size: queryParams.value.page_size,
      username: '',
      ipaddr: '',
    }
    void fetchData()
  }

  async function handleForceLogout(row: OnlineUserRecord): Promise<void> {
    if (logoutMutation.pending.value) return
    const confirmed = await confirmAction(
      t('monitor.online.forceLogoutConfirm', { username: row.username }),
      t('monitor.online.warning'),
      { type: 'warning' },
    )
    if (!confirmed || logoutMutation.pending.value) return

    await logoutMutation.mutateAsync(row)
    await onlineUsersQuery.refetch({ throwOnError: true })
  }

  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    void onlineUsersQuery.refetch()
  })

  onDeactivated(() => {
    pageActive.value = false
  })

  return {
    fetchData,
    forceLogoutPending,
    forcingSid,
    handleForceLogout,
    handleReset,
    handleSearch,
    loading,
    queryParams,
    tableData,
    total,
  }
}
