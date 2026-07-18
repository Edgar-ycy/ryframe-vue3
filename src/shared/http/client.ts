import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiResponse } from './types'
import { runtimeConfig } from '@/shared/config/runtimeConfig'

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean
    skipTenantHeader?: boolean
  }

  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean
    skipTenantHeader?: boolean
    retryAfterRefresh?: boolean
  }
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: number,
    public readonly cause?: unknown,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export interface HttpSessionAdapter {
  getAccessToken(): string | null
  getTenantId(): string
  refreshAccessToken(): Promise<string>
  handleRefreshFailure(error: HttpError): Promise<void>
  reportError(error: HttpError): void
}

let sessionAdapter: HttpSessionAdapter | undefined
let refreshPromise: Promise<string> | undefined

export function configureHttpSession(adapter: HttpSessionAdapter): void {
  sessionAdapter = adapter
}

function createTransport() {
  return axios.create({
    baseURL: runtimeConfig.apiBaseUrl,
    timeout: 30000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  })
}

const transport = createTransport()
const rawTransport = createTransport()

function removeJsonContentTypeForFormData(config: InternalAxiosRequestConfig): void {
  if (!(config.data instanceof FormData)) return
  config.headers.delete('Content-Type')
  config.headers.delete('content-type')
}

transport.interceptors.request.use((config) => {
  const token = sessionAdapter?.getAccessToken()
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  if (!config.skipTenantHeader && !config.headers['X-Tenant-Id']) {
    config.headers['X-Tenant-Id'] = sessionAdapter?.getTenantId()
  }
  removeJsonContentTypeForFormData(config)
  return config
})

async function responseMessage(data: unknown, fallback: string): Promise<string> {
  if (data instanceof Blob) {
    const text = await data.text()
    if (!text) return fallback
    try {
      return responseMessage(JSON.parse(text), fallback)
    }
    catch {
      return text
    }
  }
  if (
    typeof data === 'object'
    && data !== null
    && 'msg' in data
    && typeof data.msg === 'string'
  ) {
    return data.msg
  }
  return fallback
}

async function toHttpError(error: unknown): Promise<HttpError> {
  if (error instanceof HttpError) return error
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    return new HttpError(
      await responseMessage(error.response?.data, error.message || '请求失败'),
      status,
      undefined,
      error,
      parseRetryAfter(error.response?.headers['retry-after']),
    )
  }
  return new HttpError(error instanceof Error ? error.message : '请求失败', undefined, undefined, error)
}

function parseRetryAfter(value: unknown): number | undefined {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}

async function refreshSession(): Promise<string> {
  if (!sessionAdapter) throw new HttpError('HTTP 会话尚未初始化', 401)
  if (!refreshPromise) {
    refreshPromise = sessionAdapter
      .refreshAccessToken()
      .catch(async (error) => {
        const httpError = await toHttpError(error)
        await sessionAdapter?.handleRefreshFailure(httpError)
        throw httpError
      })
      .finally(() => {
        refreshPromise = undefined
      })
  }
  return refreshPromise
}

transport.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config
    const status = error.response?.status

    if (
      status === 401
      && config
      && !config.skipAuthRefresh
      && !config.retryAfterRefresh
      && sessionAdapter
      && sessionAdapter.getAccessToken()
    ) {
      config.retryAfterRefresh = true
      const token = await refreshSession()
      config.headers.Authorization = `Bearer ${token}`
      config.headers['X-Tenant-Id'] = sessionAdapter.getTenantId()
      return transport(config)
    }

    const httpError = await toHttpError(error)
    if (status === 401 && config?.retryAfterRefresh && sessionAdapter) {
      await sessionAdapter.handleRefreshFailure(httpError)
      return Promise.reject(httpError)
    }
    if (status === 401 && !config?.skipAuthRefresh && !sessionAdapter?.getAccessToken()) {
      return Promise.reject(httpError)
    }
    sessionAdapter?.reportError(httpError)
    return Promise.reject(httpError)
  },
)

function parseEnvelope<T>(response: AxiosResponse<ApiResponse<T>>, report: boolean): ApiResponse<T> {
  const envelope = response.data
  if (!envelope || typeof envelope.code !== 'number' || typeof envelope.msg !== 'string') {
    const error = new HttpError('服务端返回了无效的响应格式', response.status)
    if (report) sessionAdapter?.reportError(error)
    throw error
  }
  if (envelope.code !== 200) {
    const error = new HttpError(envelope.msg || '请求失败', response.status, envelope.code)
    if (report) sessionAdapter?.reportError(error)
    throw error
  }
  return envelope
}

export async function request<T = unknown>(
  config: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const response = await transport.request<ApiResponse<T>>(config)
  return parseEnvelope(response, true)
}

export async function rawRequest<T>(
  config: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  try {
    const response = await rawTransport.request<ApiResponse<T>>(config)
    return parseEnvelope(response, false)
  }
  catch (error) {
    throw await toHttpError(error)
  }
}

export async function requestBlob(config: AxiosRequestConfig): Promise<Blob> {
  const response = await transport.request<Blob>({ ...config, responseType: 'blob' })
  return response.data
}

export async function requestText(config: AxiosRequestConfig): Promise<string> {
  const response = await transport.request<string>({ ...config, responseType: 'text' })
  return response.data
}

export default request
export type { ApiResponse } from './types'
