import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { configureHttpSession, type HttpSessionSnapshot } from '@/shared/http/client'
import { transport } from '@/shared/http/transport'

function response(
  config: InternalAxiosRequestConfig,
  status = 200,
  data: unknown = { ok: true },
): AxiosResponse {
  return {
    config,
    data,
    headers: new AxiosHeaders(),
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
  }
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined, response(config, 401))
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

afterEach(() => {
  configureHttpSession({
    getSnapshot: () => ({ accessToken: null, tenantId: '', sessionEpoch: -1 }),
    observeTenantContext: () => undefined,
    refreshAccessToken: async () => '',
    handleRefreshFailure: async () => undefined,
  })
})

describe('HTTP 会话范围守卫', () => {
  it('慢响应跨越会话纪元时即使适配器忽略 signal 也会被拒绝', async () => {
    const firstController = new AbortController()
    let snapshot: HttpSessionSnapshot = {
      accessToken: 'token-a',
      tenantId: 'tenant-a',
      sessionEpoch: 10,
      signal: firstController.signal,
    }
    const gate = deferred()
    const started = deferred()
    let captured: InternalAxiosRequestConfig | undefined
    configureHttpSession({
      getSnapshot: () => snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken: vi.fn(async () => 'unused'),
      handleRefreshFailure: vi.fn(async () => undefined),
    })
    const adapter: AxiosAdapter = async (config) => {
      captured = config
      started.resolve()
      await gate.promise
      return response(config)
    }

    const request = transport.get('/scope-test', { adapter })
    await started.promise
    expect(captured?.headers.get('Authorization')).toBe('Bearer token-a')
    expect(captured?.headers.get('X-Tenant-Id')).toBe('tenant-a')
    expect(captured?.sessionEpoch).toBe(10)

    firstController.abort()
    snapshot = {
      accessToken: 'token-b',
      tenantId: 'tenant-a',
      sessionEpoch: 11,
      signal: new AbortController().signal,
    }
    gate.resolve()
    await expect(request).rejects.toMatchObject({ kind: 'cancelled', status: 401 })
  })

  it('旧纪元的 401 不会触发新会话刷新或重试', async () => {
    const oldController = new AbortController()
    let snapshot: HttpSessionSnapshot = {
      accessToken: 'token-a',
      tenantId: 'tenant-a',
      sessionEpoch: 20,
      signal: oldController.signal,
    }
    const refreshAccessToken = vi.fn(async () => 'token-refreshed')
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      oldController.abort()
      snapshot = {
        accessToken: 'token-b',
        tenantId: 'tenant-a',
        sessionEpoch: 21,
        signal: new AbortController().signal,
      }
      throw unauthorized(config)
    })
    configureHttpSession({
      getSnapshot: () => snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken,
      handleRefreshFailure: vi.fn(async () => undefined),
    })

    await expect(transport.get('/scope-401', { adapter })).rejects.toMatchObject({
      kind: 'cancelled',
      status: 401,
    })
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledOnce()
  })

  it('只轮换 token 且纪元不变时允许刷新后重试', async () => {
    const controller = new AbortController()
    let snapshot: HttpSessionSnapshot = {
      accessToken: 'token-a',
      tenantId: 'tenant-a',
      sessionEpoch: 30,
      signal: controller.signal,
    }
    const refreshAccessToken = vi.fn(async () => {
      snapshot = { ...snapshot, accessToken: 'token-b' }
      return 'token-b'
    })
    const seenAuthorization: unknown[] = []
    let calls = 0
    const adapter: AxiosAdapter = async (config) => {
      calls += 1
      seenAuthorization.push(config.headers.get('Authorization'))
      if (calls === 1) throw unauthorized(config)
      return response(config)
    }
    configureHttpSession({
      getSnapshot: () => snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken,
      handleRefreshFailure: vi.fn(async () => undefined),
    })

    const result = await transport.get('/scope-refresh', { adapter })
    expect(result.status).toBe(200)
    expect(refreshAccessToken).toHaveBeenCalledOnce()
    expect(seenAuthorization).toEqual(['Bearer token-a', 'Bearer token-b'])
    expect(snapshot.sessionEpoch).toBe(30)
  })
})
