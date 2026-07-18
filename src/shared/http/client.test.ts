import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios'
import { describe, expect, it, vi } from 'vitest'
import {
  configureHttpSession,
  HttpError,
  rawRequest,
  request,
  requestBlob,
  requestText,
  type HttpSessionAdapter,
} from './client'

function adapter(overrides?: Partial<HttpSessionAdapter>): HttpSessionAdapter {
  return {
    getAccessToken: () => 'memory-access-token',
    getTenantId: () => 'tenant-a',
    refreshAccessToken: vi.fn(async () => 'refreshed-token'),
    handleRefreshFailure: vi.fn(async () => undefined),
    reportError: vi.fn(),
    ...overrides,
  }
}

function okAdapter(capture: (config: InternalAxiosRequestConfig) => void): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    capture(config)
    return {
      data: { code: 200, msg: 'ok', data: { accepted: true } },
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    }
  }
}

describe('HTTP client session boundary', () => {
  it('sends credentials and in-memory bearer/tenant headers on authenticated requests', async () => {
    configureHttpSession(adapter())
    let captured: InternalAxiosRequestConfig | undefined

    const response = await request<{ accepted: boolean }>({
      url: '/protected',
      method: 'get',
      adapter: okAdapter(config => { captured = config }),
    })

    expect(response.data).toEqual({ accepted: true })
    expect(captured?.withCredentials).toBe(true)
    expect(captured?.headers?.Authorization).toBe('Bearer memory-access-token')
    expect(captured?.headers?.['X-Tenant-Id']).toBe('tenant-a')
  })

  it('keeps raw cookie requests credentialed without attaching bearer or tenant headers', async () => {
    configureHttpSession(adapter())
    let captured: InternalAxiosRequestConfig | undefined

    await rawRequest({
      url: '/auth/refresh',
      method: 'post',
      skipAuthRefresh: true,
      skipTenantHeader: true,
      adapter: okAdapter(config => { captured = config }),
    })

    expect(captured?.withCredentials).toBe(true)
    expect(captured?.headers?.Authorization).toBeUndefined()
    expect(captured?.headers?.['X-Tenant-Id']).toBeUndefined()
  })

  it('preserves explicit auth and tenant headers and supports unauthenticated requests', async () => {
    configureHttpSession(adapter({
      getAccessToken: () => null,
      getTenantId: () => 'tenant-default',
    }))
    const captured: InternalAxiosRequestConfig[] = []

    await request({
      url: '/explicit',
      headers: {
        Authorization: 'Bearer explicit',
        'X-Tenant-Id': 'tenant-explicit',
      },
      adapter: okAdapter(config => captured.push(config)),
    })
    await request({
      url: '/public',
      skipTenantHeader: true,
      adapter: okAdapter(config => captured.push(config)),
    })

    expect(captured[0]?.headers.Authorization).toBe('Bearer explicit')
    expect(captured[0]?.headers['X-Tenant-Id']).toBe('tenant-explicit')
    expect(captured[1]?.headers.Authorization).toBeUndefined()
    expect(captured[1]?.headers['X-Tenant-Id']).toBeUndefined()
  })

  it('normalizes raw refresh conflicts and preserves Retry-After', async () => {
    const config: InternalAxiosRequestConfig = {
      url: '/auth/refresh',
      method: 'post',
      headers: new AxiosHeaders(),
    }
    const response = {
      data: { code: 409, msg: 'refresh already in progress' },
      status: 409,
      statusText: 'Conflict',
      headers: new AxiosHeaders({ 'retry-after': '2' }),
      config,
    }
    const error = new AxiosError('conflict', 'ERR_BAD_RESPONSE', config, undefined, response)

    await expect(rawRequest({
      ...config,
      adapter: async () => Promise.reject(error),
    })).rejects.toMatchObject({ status: 409, retryAfterSeconds: 2 } satisfies Partial<HttpError>)
    expect(axios.isAxiosError(error)).toBe(true)
  })

  it('single-flights a 401 refresh and retries with the new in-memory token', async () => {
    const refreshAccessToken = vi.fn(async () => 'new-token')
    configureHttpSession(adapter({ refreshAccessToken }))
    let calls = 0

    const result = await request<{ accepted: boolean }>({
      url: '/protected',
      method: 'get',
      adapter: async (config) => {
        calls += 1
        if (calls === 1) {
          throw new AxiosError(
            'unauthorized',
            'ERR_BAD_RESPONSE',
            config,
            undefined,
            {
              data: { code: 401, msg: 'expired' },
              status: 401,
              statusText: 'Unauthorized',
              headers: new AxiosHeaders(),
              config,
            },
          )
        }
        expect(config.headers.Authorization).toBe('Bearer new-token')
        return {
          data: { code: 200, msg: 'ok', data: { accepted: true } },
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
        }
      },
    })

    expect(result.data?.accepted).toBe(true)
    expect(refreshAccessToken).toHaveBeenCalledOnce()
    expect(calls).toBe(2)
  })

  it('single-flights two concurrent 401 responses through one refresh operation', async () => {
    let resolveRefresh!: (token: string) => void
    const refreshAccessToken = vi.fn(() => new Promise<string>((resolve) => {
      resolveRefresh = resolve
    }))
    configureHttpSession(adapter({ refreshAccessToken }))

    const makeRequest = (url: string) => {
      let calls = 0
      return request<{ accepted: boolean }>({
        url,
        adapter: async (config) => {
          calls += 1
          if (calls === 1) {
            throw new AxiosError('unauthorized', 'ERR_BAD_RESPONSE', config, undefined, {
              data: { code: 401, msg: 'expired' },
              status: 401,
              statusText: 'Unauthorized',
              headers: new AxiosHeaders(),
              config,
            })
          }
          return {
            data: { code: 200, msg: 'ok', data: { accepted: true } },
            status: 200,
            statusText: 'OK',
            headers: new AxiosHeaders(),
            config,
          }
        },
      })
    }

    const first = makeRequest('/first')
    const second = makeRequest('/second')
    await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalledOnce())
    resolveRefresh('shared-token')

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(refreshAccessToken).toHaveBeenCalledOnce()
  })

  it('normalizes refresh failures and invokes the session failure handler once', async () => {
    const handleRefreshFailure = vi.fn(async () => undefined)
    configureHttpSession(adapter({
      refreshAccessToken: vi.fn(async () => {
        throw new Error('refresh transport failed')
      }),
      handleRefreshFailure,
    }))

    const config: InternalAxiosRequestConfig = {
      url: '/protected',
      method: 'get',
      headers: new AxiosHeaders(),
    }
    const unauthorized = new AxiosError('unauthorized', 'ERR_BAD_RESPONSE', config, undefined, {
      data: { code: 401, msg: 'expired' },
      status: 401,
      statusText: 'Unauthorized',
      headers: new AxiosHeaders(),
      config,
    })

    await expect(request({ ...config, adapter: async () => Promise.reject(unauthorized) }))
      .rejects.toMatchObject({ message: 'refresh transport failed' })
    expect(handleRefreshFailure).toHaveBeenCalledOnce()
  })

  it('does not refresh opt-out, already retried, or non-401 failures', async () => {
    const refreshAccessToken = vi.fn(async () => 'unused')
    const handleRefreshFailure = vi.fn(async () => undefined)
    const reportError = vi.fn()
    configureHttpSession(adapter({ refreshAccessToken, handleRefreshFailure, reportError }))

    for (const input of [
      { status: 401, skipAuthRefresh: true },
      { status: 401, retryAfterRefresh: true },
      { status: 403 },
    ]) {
      const config: InternalAxiosRequestConfig = {
        url: '/protected',
        method: 'get',
        headers: new AxiosHeaders(),
        skipAuthRefresh: input.skipAuthRefresh,
        retryAfterRefresh: input.retryAfterRefresh,
      }
      const error = new AxiosError('rejected', 'ERR_BAD_RESPONSE', config, undefined, {
        data: { code: input.status, msg: 'rejected' },
        status: input.status,
        statusText: 'Rejected',
        headers: new AxiosHeaders(),
        config,
      })
      await expect(request({ ...config, adapter: async () => Promise.reject(error) }))
        .rejects.toMatchObject({ status: input.status })
    }

    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(handleRefreshFailure).toHaveBeenCalledOnce()
    expect(reportError).toHaveBeenCalledTimes(2)
  })

  it('terminates the session when a request is still 401 after one successful refresh', async () => {
    const refreshAccessToken = vi.fn(async () => 'new-token')
    const handleRefreshFailure = vi.fn(async () => undefined)
    const reportError = vi.fn()
    configureHttpSession(adapter({ refreshAccessToken, handleRefreshFailure, reportError }))
    let calls = 0

    await expect(request({
      url: '/force-logged-out',
      adapter: async (config) => {
        calls += 1
        throw new AxiosError('unauthorized', 'ERR_BAD_RESPONSE', config, undefined, {
          data: { code: 401, msg: calls === 1 ? 'expired' : 'session revoked' },
          status: 401,
          statusText: 'Unauthorized',
          headers: new AxiosHeaders(),
          config,
        })
      },
    })).rejects.toMatchObject({ status: 401, message: 'session revoked' })

    expect(calls).toBe(2)
    expect(refreshAccessToken).toHaveBeenCalledOnce()
    expect(handleRefreshFailure).toHaveBeenCalledOnce()
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports login 401 without terminating an existing session', async () => {
    const refreshAccessToken = vi.fn(async () => 'unused')
    const handleRefreshFailure = vi.fn(async () => undefined)
    const reportError = vi.fn()
    configureHttpSession(adapter({ refreshAccessToken, handleRefreshFailure, reportError }))
    const config: InternalAxiosRequestConfig = {
      url: '/auth/login',
      method: 'post',
      headers: new AxiosHeaders(),
      skipAuthRefresh: true,
    }
    const unauthorized = new AxiosError('unauthorized', 'ERR_BAD_RESPONSE', config, undefined, {
      data: { code: 401, msg: 'invalid credentials' },
      status: 401,
      statusText: 'Unauthorized',
      headers: new AxiosHeaders(),
      config,
    })

    await expect(request({ ...config, adapter: async () => Promise.reject(unauthorized) }))
      .rejects.toMatchObject({ status: 401, message: 'invalid credentials' })
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(handleRefreshFailure).not.toHaveBeenCalled()
    expect(reportError).toHaveBeenCalledOnce()
  })

  it('removes JSON content type for multipart requests', async () => {
    configureHttpSession(adapter())
    let captured: InternalAxiosRequestConfig | undefined
    await request({
      url: '/upload',
      method: 'post',
      data: new FormData(),
      headers: { 'Content-Type': 'application/json' },
      adapter: okAdapter(config => { captured = config }),
    })
    expect(captured?.headers.get('Content-Type')).not.toBe('application/json')
  })

  it('leaves content type unchanged for non-multipart payloads', async () => {
    configureHttpSession(adapter())
    let captured: InternalAxiosRequestConfig | undefined
    await request({
      url: '/json',
      method: 'post',
      data: { value: 1 },
      adapter: okAdapter(config => { captured = config }),
    })
    expect(captured?.headers.get('Content-Type')).toBe('application/json')
  })

  it('reports malformed and unsuccessful API envelopes', async () => {
    const reportError = vi.fn()
    configureHttpSession(adapter({ reportError }))
    const response = (data: unknown): AxiosAdapter => async config => ({
      data,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    })

    await expect(request({ url: '/invalid', adapter: response({ hello: 'world' }) }))
      .rejects.toBeInstanceOf(HttpError)
    await expect(request({ url: '/failed', adapter: response({ code: 500, msg: 'failed' }) }))
      .rejects.toMatchObject({ code: 500 })
    expect(reportError).toHaveBeenCalledTimes(2)
  })

  it('does not report raw envelope failures through the global UI reporter', async () => {
    const reportError = vi.fn()
    configureHttpSession(adapter({ reportError }))
    const response = (data: unknown): AxiosAdapter => async config => ({
      data,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    })

    await expect(rawRequest({ url: '/invalid', adapter: response(null) }))
      .rejects.toBeInstanceOf(HttpError)
    await expect(rawRequest({ url: '/failed', adapter: response({ code: 400, msg: '' }) }))
      .rejects.toMatchObject({ code: 400 })
    expect(reportError).not.toHaveBeenCalled()
  })

  it('extracts errors from JSON, text, and empty Blob responses', async () => {
    configureHttpSession(adapter())
    const rejectWith = async (data: unknown, retryAfter?: string) => {
      const config: InternalAxiosRequestConfig = {
        url: '/blob-error',
        headers: new AxiosHeaders(),
      }
      const error = new AxiosError('fallback', 'ERR_BAD_RESPONSE', config, undefined, {
        data,
        status: 400,
        statusText: 'Bad Request',
        headers: new AxiosHeaders(retryAfter ? { 'retry-after': retryAfter } : undefined),
        config,
      })
      return rawRequest({ ...config, adapter: async () => Promise.reject(error) })
    }

    await expect(rejectWith(new Blob([JSON.stringify({ msg: 'json blob' })])))
      .rejects.toMatchObject({ message: 'json blob' })
    await expect(rejectWith(new Blob(['plain text'])))
      .rejects.toMatchObject({ message: 'plain text' })
    await expect(rejectWith(new Blob([])))
      .rejects.toMatchObject({ message: 'fallback' })
    await expect(rejectWith({ other: true }, 'invalid'))
      .rejects.toMatchObject({ message: 'fallback', retryAfterSeconds: undefined })
  })

  it('normalizes non-Axios thrown values', async () => {
    configureHttpSession(adapter())
    await expect(rawRequest({
      url: '/error',
      adapter: async () => Promise.reject(new Error('plain error')),
    })).rejects.toMatchObject({ message: 'plain error' })
    await expect(rawRequest({
      url: '/primitive',
      adapter: async () => Promise.reject('broken'),
    })).rejects.toMatchObject({ message: expect.any(String) })
    const existing = new HttpError('existing', 418)
    await expect(rawRequest({
      url: '/http-error',
      adapter: async () => Promise.reject(existing),
    })).rejects.toBe(existing)
  })

  it('returns raw blob and text payloads for download helpers', async () => {
    configureHttpSession(adapter())
    const blob = new Blob(['file'])
    const payload = (data: unknown): AxiosAdapter => async config => ({
      data,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    })

    await expect(requestBlob({ url: '/file', adapter: payload(blob) })).resolves.toBe(blob)
    await expect(requestText({ url: '/text', adapter: payload('hello') })).resolves.toBe('hello')
  })
})
