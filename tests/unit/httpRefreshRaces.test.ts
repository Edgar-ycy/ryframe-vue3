import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  configureHttpSession,
  HttpError,
  request,
  type HttpSessionRequestContext,
} from '@/shared/http/client'
import { refreshSession } from '@/shared/http/session'

const successEnvelope = {
  code: 200,
  data: null,
  details: null,
  error_key: null,
  message: '成功',
  request_id: '019c0000-0000-7000-8000-000000000102',
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

function unauthorized(config: InternalAxiosRequestConfig, data?: unknown): AxiosError {
  return new AxiosError(
    'unauthorized',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    response(config, 401, data),
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

afterEach(() => {
  configureHttpSession({
    getSnapshot: () => undefined,
    observeTenantContext: () => undefined,
    refreshAccessToken: async () => '',
    handleRefreshFailure: async () => undefined,
  })
})

interface DelayedRetryFailure {
  handleRefreshFailure: ReturnType<typeof vi.fn>
  pending: Promise<unknown>
  release(): void
  replaceSnapshot(accessToken: string, sessionEpoch: number, signal?: AbortSignal): void
}

async function startDelayedRetryFailure(sessionEpoch: number): Promise<DelayedRetryFailure> {
  const controller = new AbortController()
  let snapshot: HttpSessionRequestContext = {
    accessToken: 'token-a',
    tenantId: 'tenant-a',
    sessionEpoch,
    signal: controller.signal,
  }
  let parsingStartedResolve!: () => void
  const parsingStarted = new Promise<void>((resolve) => {
    parsingStartedResolve = resolve
  })
  const payload = deferred<string>()
  const blob = new Blob([])
  vi.spyOn(blob, 'text').mockImplementation(() => {
    parsingStartedResolve()
    return payload.promise
  })
  const handleRefreshFailure = vi.fn(async () => undefined)
  let calls = 0
  const adapter: AxiosAdapter = async (config) => {
    calls += 1
    if (calls === 1) throw unauthorized(config)
    throw unauthorized(config, blob)
  }
  configureHttpSession({
    getSnapshot: () => snapshot,
    observeTenantContext: vi.fn(),
    refreshAccessToken: vi.fn(async () => {
      snapshot = { ...snapshot, accessToken: 'token-b' }
      return 'token-b'
    }),
    handleRefreshFailure,
  })

  const pending = request({ adapter, url: '/delayed-retry-failure' })
  await parsingStarted
  return {
    handleRefreshFailure,
    pending,
    release: () =>
      payload.resolve(
        JSON.stringify({ code: 401, message: '认证失效', request_id: 'retry-failure' }),
      ),
    replaceSnapshot: (accessToken, nextEpoch, signal = snapshot.signal) => {
      snapshot = { ...snapshot, accessToken, sessionEpoch: nextEpoch, signal }
    },
  }
}

describe('HTTP 刷新竞态', () => {
  it('刷新返回值已陈旧时使用重新读取快照中的最新 token 重试', async () => {
    let snapshot: HttpSessionRequestContext = {
      accessToken: 'token-a',
      tenantId: 'tenant-a',
      sessionEpoch: 110,
      signal: new AbortController().signal,
    }
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
      refreshAccessToken: vi.fn(async () => {
        snapshot = { ...snapshot, accessToken: 'token-newest' }
        return 'token-stale-result'
      }),
      handleRefreshFailure: vi.fn(async () => undefined),
    })

    await expect(request({ adapter, url: '/latest-refresh-token' })).resolves.toMatchObject({
      code: 200,
    })
    expect(seenAuthorization).toEqual(['Bearer token-a', 'Bearer token-newest'])
  })

  it('401 重试解析错误期间切换纪元时不会清理新会话', async () => {
    const race = await startDelayedRetryFailure(120)
    race.replaceSnapshot('token-new-session', 121, new AbortController().signal)
    race.release()

    await expect(race.pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(race.handleRefreshFailure).not.toHaveBeenCalled()
  })

  it('401 重试解析错误期间同纪元 token 再轮换时不会误登出', async () => {
    const race = await startDelayedRetryFailure(130)
    race.replaceSnapshot('token-newest', 130)
    race.release()

    await expect(race.pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(race.handleRefreshFailure).not.toHaveBeenCalled()
  })

  it('refreshSession 解析旧失败期间外部同纪元 token 更新时取消且不登出', async () => {
    let snapshot: HttpSessionRequestContext = {
      accessToken: 'token-a',
      tenantId: 'tenant-a',
      sessionEpoch: 150,
      signal: new AbortController().signal,
    }
    const parsingStarted = deferred<void>()
    const payload = deferred<string>()
    const blob = new Blob([])
    vi.spyOn(blob, 'text').mockImplementation(() => {
      parsingStarted.resolve(undefined)
      return payload.promise
    })
    const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() }
    const handleRefreshFailure = vi.fn(async (_error: HttpError) => undefined)
    configureHttpSession({
      getSnapshot: () => snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken: vi.fn(async () => {
        throw unauthorized(config, blob)
      }),
      handleRefreshFailure,
    })

    const pending = refreshSession(150)
    await parsingStarted.promise
    snapshot = { ...snapshot, accessToken: 'token-from-another-tab' }
    payload.resolve(
      JSON.stringify({ code: 401, message: '刷新失败', request_id: 'refresh-failure' }),
    )

    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(handleRefreshFailure).not.toHaveBeenCalled()
  })

  it('本地刷新应用新 token 后的同步失败仍由当前会话处理', async () => {
    let snapshot: HttpSessionRequestContext = {
      accessToken: 'token-a',
      tenantId: 'tenant-a',
      sessionEpoch: 160,
      signal: new AbortController().signal,
    }
    const handleRefreshFailure = vi.fn(async (_error: HttpError) => undefined)
    configureHttpSession({
      getSnapshot: () => snapshot,
      observeTenantContext: vi.fn(),
      refreshAccessToken: vi.fn(async (onAccessTokenApplied) => {
        snapshot = { ...snapshot, accessToken: 'token-b' }
        onAccessTokenApplied('token-b')
        throw new HttpError('本地刷新后的路由同步失败', { status: 503, kind: 'http' })
      }),
      handleRefreshFailure,
    })

    await expect(refreshSession(160)).rejects.toMatchObject({ kind: 'http', status: 503 })
    expect(handleRefreshFailure).toHaveBeenCalledOnce()
    expect(handleRefreshFailure.mock.calls[0][0]).toMatchObject({ status: 503 })
  })
})
