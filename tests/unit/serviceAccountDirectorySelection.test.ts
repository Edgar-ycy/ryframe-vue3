import { computed, reactive, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServiceAccount } from '@/api/modules/serviceAccount'
import { HttpError } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServiceAccountDirectory } from '@/views/system/service-accounts/composables/useServiceAccountDirectory'

function account(id: string): ServiceAccount {
  return {
    authorization_version: 1,
    code: id,
    created_at: '2026-08-29T00:00:00.000Z',
    id,
    max_requests_per_minute: 60,
    name: id,
    status: '1',
    updated_at: '2026-08-29T00:00:00.000Z',
  }
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function createContext() {
  const identity: ServerStateScope = {
    tenantId: 'tenant-a',
    subjectId: 'user-a',
    sessionEpoch: 1,
  }
  const selectedAccount = ref<ServiceAccount | null>(account('previous'))
  const roleIds = ref<readonly string[]>([])
  const invalidationCallbacks: Array<() => void> = []
  let active = true
  const context: Parameters<typeof useServiceAccountDirectory>[0] = {
    accountsQuery: { refetch: vi.fn().mockResolvedValue(undefined) },
    activeQueryParams: reactive({ page: 1, page_size: 20 }),
    beginController: () => new AbortController(),
    canListAccounts: computed(() => true),
    captureIdentity: () => (active ? 'guard-a' : undefined),
    credentialsKey: (_scope: ServerStateScope, id: string | null) => ['credentials', id],
    currentIdentity: () => (active ? identity : undefined),
    detailKey: (_scope: ServerStateScope, id: string | null) => ['detail', id],
    detailQuery: { refetch: vi.fn().mockResolvedValue(undefined) },
    ensureOperationContext: (_scope: ServerStateScope, guard: string) => {
      if (!active || guard !== 'guard-a') {
        throw new HttpError('页面已经失活', { kind: 'cancelled' })
      }
    },
    featureAvailable: computed(() => true),
    finishController: vi.fn(),
    onIdentityChanged: (callback: () => void) => {
      invalidationCallbacks.push(callback)
      return () => undefined
    },
    pageActive: ref(true),
    queryParams: reactive({ page: 1, page_size: 20 }),
    removeAccountFromPage: vi.fn(),
    requireIdentity: () => identity,
    requireOperationContext: (guard: string | undefined) => {
      if (!active || guard !== 'guard-a') {
        throw new HttpError('页面已经失活', { kind: 'cancelled' })
      }
      return guard
    },
    roleIds,
    selectedAccount,
    updateAccountPage: vi.fn(),
  }
  return {
    context,
    invalidate: () => {
      active = false
      for (const callback of invalidationCallbacks) callback()
    },
    roleIds,
    selectedAccount,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('服务账号详情选择所有权', () => {
  it('同 scope 快速选择 A/B 时迟到 A 不覆盖 B', async () => {
    const gates = Array.from({ length: 4 }, deferred)
    let callIndex = 0
    vi.spyOn(queryClient, 'cancelQueries').mockImplementation(() => gates[callIndex++]!.promise)
    const { context, selectedAccount } = createContext()
    const directory = useServiceAccountDirectory(context)

    const selectA = directory.selectAccount(account('account-a'), 'guard-a')
    const selectB = directory.selectAccount(account('account-b'), 'guard-a')
    expect(queryClient.cancelQueries).toHaveBeenCalledTimes(4)
    // 第二次选择的两个取消请求先完成。
    gates[2]!.resolve()
    gates[3]!.resolve()
    await selectB
    expect(selectedAccount.value?.id).toBe('account-b')

    gates[0]!.resolve()
    gates[1]!.resolve()
    await expect(selectA).rejects.toMatchObject({ kind: 'cancelled' })
    expect(selectedAccount.value?.id).toBe('account-b')
  })

  it('页面失活后取消查询的迟到 continuation 不恢复旧选择', async () => {
    const gates = Array.from({ length: 2 }, deferred)
    let callIndex = 0
    vi.spyOn(queryClient, 'cancelQueries').mockImplementation(() => gates[callIndex++]!.promise)
    const { context, invalidate, selectedAccount } = createContext()
    const directory = useServiceAccountDirectory(context)

    const selection = directory.selectAccount(account('account-a'), 'guard-a')
    invalidate()
    selectedAccount.value = null
    gates[0]!.resolve()
    gates[1]!.resolve()

    await expect(selection).rejects.toMatchObject({ kind: 'cancelled' })
    expect(selectedAccount.value).toBeNull()
  })
})
