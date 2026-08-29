import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import {
  forceLogout,
  listOnlineUser,
  type OnlineUserQuery,
  type OnlineUserRecord,
} from '@/api/modules/monitor'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import {
  assertServerStateScopeCurrent,
  invalidateServerStateResource,
  useServerStateScope,
} from '@/shared/query/client'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { propagateServerStatePageOperationError } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

type Translate = (key: string, params?: Record<string, unknown>) => string
type ForceLogoutCommand = { scope: ServerStateScope; user: OnlineUserRecord }

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
  const pageGeneration = ref(0)

  const onlineUsersQuery = useServerStateQuery<PageResponse<OnlineUserRecord>>(
    () => userStore.sessionStatus === 'authenticated' && pageActive.value,
    'monitor-online-users',
    () => ({ scope: 'list', filters: { ...activeQueryParams.value } }),
    async (signal) => {
      const response = await listOnlineUser({ ...activeQueryParams.value }, signal)
      return response.data ?? emptyPageResponse<OnlineUserRecord>(activeQueryParams.value)
    },
  )
  const logoutMutation = useServerStateMutation<void, ForceLogoutCommand>('monitor-online-users', {
    invalidateOnSuccess: false,
    meta: { errorMode: 'silent' },
    mutationFn: async (command) => {
      assertServerStateScopeCurrent(command.scope)
      await forceLogout(command.user.sid)
    },
  })

  const loading = onlineUsersQuery.isFetching
  const onlineUsers = onlineUsersQuery.data
  const forceLogoutPending = logoutMutation.pending
  const forcingSid = computed(() =>
    logoutMutation.pending.value ? (logoutMutation.variables.value?.user.sid ?? null) : null,
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
    const generation = pageGeneration.value
    const ownsOperation = () => pageActive.value && pageGeneration.value === generation
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          t('monitor.online.forceLogoutConfirm', { username: row.username }),
          t('monitor.online.warning'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation || logoutMutation.pending.value) return

    operation.assertCurrent(ownsOperation)
    try {
      await logoutMutation.mutateAsync({ scope: operation.scope, user: row })
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    operation.apply(() => ElMessage.success(t('monitor.online.forceLogoutSuccess')), ownsOperation)
    operation.assertCurrent(ownsOperation)
    await invalidateServerStateResource(operation.scope, 'monitor-online-users')
    operation.assertCurrent(ownsOperation)
    await onlineUsersQuery.refetch({ throwOnError: true })
    operation.assertCurrent(ownsOperation)
  }

  useKeepAlivePageActive(pageActive, () => onlineUsersQuery.refetch())

  function invalidatePageOperations(): void {
    pageGeneration.value += 1
  }

  watch(useServerStateScope(), invalidatePageOperations, { flush: 'sync' })
  onDeactivated(invalidatePageOperations)
  onBeforeUnmount(invalidatePageOperations)

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
