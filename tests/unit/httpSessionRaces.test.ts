import {
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureHttpSession, request, type HttpSessionRequestContext } from '@/shared/http/client'
import { transport } from '@/shared/http/transport'

const successEnvelope = {
  code: 200,
  data: null,
  details: null,
  error_key: null,
  message: '成功',
  request_id: '019c0000-0000-7000-8000-000000000101',
}

function response(
  config: InternalAxiosRequestConfig,
  status = 200,
  data: unknown = successEnvelope,
): AxiosResponse {
  return {
    config,
    data,
    headers: new AxiosHeaders(),
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
  }
}

function deferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function resetHttpSession(): void {
  configureHttpSession({
    getSnapshot: () => undefined,
    observeTenantContext: () => undefined,
    refreshAccessToken: async () => '',
    handleRefreshFailure: async () => undefined,
  })
}

afterEach(resetHttpSession)

describe('HTTP 会话竞态', () => {
  it('匿名捕获不会在异步拦截器中借用随后出现的会话', async () => {
    let snapshot: HttpSessionRequestContext | undefined
    configureHttpSession({
      getSnapshot: () => snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken: vi.fn(async () => 'unused'),
      handleRefreshFailure: vi.fn(async () => undefined),
    })
    const interceptorStarted = deferred()
    const releaseInterceptor = deferred()
    const delayingInterceptor = transport.interceptors.request.use(async (config) => {
      interceptorStarted.resolve(undefined)
      await releaseInterceptor.promise
      return config
    })
    let sent: InternalAxiosRequestConfig | undefined
    const adapter: AxiosAdapter = async (config) => {
      sent = config
      return response(config)
    }

    try {
      const pending = request({ adapter, url: '/captured-anonymous' })
      await interceptorStarted.promise
      snapshot = {
        accessToken: 'token-new',
        tenantId: 'tenant-new',
        sessionEpoch: 90,
        signal: new AbortController().signal,
      }
      releaseInterceptor.resolve(undefined)
      await expect(pending).resolves.toMatchObject({ code: 200 })
      expect(sent?.sessionContextCaptured).toBe(true)
      expect(sent?.sessionEpoch).toBeUndefined()
      expect(sent?.headers.get('Authorization')).toBeUndefined()
      expect(sent?.headers.get('X-Tenant-Id')).toBeUndefined()
    } finally {
      releaseInterceptor.resolve(undefined)
      transport.interceptors.request.eject(delayingInterceptor)
    }
  })

  it('匿名捕获拒绝显式旧纪元，已撤销快照也不会发出请求', async () => {
    const state: { snapshot?: HttpSessionRequestContext } = {}
    const adapter = vi.fn<AxiosAdapter>(async (config) => response(config))
    configureHttpSession({
      getSnapshot: () => state.snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken: vi.fn(async () => 'unused'),
      handleRefreshFailure: vi.fn(async () => undefined),
    })

    await expect(request({ adapter, sessionEpoch: 91, url: '/old-epoch' })).rejects.toMatchObject({
      kind: 'cancelled',
    })
    const controller = new AbortController()
    controller.abort()
    state.snapshot = {
      accessToken: 'revoked',
      tenantId: 'tenant-a',
      sessionEpoch: 92,
      signal: controller.signal,
    }
    await expect(request({ adapter, url: '/revoked-snapshot' })).rejects.toMatchObject({
      kind: 'cancelled',
    })
    expect(adapter).not.toHaveBeenCalled()
  })

  it('匿名捕获保留密码重置等预会话请求显式指定的租户', async () => {
    configureHttpSession({
      getSnapshot: () => undefined,
      observeTenantContext: vi.fn(),
      refreshAccessToken: vi.fn(async () => 'unused'),
      handleRefreshFailure: vi.fn(async () => undefined),
    })
    let sent: InternalAxiosRequestConfig | undefined
    const adapter: AxiosAdapter = async (config) => {
      sent = config
      return response(config)
    }

    await request({
      adapter,
      headers: { Authorization: 'Bearer stale', 'X-Tenant-Id': 'password-reset-tenant' },
      url: '/auth/password-reset/complete',
    })

    expect(sent?.headers.get('Authorization')).toBeUndefined()
    expect(sent?.headers.get('X-Tenant-Id')).toBe('password-reset-tenant')
    expect(sent?.sessionEpoch).toBeUndefined()
  })

  it('复用 AxiosHeaders 时按每次捕获强制写入当前主体且不污染调用方', async () => {
    let snapshot: HttpSessionRequestContext = {
      accessToken: 'token-a',
      tenantId: 'tenant-a',
      sessionEpoch: 100,
      signal: new AbortController().signal,
    }
    configureHttpSession({
      getSnapshot: () => snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken: vi.fn(async () => 'unused'),
      handleRefreshFailure: vi.fn(async () => undefined),
    })
    const sharedHeaders = new AxiosHeaders({
      Authorization: 'Bearer stale',
      'X-Tenant-Id': 'tenant-stale',
    })
    const sent: unknown[] = []
    const adapter: AxiosAdapter = async (config) => {
      sent.push([
        config.headers.get('Authorization'),
        config.headers.get('X-Tenant-Id'),
        config.sessionEpoch,
      ])
      return response(config)
    }

    await request({ adapter, headers: sharedHeaders, url: '/headers-a' })
    snapshot = {
      accessToken: 'token-b',
      tenantId: 'tenant-b',
      sessionEpoch: 101,
      signal: new AbortController().signal,
    }
    await request({ adapter, headers: sharedHeaders, url: '/headers-b' })

    expect(sent).toEqual([
      ['Bearer token-a', 'tenant-a', 100],
      ['Bearer token-b', 'tenant-b', 101],
    ])
    expect(sharedHeaders.get('Authorization')).toBe('Bearer stale')
    expect(sharedHeaders.get('X-Tenant-Id')).toBe('tenant-stale')
  })

  it('非 401 响应跨越同纪元正常 token 轮换时仍然有效', async () => {
    const controller = new AbortController()
    let snapshot: HttpSessionRequestContext = {
      accessToken: 'token-a',
      tenantId: 'tenant-a',
      sessionEpoch: 140,
      signal: controller.signal,
    }
    configureHttpSession({
      getSnapshot: () => snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken: vi.fn(async () => 'unused'),
      handleRefreshFailure: vi.fn(async () => undefined),
    })
    const started = deferred()
    const release = deferred()
    const adapter: AxiosAdapter = async (config) => {
      started.resolve(undefined)
      await release.promise
      return response(config)
    }

    const pending = request({ adapter, url: '/normal-token-rotation' })
    await started.promise
    snapshot = { ...snapshot, accessToken: 'token-b' }
    release.resolve(undefined)

    await expect(pending).resolves.toMatchObject({ code: 200 })
  })
})
