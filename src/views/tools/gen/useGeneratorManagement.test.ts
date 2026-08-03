import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TableInfo } from '@/api/modules/tools'

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
  generateCode: vi.fn(),
  listTable: vi.fn(),
  mutationCalls: [] as MutationHarnessEntry[],
  previewCode: vi.fn(),
  queryCalls: [] as unknown[][],
  refetchPreview: vi.fn(),
  refetchTables: vi.fn(),
}))

vi.mock('@/api/modules/tools', () => ({
  generateCode: mocks.generateCode,
  listTable: mocks.listTable,
  previewCode: mocks.previewCode,
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a', sessionStatus: 'authenticated' }),
}))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    const isTables = args[2] === 'code-generator-tables'
    return {
      data: {
        value: isTables
          ? {
              items: [],
              page: 1,
              page_size: 10,
              total: 0,
              total_pages: 0,
              max_page_size: 100,
            }
          : [],
      },
      isFetching: { value: false },
      refetch: isTables ? mocks.refetchTables : mocks.refetchPreview,
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

import { useGeneratorManagement } from './useGeneratorManagement'

function table(): TableInfo {
  return {
    columns: [],
    comment: '用户表',
    table_name: 'sys_user',
  }
}

describe('代码生成器 Query/Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutationCalls.length = 0
    mocks.queryCalls.length = 0
    mocks.generateCode.mockResolvedValue({ data: { written: ['user.rs'], skipped: [] } })
    mocks.listTable.mockResolvedValue({ data: undefined })
    mocks.previewCode.mockResolvedValue({ data: [] })
    mocks.refetchPreview.mockResolvedValue({})
    mocks.refetchTables.mockResolvedValue({})
  })

  it('数据表和预览使用独立租户资源键并传递 AbortSignal', async () => {
    const management = useGeneratorManagement(key => key)
    const tablesQuery = mocks.queryCalls[0]!
    const previewQuery = mocks.queryCalls[1]!
    const controller = new AbortController()

    expect((tablesQuery[0] as () => string)()).toBe('tenant-a')
    expect(tablesQuery[2]).toBe('code-generator-tables')
    await (tablesQuery[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    management.handlePreview(table())
    expect(previewQuery[2]).toBe('code-generator-preview')
    expect((previewQuery[1] as () => boolean)()).toBe(true)
    expect((previewQuery[3] as () => unknown)()).toEqual({
      scope: 'table',
      table: 'sys_user',
    })
    await (previewQuery[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.listTable).toHaveBeenCalledWith(
      { page: 1, page_size: 10, table_name: '', table_comment: '' },
      controller.signal,
    )
    expect(mocks.previewCode).toHaveBeenCalledWith(
      { tables: ['sys_user'] },
      controller.signal,
    )
  })

  it('筛选条件仅在搜索提交后切换列表查询键', async () => {
    const management = useGeneratorManagement(key => key)
    const tablesQuery = mocks.queryCalls[0]!
    management.queryParams.value.table_name = 'sys_user'

    await management.fetchData()
    expect((tablesQuery[3] as () => unknown)()).toEqual({
      scope: 'list',
      filters: {
        page: 1,
        page_size: 10,
        table_name: 'sys_user',
        table_comment: '',
      },
    })
    expect(mocks.refetchTables).not.toHaveBeenCalled()

    await management.fetchData()
    expect(mocks.refetchTables).toHaveBeenCalledOnce()
  })

  it('生成写盘 pending 时阻止重复提交并使用独立写资源', async () => {
    let finishGeneration!: () => void
    mocks.generateCode.mockImplementation(() => new Promise((resolve) => {
      finishGeneration = () => resolve({ data: { written: ['user.rs'], skipped: [] } })
    }))
    const management = useGeneratorManagement(key => key)
    management.setGenerateFormRef({
      clearValidate: vi.fn(),
      validate: vi.fn().mockResolvedValue(true),
    })
    management.handleGen(table())
    management.generateForm.output_dir = 'D:/generated/ryframe'
    const first = management.submitGeneration()
    await vi.waitFor(() => expect(mocks.generateCode).toHaveBeenCalledOnce())

    await management.submitGeneration()
    expect(mocks.generateCode).toHaveBeenCalledOnce()

    finishGeneration()
    await first
    expect(mocks.mutationCalls[0]?.resource).toBe('code-generator-files')
    expect(management.generateVisible.value).toBe(false)
  })

  it('生成写盘错误继续抛出且保留生成弹窗', async () => {
    const error = new Error('generation failed')
    mocks.generateCode.mockRejectedValueOnce(error)
    const management = useGeneratorManagement(key => key)
    management.setGenerateFormRef({
      clearValidate: vi.fn(),
      validate: vi.fn().mockResolvedValue(true),
    })
    management.handleGen(table())
    management.generateForm.output_dir = 'D:/generated/ryframe'

    await expect(management.submitGeneration()).rejects.toBe(error)
    expect(management.generateVisible.value).toBe(true)
  })
})
