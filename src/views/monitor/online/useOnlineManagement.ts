import {
  forceLogout,
  listOnlineUser,
  type OnlineUserQuery,
  type OnlineUserRecord,
} from '@/api/modules/monitor'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
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

  const onlineUsersQuery = useServerStateQuery<PageResponse<OnlineUserRecord>>(
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    'monitor-online-users',
    () => ({ scope: 'list', filters: { ...activeQueryParams.value } }),
    async (signal) => {
      const response = await listOnlineUser({ ...activeQueryParams.value }, signal)
      return response.data ?? emptyPageResponse<OnlineUserRecord>(activeQueryParams.value)
    },
  )
  const logoutMutation = useServerStateMutation<void, OnlineUserRecord>('monitor-online-users', {
    mutationFn: async (user) => {
      await forceLogout(user.sid)
    },
    onSuccess: () => {
      ElMessage.success(t('monitor.online.forceLogoutSuccess'))
    },
  })

  const loading = onlineUsersQuery.isFetching
  const onlineUsers = onlineUsersQuery.data
  const forceLogoutPending = logoutMutation.pending
  const forcingSid = computed(() =>
    logoutMutation.pending.value ? (logoutMutation.variables.value?.sid ?? null) : null,
  )

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

  useKeepAlivePageActive(pageActive, () => onlineUsersQuery.refetch())

  return {
    fetchData,
    forceLogoutPending,
    forcingSid,
    handleForceLogout,
    handleReset,
    handleSearch,
    loading,
    onlineUsers,
    queryParams,
  }
}
