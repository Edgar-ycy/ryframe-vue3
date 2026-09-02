import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/client'
import { configureServerStateErrorReporter, queryClient } from '@/shared/query/client'

describe('服务端状态错误出口', () => {
  beforeEach(() => {
    queryClient.clear()
    configureServerStateErrorReporter(undefined)
  })

  afterEach(() => {
    queryClient.clear()
    configureServerStateErrorReporter(undefined)
  })

  it('默认错误只交给全局 reporter 一次', async () => {
    const reporter = vi.fn()
    const error = new HttpError('请求失败', { status: 400, kind: 'http' })
    configureServerStateErrorReporter(reporter)

    await expect(
      queryClient.fetchQuery({
        queryKey: ['query-error-policy', 'global'],
        queryFn: () => Promise.reject(error),
      }),
    ).rejects.toBe(error)

    expect(reporter).toHaveBeenCalledOnce()
    expect(reporter).toHaveBeenCalledWith(error)
  })

  it('局部处理的错误不进入全局 reporter', async () => {
    const reporter = vi.fn()
    const error = new HttpError('请求失败', { status: 400, kind: 'http' })
    const queryKey = ['query-error-policy', 'silent'] as const
    configureServerStateErrorReporter(reporter)

    await expect(
      queryClient.fetchQuery({
        queryKey,
        meta: { errorMode: 'silent' },
        queryFn: () => Promise.reject(error),
      }),
    ).rejects.toBe(error)

    expect(queryClient.getQueryState(queryKey)?.error).toBe(error)
    expect(reporter).not.toHaveBeenCalled()
  })

  it('取消错误永远不提示', async () => {
    const reporter = vi.fn()
    const error = new HttpError('请求已取消', { kind: 'cancelled' })
    configureServerStateErrorReporter(reporter)

    await expect(
      queryClient.fetchQuery({
        queryKey: ['query-error-policy', 'cancelled'],
        queryFn: () => Promise.reject(error),
      }),
    ).rejects.toBe(error)

    expect(reporter).not.toHaveBeenCalled()
  })
})
