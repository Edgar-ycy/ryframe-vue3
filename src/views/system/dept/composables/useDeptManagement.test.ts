import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeptNode } from '@/api/modules/dept'

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
  createDept: vi.fn(),
  deleteDept: vi.fn(),
  getDept: vi.fn(),
  getDeptTree: vi.fn(),
  mutationCalls: [] as MutationHarnessEntry[],
  queryCalls: [] as unknown[][],
  refetchDepartments: vi.fn(),
  updateDept: vi.fn(),
}))

vi.mock('@/api/modules/dept', () => ({
  createDept: mocks.createDept,
  deleteDept: mocks.deleteDept,
  getDept: mocks.getDept,
  getDeptTree: mocks.getDeptTree,
  updateDept: mocks.updateDept,
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a', sessionStatus: 'authenticated' }),
}))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: mocks.confirmAction }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    if (mocks.queryCalls.length === 1) {
      return {
        data: { value: [] },
        isFetching: { value: false },
        refetch: mocks.refetchDepartments,
      }
    }
    return { data: { value: undefined }, isFetching: { value: false }, refetch: vi.fn() }
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

import { useDeptManagement } from './useDeptManagement'

function department(): DeptNode {
  return {
    id: 'dept-1',
    name: 'Engineering',
    parent_id: null,
    sort: 1,
    status: '1',
    children: [],
  } as DeptNode
}

describe('部门管理 Query/Mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryCalls.length = 0
    mocks.mutationCalls.length = 0
    mocks.confirmAction.mockResolvedValue(true)
    mocks.createDept.mockResolvedValue({})
    mocks.deleteDept.mockResolvedValue({})
    mocks.getDept.mockResolvedValue({ data: department() })
    mocks.getDeptTree.mockResolvedValue({ data: [] })
    mocks.refetchDepartments.mockResolvedValue({})
    mocks.updateDept.mockResolvedValue({})
  })

  it('使用租户资源键并把 AbortSignal 传给部门树和详情', async () => {
    const management = useDeptManagement(key => key)
    const tree = mocks.queryCalls[0]!
    const detail = mocks.queryCalls[1]!
    const controller = new AbortController()

    expect((tree[0] as () => string)()).toBe('tenant-a')
    expect(tree[2]).toBe('departments')
    expect((tree[3] as () => unknown)()).toEqual({ scope: 'tree' })
    await (tree[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    management.handleEdit(department())
    expect((detail[1] as () => boolean)()).toBe(true)
    expect((detail[3] as () => unknown)()).toEqual({ scope: 'detail', id: 'dept-1' })
    await (detail[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal)

    expect(mocks.getDeptTree).toHaveBeenCalledWith(controller.signal)
    expect(mocks.getDept).toHaveBeenCalledWith('dept-1', controller.signal)
  })

  it('删除 pending 时阻止重复提交并在部门资源失效后刷新', async () => {
    let finishDelete!: () => void
    mocks.deleteDept.mockImplementation(() => new Promise<void>((resolve) => {
      finishDelete = resolve
    }))
    const management = useDeptManagement(key => key)
    const target = department()
    const first = management.handleDelete(target)
    await vi.waitFor(() => expect(mocks.deleteDept).toHaveBeenCalledOnce())

    await management.handleDelete(target)
    expect(mocks.deleteDept).toHaveBeenCalledOnce()

    finishDelete()
    await first
    expect(mocks.mutationCalls[1]?.resource).toBe('departments')
    expect(mocks.refetchDepartments).toHaveBeenCalledOnce()
  })

  it('确认取消与删除 API 错误保持分离', async () => {
    const management = useDeptManagement(key => key)
    mocks.confirmAction.mockResolvedValueOnce(false)
    await management.handleDelete(department())
    expect(mocks.deleteDept).not.toHaveBeenCalled()

    const error = new Error('delete failed')
    mocks.confirmAction.mockResolvedValueOnce(true)
    mocks.deleteDept.mockRejectedValueOnce(error)
    await expect(management.handleDelete(department())).rejects.toBe(error)
    expect(mocks.refetchDepartments).not.toHaveBeenCalled()
  })
})
