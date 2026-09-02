import { createPinia, setActivePinia } from 'pinia'
import { effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createProfileServiceDelegation: vi.fn(),
  revokeProfileServiceDelegation: vi.fn(),
}))
const idempotency = vi.hoisted(() => ({ createIdempotencyKey: vi.fn() }))

vi.mock('@/api/modules/profileServiceDelegation', () => api)
vi.mock('@/shared/http/idempotency', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/http/idempotency')>()),
  createIdempotencyKey: idempotency.createIdempotencyKey,
}))
vi.mock('@/views/profile/useServiceDelegationQueries', async () => {
  const { ref } = await import('vue')
  return {
    useServiceDelegationQueries: () => ({
      delegationsKey: vi.fn(() => ['delegations']),
      delegationsQuery: {
        data: ref([]),
        error: ref(),
        isFetching: ref(false),
        refetch: vi.fn().mockResolvedValue(undefined),
      },
      targetsQuery: {
        data: ref([]),
        error: ref(),
        isFetching: ref(false),
        refetch: vi.fn().mockResolvedValue(undefined),
      },
    }),
  }
})

import type { CreateProfileServiceDelegationInput } from '@/api/modules/profileServiceDelegation'
import { HttpError } from '@/shared/http/client'
import { deactivateServerStateScope, transitionServerStateScope } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { useServiceDelegationManagement } from '@/views/profile/useServiceDelegationManagement'

interface Deferred<T> {
  promise: Promise<T>
  reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((_resolve, decline) => {
    reject = decline
  })
  return { promise, reject }
}

function activate(fingerprint: string): void {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: 'user-a',
      authorizationFingerprint: fingerprint,
    },
    () => undefined,
    { force: true },
  )
}

function runComposable(): {
  result: ReturnType<typeof useServiceDelegationManagement>
  scope: EffectScope
} {
  const scope = effectScope()
  const result = scope.run(() => useServiceDelegationManagement())
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

const input: CreateProfileServiceDelegationInput = {
  capability_keys: ['system:user:list'],
  reason: '自动化测试',
  service_account_id: 'service-1',
}

describe('个人服务委托会话范围', () => {
  let scopes: EffectScope[]
  let keySequence: number

  beforeEach(() => {
    scopes = []
    setActivePinia(createPinia())
    useUserStore().$patch({
      sessionStatus: 'authenticated',
      tenantId: 'tenant-a',
      userId: 'user-a',
    })
    deactivateServerStateScope()
    keySequence = 0
    idempotency.createIdempotencyKey
      .mockReset()
      .mockImplementation((prefix: string) =>
        prefix === 'profile-delegation-context' ? 'context-nonce' : `export-${++keySequence}`,
      )
    api.createProfileServiceDelegation.mockReset()
  })

  afterEach(() => {
    for (const scope of scopes) scope.stop()
    deactivateServerStateScope()
  })

  it('同主体 epoch 切换立即释放 pending，旧 finally 不得清除新操作状态', async () => {
    activate('authorization-a')
    const stale = deferred<never>()
    const fresh = deferred<never>()
    api.createProfileServiceDelegation
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(fresh.promise)
    const composable = runComposable()
    scopes.push(composable.scope)

    const staleOutcome = composable.result.issueDelegation(input).catch((error) => error)
    expect(composable.result.createPending.value).toBe(true)
    activate('authorization-b')
    expect(composable.result.createPending.value).toBe(false)

    const freshOutcome = composable.result.issueDelegation(input).catch((error) => error)
    expect(composable.result.createPending.value).toBe(true)
    stale.reject(new HttpError('旧请求失败', { kind: 'network' }))
    await staleOutcome
    expect(composable.result.createPending.value).toBe(true)

    fresh.reject(new HttpError('新请求失败', { kind: 'network' }))
    await freshOutcome
    expect(composable.result.createPending.value).toBe(false)
  })

  it('旧 epoch 的迟到 catch 不得删除新 epoch 保留的幂等键', async () => {
    activate('authorization-a')
    const stale = deferred<never>()
    const fresh = deferred<never>()
    const retry = deferred<never>()
    api.createProfileServiceDelegation
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(fresh.promise)
      .mockReturnValueOnce(retry.promise)
    const composable = runComposable()
    scopes.push(composable.scope)

    const staleOutcome = composable.result.issueDelegation(input).catch((error) => error)
    activate('authorization-b')
    const freshOutcome = composable.result.issueDelegation(input).catch((error) => error)
    fresh.reject(new HttpError('结果未知', { kind: 'network' }))
    await freshOutcome
    stale.reject(new HttpError('旧结果未知', { kind: 'network' }))
    await staleOutcome

    const retryOutcome = composable.result.issueDelegation(input).catch((error) => error)
    expect(api.createProfileServiceDelegation.mock.calls.map((call) => call[1])).toEqual([
      'export-1',
      'export-2',
      'export-2',
    ])
    retry.reject(new HttpError('停止测试', { status: 400, kind: 'http' }))
    await retryOutcome
  })
})
