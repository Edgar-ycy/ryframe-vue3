import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mutationHarness = vi.hoisted(() => ({
  useMutation: vi.fn(),
}))
const queryHarness = vi.hoisted(() => ({
  invalidateTenantResource: vi.fn(),
}))

vi.mock('@tanstack/vue-query', () => ({
  useMutation: mutationHarness.useMutation,
}))
vi.mock('./client', () => ({
  invalidateTenantResource: queryHarness.invalidateTenantResource,
  tenantQueryKey: (tenantId: string | undefined, resource: string, params?: unknown) => [
    'server-state',
    tenantId || 'anonymous',
    resource,
    params ?? null,
  ],
}))

import { useTenantMutation } from './useTenantMutation'

interface CapturedMutationOptions {
  mutationKey: { value: unknown }
  mutationFn: (variables: { name: string }) => Promise<string>
  meta?: { errorMode?: 'global' | 'silent' }
  onSuccess: (
    data: string,
    variables: { name: string },
    onMutateResult: unknown,
    context: { mutationKey?: readonly unknown[] },
  ) => Promise<void>
}

function capturedOptions(): CapturedMutationOptions {
  const options = mutationHarness.useMutation.mock.calls.at(-1)?.[0] as
    | CapturedMutationOptions
    | undefined
  if (!options) throw new Error('写入选项未传入 useMutation')
  return options
}

describe('租户写入封装', () => {
  beforeEach(() => {
    mutationHarness.useMutation.mockReset()
    queryHarness.invalidateTenantResource.mockReset().mockResolvedValue(undefined)
    mutationHarness.useMutation.mockImplementation(() => ({
      isPending: { value: false },
      mutateAsync: vi.fn(),
    }))
  })

  it('使用响应式租户键并暴露统一 pending 状态', () => {
    const tenantId = ref('tenant-a')
    const mutation = useTenantMutation(tenantId, 'users', {
      meta: { errorMode: 'silent' },
      mutationFn: async (variables: { name: string }) => variables.name,
    })

    const options = capturedOptions()
    expect(options.mutationKey.value).toEqual([
      'server-state',
      'tenant-a',
      'users',
      'mutation',
    ])
    expect(options.meta).toEqual({ errorMode: 'silent' })
    expect(mutation.pending).toBe(mutation.isPending)

    tenantId.value = 'tenant-b'
    expect(options.mutationKey.value).toEqual([
      'server-state',
      'tenant-b',
      'users',
      'mutation',
    ])
  })

  it('成功后调用业务回调并只失效本次 mutation 对应的租户资源', async () => {
    const onSuccess = vi.fn()
    useTenantMutation('tenant-current', 'notices', {
      mutationFn: async variables => variables.name,
      onSuccess,
    })

    const options = capturedOptions()
    const variables = { name: '公告' }
    const context = {
      mutationKey: ['server-state', 'tenant-request', 'notices', 'mutation'],
    }
    await options.onSuccess('ok', variables, undefined, context)

    expect(onSuccess).toHaveBeenCalledWith('ok', variables, undefined, context)
    expect(queryHarness.invalidateTenantResource).toHaveBeenCalledWith(
      'tenant-request',
      'notices',
    )
  })
})
