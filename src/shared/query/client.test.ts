import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/client'
import {
  clearServerState,
  configureServerStateErrorReporter,
  invalidateTenantResource,
  invalidateTenantServerState,
  queryClient,
  tenantQueryKey,
} from './client'

describe('租户服务端状态缓存', () => {
  afterEach(() => {
    configureServerStateErrorReporter(undefined)
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it('在租户之间隔离同名资源', () => {
    expect(tenantQueryKey('tenant-a', 'posts', { page: 1 }))
      .not.toEqual(tenantQueryKey('tenant-b', 'posts', { page: 1 }))
    expect(tenantQueryKey(undefined, 'posts')).toEqual([
      'server-state',
      'anonymous',
      'posts',
      null,
    ])
  })

  it('客户端和取消失败不重试，网络和服务端失败最多重试两次', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry
    expect(typeof retry).toBe('function')
    if (typeof retry !== 'function') throw new Error('retry policy must be a function')
    expect(retry(0, new HttpError('bad request', { status: 400 }))).toBe(false)
    expect(retry(0, new HttpError('cancelled', { kind: 'cancelled' }))).toBe(false)
    expect(retry(0, new HttpError('unavailable', { status: 503 }))).toBe(true)
    expect(retry(1, new HttpError('unavailable', { status: 503 }))).toBe(true)
    expect(retry(2, new HttpError('unavailable', { status: 503 }))).toBe(false)
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000)
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(5 * 60_000)
    expect(queryClient.getDefaultOptions().queries?.refetchOnReconnect).toBe(true)
  })

  it('登录身份变更时清空全部服务端状态', () => {
    const clear = vi.spyOn(queryClient, 'clear').mockImplementation(() => undefined)

    clearServerState()

    expect(clear).toHaveBeenCalledOnce()
  })

  it('可按租户或单个资源精确标记缓存过期', async () => {
    const invalidate = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined)

    await invalidateTenantServerState('tenant-a')
    await invalidateTenantResource('tenant-a', 'messages')

    expect(invalidate).toHaveBeenNthCalledWith(1, {
      queryKey: ['server-state', 'tenant-a'],
    })
    expect(invalidate).toHaveBeenNthCalledWith(2, {
      queryKey: ['server-state', 'tenant-a', 'messages'],
      refetchType: 'none',
    })
  })

  it('查询和写入错误各由全局缓存出口提示一次', async () => {
    const report = vi.fn()
    configureServerStateErrorReporter(report)
    const queryError = new HttpError('query failed', { status: 503 })
    const mutationError = new HttpError('mutation failed', { status: 409 })
    const queryFn = vi.fn(async () => Promise.reject(queryError))

    await expect(queryClient.fetchQuery({
      queryKey: ['server-state', 'tenant-a', 'users'],
      queryFn,
      retry: 2,
      retryDelay: 0,
    })).rejects.toBe(queryError)
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationKey: ['tenant-a', 'users', 'create'],
      mutationFn: async () => Promise.reject(mutationError),
    })
    await expect(mutation.execute(undefined)).rejects.toBe(mutationError)

    expect(queryFn).toHaveBeenCalledTimes(3)
    expect(report).toHaveBeenCalledTimes(2)
    expect(report).toHaveBeenNthCalledWith(1, queryError)
    expect(report).toHaveBeenNthCalledWith(2, mutationError)
  })

  it('silent 模式和取消错误不会触发全局提示', async () => {
    const report = vi.fn()
    configureServerStateErrorReporter(report)

    await expect(queryClient.fetchQuery({
      queryKey: ['server-state', 'tenant-a', 'silent'],
      queryFn: async () => Promise.reject(new HttpError('silent', { status: 400 })),
      retry: false,
      meta: { errorMode: 'silent' },
    })).rejects.toBeInstanceOf(HttpError)
    await expect(queryClient.fetchQuery({
      queryKey: ['server-state', 'tenant-a', 'cancelled'],
      queryFn: async () => Promise.reject(new HttpError('cancelled', { kind: 'cancelled' })),
      retry: false,
    })).rejects.toBeInstanceOf(HttpError)

    expect(report).not.toHaveBeenCalled()
  })
})
