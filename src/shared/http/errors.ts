import axios, { type AxiosError, type AxiosResponse } from 'axios'
import type { ApiResponse } from './types'
import { translate } from '@/i18n'

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
  request_id?: string
  kind?: HttpErrorKind
  cause?: unknown
  retryAfterSeconds?: number
  realtimeStatus?: string
}

export class HttpError extends Error {
  readonly status?: number
  readonly code?: number
  readonly errorKey?: string
  readonly details?: unknown
  readonly request_id?: string
  readonly kind: HttpErrorKind
  readonly cause?: unknown
  readonly retryAfterSeconds?: number
  /** 由受控实时服务响应通过 X-RyFrame-Realtime 明确声明的状态。 */
  readonly realtimeStatus?: string

  constructor(message: string, options: HttpErrorOptions = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = options.status
    this.code = options.code
    this.errorKey = options.errorKey
    this.details = options.details
    this.request_id = options.request_id
    this.kind = options.kind ?? (options.status === undefined ? 'unknown' : 'http')
    this.cause = options.cause
    this.retryAfterSeconds = options.retryAfterSeconds
    this.realtimeStatus = options.realtimeStatus
  }
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
  capability_unavailable: 'shell.http.errors.capabilityUnavailable',
  tenant_capability_denied: 'shell.http.errors.tenantCapabilityDenied',
  permission_denied: 'shell.http.errors.permissionDenied',
  stale_runtime_epoch: 'shell.http.errors.staleRuntimeEpoch',
  stale_placement_generation: 'shell.http.errors.stalePlacementGeneration',
  tenant_operation_conflict: 'shell.http.errors.tenantOperationConflict',
  tenant_data_maintenance: 'shell.http.errors.tenantDataMaintenance',
  tenant_data_target_unavailable: 'shell.http.errors.tenantDataTargetUnavailable',
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

export async function toHttpError(error: unknown): Promise<HttpError> {
  if (error instanceof HttpError) return error
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const payload = await responseErrorPayload(
      error.response?.data,
      error.message || translate('shell.http.requestFailed'),
    )
    const retryAfterSeconds = parseRetryAfter(error.response?.headers['retry-after'])
    return new HttpError(
      withRetryAfter(payload.message, status, retryAfterSeconds),
      {
        status,
        code: payload.envelope?.code,
        errorKey: payload.envelope?.error_key ?? undefined,
        details: payload.envelope?.details,
        request_id: payload.envelope?.request_id,
        kind: axiosErrorKind(error, status),
        cause: error,
        retryAfterSeconds,
        realtimeStatus: responseHeader(error.response?.headers, 'x-ryframe-realtime'),
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
  if (Number.isFinite(seconds) && seconds >= 0) return seconds
  if (typeof value !== 'string') return undefined
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp)
    ? undefined
    : Math.max(0, Math.ceil((timestamp - Date.now()) / 1_000))
}

function withRetryAfter(
  message: string,
  status: number | undefined,
  retryAfterSeconds: number | undefined,
): string {
  if ((status !== 423 && status !== 503) || retryAfterSeconds === undefined) return message
  return `${message} ${translate('shell.http.retryAfter', { seconds: retryAfterSeconds })}`
}

function responseHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined
  const value = (headers as Record<string, unknown>)[name]
  if (Array.isArray(value)) return value.join(',')
  return value === undefined ? undefined : String(value)
}

export function parseEnvelope<T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> {
  const envelope = response.data
  if (!isApiEnvelope(envelope)) {
    const error = new HttpError(translate('shell.http.invalidResponse'), {
      status: response.status,
      kind: 'invalid_response',
    })
    throw error
  }
  const isSuccessfulStatus = response.status >= 200
    && response.status < 300
    && envelope.code === response.status
  if (!isSuccessfulStatus) {
    const error = new HttpError(
      translatedErrorMessage(envelope, translate('shell.http.requestFailed')),
      {
        status: response.status,
        code: envelope.code,
        errorKey: envelope.error_key ?? undefined,
        details: envelope.details,
        request_id: envelope.request_id,
        kind: 'http',
      },
    )
    throw error
  }
  return envelope
}
