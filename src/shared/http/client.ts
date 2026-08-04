import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiResponse } from './types'
import { runtimeConfig } from '@/shared/config/runtimeConfig'
import { getApplicationLocale, translate } from '@/i18n'

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

export type HttpErrorKind =
  | 'http'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'invalid_response'
  | 'unknown'

export interface HttpErrorOptions {
  status?: number
  code?: number
  errorKey?: string
  details?: unknown
  requestId?: string
  kind?: HttpErrorKind
  cause?: unknown
  retryAfterSeconds?: number
}

export class HttpError extends Error {
  readonly status?: number
  readonly code?: number
  readonly errorKey?: string
  readonly details?: unknown
  readonly requestId?: string
  readonly kind: HttpErrorKind
  readonly cause?: unknown
  readonly retryAfterSeconds?: number

  constructor(message: string, options: HttpErrorOptions = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = options.status
    this.code = options.code
    this.errorKey = options.errorKey
    this.details = options.details
    this.requestId = options.requestId
    this.kind = options.kind ?? (options.status === undefined ? 'unknown' : 'http')
    this.cause = options.cause
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

export interface HttpSessionAdapter {
  getAccessToken(): string | null
  getTenantId(): string
  refreshAccessToken(): Promise<string>
  handleRefreshFailure(error: HttpError): Promise<void>
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

const errorKeyTranslation: Record<string, string> = {
  validation: 'shell.http.errors.validation',
  authentication: 'shell.http.errors.authentication',
  authorization: 'shell.http.errors.authorization',
  not_found: 'shell.http.errors.notFound',
  conflict: 'shell.http.errors.conflict',
  payload_too_large: 'shell.http.errors.payloadTooLarge',
  rate_limited: 'shell.http.errors.rateLimited',
  service_unavailable: 'shell.http.errors.serviceUnavailable',
  internal: 'shell.http.errors.internal',
}

function isApiEnvelope(value: unknown): value is ApiResponse {
  return typeof value === 'object'
    && value !== null
    && 'code' in value
    && typeof value.code === 'number'
    && 'message' in value
    && typeof value.message === 'string'
    && 'request_id' in value
    && typeof value.request_id === 'string'
}

function translatedErrorMessage(envelope: ApiResponse, fallback: string): string {
  const key = envelope.error_key ? errorKeyTranslation[envelope.error_key] : undefined
  return key ? translate(key) : envelope.message || fallback
}

function applyAcceptLanguage(config: InternalAxiosRequestConfig): void {
  if (!config.headers.get('Accept-Language')) {
    config.headers.set('Accept-Language', getApplicationLocale())
  }
}

transport.interceptors.request.use((config) => {
  applyAcceptLanguage(config)
  const token = sessionAdapter?.getAccessToken()
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  if (!config.skipTenantHeader && !config.headers['X-Tenant-Id']) {
    config.headers['X-Tenant-Id'] = sessionAdapter?.getTenantId()
  }
  removeJsonContentTypeForFormData(config)
  return config
})

rawTransport.interceptors.request.use((config) => {
  applyAcceptLanguage(config)
  removeJsonContentTypeForFormData(config)
  return config
})

interface ErrorPayload {
  message: string
  envelope?: ApiResponse
}

async function responseErrorPayload(data: unknown, fallback: string): Promise<ErrorPayload> {
  if (data instanceof Blob) {
    const text = await data.text()
    if (!text) return { message: fallback }
    try {
      return responseErrorPayload(JSON.parse(text), fallback)
    }
    catch {
      return { message: text }
    }
  }
  if (isApiEnvelope(data)) {
    return { message: translatedErrorMessage(data, fallback), envelope: data }
  }
  return { message: typeof data === 'string' && data ? data : fallback }
}

function axiosErrorKind(error: AxiosError, status: number | undefined): HttpErrorKind {
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') return 'cancelled'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'timeout'
  return status === undefined ? 'network' : 'http'
}

async function toHttpError(error: unknown): Promise<HttpError> {
  if (error instanceof HttpError) return error
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const payload = await responseErrorPayload(
      error.response?.data,
      error.message || translate('shell.http.requestFailed'),
    )
    return new HttpError(
      payload.message,
      {
        status,
        code: payload.envelope?.code,
        errorKey: payload.envelope?.error_key ?? undefined,
        details: payload.envelope?.details,
        requestId: payload.envelope?.request_id,
        kind: axiosErrorKind(error, status),
        cause: error,
        retryAfterSeconds: parseRetryAfter(error.response?.headers['retry-after']),
      },
    )
  }
  return new HttpError(
    error instanceof Error ? error.message : translate('shell.http.requestFailed'),
    { kind: 'unknown', cause: error },
  )
}

function parseRetryAfter(value: unknown): number | undefined {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}

async function refreshSession(): Promise<string> {
  if (!sessionAdapter) {
    throw new HttpError(translate('shell.http.sessionNotInitialized'), {
      status: 401,
      kind: 'http',
    })
  }
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
    return Promise.reject(httpError)
  },
)

function parseEnvelope<T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> {
  const envelope = response.data
  if (!isApiEnvelope(envelope)) {
    const error = new HttpError(translate('shell.http.invalidResponse'), {
      status: response.status,
      kind: 'invalid_response',
    })
    throw error
  }
  if (envelope.code !== 200) {
    const error = new HttpError(
      translatedErrorMessage(envelope, translate('shell.http.requestFailed')),
      {
        status: response.status,
        code: envelope.code,
        errorKey: envelope.error_key ?? undefined,
        details: envelope.details,
        requestId: envelope.request_id,
        kind: 'http',
      },
    )
    throw error
  }
  return envelope
}

export async function request<T = unknown>(
  config: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const response = await transport.request<ApiResponse<T>>(config)
  return parseEnvelope(response)
}

export function requireOperationData<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) {
    throw new HttpError(translate('shell.http.invalidResponse'), {
      code: response.code,
      requestId: response.request_id,
      kind: 'invalid_response',
    })
  }
  return response.data
}

export async function rawRequest<T>(
  config: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  try {
    const response = await rawTransport.request<ApiResponse<T>>(config)
    return parseEnvelope(response)
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
