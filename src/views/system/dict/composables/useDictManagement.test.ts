import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DictDataRecord, DictTypeRecord } from '@/api/modules/dict'

interface MutationOptionsMock {
  mutationFn: (input: unknown) => Promise<unknown>
  onError?: (error: unknown, input: unknown) => unknown
  onSuccess?: (data: unknown, input: unknown) => unknown
}

interface MutationHarnessEntry {
  resource: string
  pending: { value: boolean }
  variables: { value?: unknown }
  mutateAsync: (variables: unknown) => Promise<unknown>
}

const mocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  deleteDictData: vi.fn(),
  deleteDictType: vi.fn(),
  listDictData: vi.fn(),
  listDictType: vi.fn(),
  mutationCalls: [] as MutationHarnessEntry[],
  queryCalls: [] as unknown[][],
  refetchData: vi.fn(),
  refetchTypes: vi.fn(),
  typeItems: { value: [] as DictTypeRecord[] },
}))

vi.mock('@/api/modules/dict', () => ({
  deleteDictData: mocks.deleteDictData,
  deleteDictType: mocks.deleteDictType,
  exportDictType: vi.fn(),
  listDictData: mocks.listDictData,
  listDictType: mocks.listDictType,
}))
vi.mock('@/hooks/useAsyncExport', () => ({
  useAsyncExport: () => ({ pending: { value: false }, exportAndDownload: vi.fn() }),
}))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a', sessionStatus: 'authenticated' }),
}))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: mocks.confirmAction }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    if (args[2] === 'dict-types') {
      return {
        data: { value: { items: mocks.typeItems.value, total: mocks.typeItems.value.length } },
        isFetching: { value: false },
        refetch: mocks.refetchTypes,
      }
    }
    return {
      data: { value: [] },
      isFetching: { value: false },
      refetch: mocks.refetchData,
    }
  },
}))
vi.mock('@/shared/query/useTenantMutation', () => ({
  useTenantMutation: (_tenantId: unknown, resource: string, options: MutationOptionsMock) => {
    const pending = { value: false }
    const variables: { value?: unknown } = {}
    const mutateAsync = async (input: unknown) => {
      pending.value = true
      variables.value = input
      try {
        const data = await options.mutationFn(input)
        await options.onSuccess?.(data, input)
        return data
      }
      catch (error) {
        await options.onError?.(error, input)
        throw error
      }
      finally {
        pending.value = false
      }
    }
    mocks.mutationCalls.push({ resource, pending, variables, mutateAsync })
    return { pending, variables, mutateAsync }
  },
}))

import { useDictManagement } from './useDictManagement'

function dictType(): DictTypeRecord {
  return {
    id: 'type-1',
    name: 'User status',
    code: 'user_status',
    status: '1',
    created_at: '2026-08-01T00:00:00Z',
  } as DictTypeRecord
}

function dictData(): DictDataRecord {
  return {
    id: 'data-1',
    type_code: 'user_status',
    label: 'Enabled',
    value: '1',
    sort: 1,
    status: '1',
  } as DictDataRecord
}

describe('字典管理 Query/Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryCalls.length = 0
    mocks.mutationCalls.length = 0
    mocks.typeItems.value = [dictType()]
    mocks.confirmAction.mockResolvedValue(true)
    mocks.deleteDictData.mockResolvedValue({})
    mocks.deleteDictType.mockResolvedValue({})
    mocks.listDictData.mockResolvedValue({ data: [] })
    mocks.listDictType.mockResolvedValue({ data: { items: [], total: 0 } })
    mocks.refetchData.mockResolvedValue({})
    mocks.refetchTypes.mockResolvedValue({})
  })

  it('使用租户资源键并把 AbortSignal 传给类型和当前类型数据 API', async () => {
    const management = useDictManagement()
    const types = mocks.queryCalls[0]!
    const data = mocks.queryCalls[1]!
    const controller = new AbortController()

    expect((types[0] as () => string)()).toBe('tenant-a')
    expect(types[2]).toBe('dict-types')
    expect((types[3] as () => unknown)()).toEqual({
      scope: 'list',
      filters: { page: 1, page_size: 10 },
    })
    await (types[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)
    await management.handleTypeClick(dictType())
    expect((data[1] as () => boolean)()).toBe(true)
    expect((data[3] as () => unknown)()).toEqual({
      scope: 'list',
      typeCode: 'user_status',
    })
    await (data[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.listDictType).toHaveBeenCalledWith(
      { page: 1, page_size: 10 },
      controller.signal,
    )
    expect(mocks.listDictData).toHaveBeenCalledWith(
      { type_code: 'user_status' },
      controller.signal,
    )
  })

  it('删除类型 pending 时阻止重复提交并在资源失效后刷新类型列表', async () => {
    let finishDelete!: () => void
    mocks.deleteDictType.mockImplementation(() => new Promise<void>((resolve) => {
      finishDelete = resolve
    }))
    const management = useDictManagement()
    const target = dictType()
    const first = management.handleDeleteType(target)
    await vi.waitFor(() => expect(mocks.deleteDictType).toHaveBeenCalledOnce())

    await management.handleDeleteType(target)
    expect(mocks.deleteDictType).toHaveBeenCalledOnce()

    finishDelete()
    await first
    expect(mocks.mutationCalls[0]?.resource).toBe('dict-types')
    expect(mocks.refetchTypes).toHaveBeenCalledOnce()
  })

  it('删除字典数据的 API 错误保持原对象且不刷新', async () => {
    const error = new Error('delete failed')
    mocks.deleteDictData.mockRejectedValueOnce(error)
    const management = useDictManagement()
    await management.handleTypeClick(dictType())

    await expect(management.handleDeleteData(dictData())).rejects.toBe(error)
    expect(mocks.refetchData).not.toHaveBeenCalled()
  })
})
