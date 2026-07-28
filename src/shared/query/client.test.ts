import { describe, expect, it } from 'vitest'
import { HttpError } from '@/shared/http/client'
import { queryClient, tenantQueryKey } from './client'

describe('tenant server-state cache', () => {
  it('isolates the same resource between tenants', () => {
    expect(tenantQueryKey('tenant-a', 'posts', { page: 1 }))
      .not.toEqual(tenantQueryKey('tenant-b', 'posts', { page: 1 }))
  })

  it('does not retry client failures and keeps retry count bounded for server failures', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry
    expect(typeof retry).toBe('function')
    if (typeof retry !== 'function') throw new Error('retry policy must be a function')
    expect(retry(0, new HttpError('bad request', 400))).toBe(false)
    expect(retry(0, new HttpError('unavailable', 503))).toBe(true)
    expect(retry(1, new HttpError('unavailable', 503))).toBe(false)
  })
})
