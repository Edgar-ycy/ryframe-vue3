import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type GenericAbortSignal,
  type InternalAxiosRequestConfig,
  type RawAxiosHeaders,
} from 'axios'
import { runtimeConfig } from '@/shared/config/runtimeConfig'
import { HttpError, toHttpError } from './errors'
import { getHttpLocale } from './localization'
import { getHttpSession, refreshSession } from './session'

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean
    skipTenantHeader?: boolean
    sessionEpoch?: number
  }

  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean
    skipTenantHeader?: boolean
    retryAfterRefresh?: boolean
    sessionContextCaptured?: boolean
    sessionEpoch?: number
  }
}

function createTransport() {
  return axios.create({
    baseURL: runtimeConfig.apiBaseUrl,
    timeout: 30000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const transport = createTransport()
export const rawTransport = createTransport()

type CapturedSessionRequestConfig = AxiosRequestConfig & { sessionContextCaptured: true }

const TENANT_CONTEXT_HEADERS = Object.freeze({
  authorizationEpoch: 'X-Authorization-Epoch',
  runtimeEpoch: 'X-Tenant-Runtime-Epoch',
  placementGeneration: 'X-Tenant-Data-Generation',
  businessDataState: 'X-Tenant-Data-State',
})

function observeResponseTenantContext(response: AxiosResponse | undefined): void {
  const session = getHttpSession()
  if (!session) return
  const snapshot = session.getSnapshot()
  if (
    !snapshot ||
    response?.config.sessionEpoch !== snapshot.sessionEpoch ||
    snapshot.signal.aborted
  )
    return
  const accessToken = snapshot.accessToken
  const requestAuthorization = response?.config.headers.get('Authorization')
  if (!accessToken || requestAuthorization !== `Bearer ${accessToken}`) return
  const authorizationEpoch = decimalHeader(response, TENANT_CONTEXT_HEADERS.authorizationEpoch)
  const runtimeEpoch = decimalHeader(response, TENANT_CONTEXT_HEADERS.runtimeEpoch)
  const placementGeneration = decimalHeader(response, TENANT_CONTEXT_HEADERS.placementGeneration)
  const businessDataState = stringHeader(response, TENANT_CONTEXT_HEADERS.businessDataState)
  const observation = {
    ...(authorizationEpoch === undefined ? {} : { authorizationEpoch }),
    ...(runtimeEpoch === undefined ? {} : { runtimeEpoch }),
    ...(placementGeneration === undefined ? {} : { placementGeneration }),
    ...(businessDataState === undefined ? {} : { businessDataState }),
  }
  if (Object.keys(observation).length > 0) session.observeTenantContext(observation)
}

function stringHeader(response: AxiosResponse | undefined, name: string): string | undefined {
  const raw = response?.headers[name.toLowerCase()]
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined
}

function decimalHeader(response: AxiosResponse | undefined, name: string): string | undefined {
  const raw = response?.headers[name.toLowerCase()]
  if (typeof raw === 'string' && /^(?:0|[1-9]\d*)$/u.test(raw)) return raw
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0 ? String(raw) : undefined
}

function removeJsonContentTypeForFormData(config: InternalAxiosRequestConfig): void {
  if (!(config.data instanceof FormData)) return
  config.headers.delete('Content-Type')
  config.headers.delete('content-type')
}

function applyAcceptLanguage(config: InternalAxiosRequestConfig): void {
  if (!config.headers.get('Accept-Language')) {
    config.headers.set('Accept-Language', getHttpLocale())
  }
}

/**
 * 在 Axios 异步请求拦截器运行前固定原子会话快照。这样旧 Mutation 即使恰好在
 * 调用请求后切换会话，也只会携带旧纪元和旧取消信号，不能借用新身份发出请求。
 * 匿名请求同样标记为已捕获，并克隆调用方 headers，防止后续会话或复用配置污染它。
 */
export function captureHttpSessionRequest(config: AxiosRequestConfig): AxiosRequestConfig {
  const snapshot = getHttpSession()?.getSnapshot()
  const headers = new AxiosHeaders(config.headers as RawAxiosHeaders | AxiosHeaders | undefined)
  if (!snapshot) {
    if (config.sessionEpoch !== undefined) throw cancelledSessionError()
    headers.delete('Authorization')
    const captured: CapturedSessionRequestConfig = {
      ...config,
      headers,
      sessionContextCaptured: true,
    }
    return captured
  }
  if (
    snapshot.signal.aborted ||
    (config.sessionEpoch !== undefined && config.sessionEpoch !== snapshot.sessionEpoch)
  ) {
    throw cancelledSessionError()
  }

  headers.set('Authorization', `Bearer ${snapshot.accessToken}`)
  if (!config.skipTenantHeader) headers.set('X-Tenant-Id', snapshot.tenantId)
  const captured: CapturedSessionRequestConfig = {
    ...config,
    headers,
    sessionContextCaptured: true,
    sessionEpoch: snapshot.sessionEpoch,
    signal: combineAbortSignals(config.signal, snapshot.signal),
  }
  return captured
}

transport.interceptors.request.use((config) => {
  applyAcceptLanguage(config)
  const sessionAdapter = getHttpSession()
  const snapshot = sessionAdapter?.getSnapshot()
  if (
    config.sessionEpoch !== undefined &&
    (snapshot?.sessionEpoch !== config.sessionEpoch || snapshot.signal.aborted)
  ) {
    throw cancelledSessionError()
  }
  if (snapshot && !config.sessionContextCaptured) {
    config.sessionEpoch ??= snapshot.sessionEpoch
    config.signal = combineAbortSignals(config.signal, snapshot.signal)
    config.headers.set('Authorization', `Bearer ${snapshot.accessToken}`)
    if (!config.skipTenantHeader) config.headers.set('X-Tenant-Id', snapshot.tenantId)
  }
  removeJsonContentTypeForFormData(config)
  return config
})

rawTransport.interceptors.request.use((config) => {
  applyAcceptLanguage(config)
  removeJsonContentTypeForFormData(config)
  return config
})

transport.interceptors.response.use(
  (response) => {
    if (!requestSessionIsCurrent(response.config)) throw cancelledSessionError()
    observeResponseTenantContext(response)
    return response
  },
  async (error: AxiosError) => {
    observeResponseTenantContext(error.response)
    const config = error.config
    const status = error.response?.status
    const sessionAdapter = getHttpSession()
    const snapshot = sessionAdapter?.getSnapshot()

    if (
      config?.sessionEpoch !== undefined &&
      (snapshot?.sessionEpoch !== config.sessionEpoch || snapshot.signal.aborted)
    ) {
      return Promise.reject(cancelledSessionError(error))
    }

    if (
      status === 401 &&
      config &&
      !config.skipAuthRefresh &&
      !config.retryAfterRefresh &&
      sessionAdapter &&
      snapshot?.accessToken &&
      config.sessionEpoch !== undefined
    ) {
      config.retryAfterRefresh = true
      await refreshSession(config.sessionEpoch)
      const refreshed = sessionAdapter.getSnapshot()
      if (
        !refreshed ||
        refreshed.sessionEpoch !== config.sessionEpoch ||
        refreshed.signal.aborted
      ) {
        return Promise.reject(cancelledSessionError())
      }
      config.headers.set('Authorization', `Bearer ${refreshed.accessToken}`)
      if (!config.skipTenantHeader) config.headers.set('X-Tenant-Id', refreshed.tenantId)
      return transport(config)
    }

    const httpError = await toHttpError(error)
    if (config?.sessionEpoch !== undefined && !requestSessionIsCurrent(config)) {
      return Promise.reject(cancelledSessionError(error))
    }
    if (status === 401 && config?.retryAfterRefresh && sessionAdapter) {
      const current = sessionAdapter.getSnapshot()
      // 同纪元 token 可能已由其他标签页更新，旧 token 的失败不能终止当前会话。
      if (
        !current ||
        config.sessionEpoch === undefined ||
        current.sessionEpoch !== config.sessionEpoch ||
        current.signal.aborted ||
        config.headers.get('Authorization') !== `Bearer ${current.accessToken}`
      ) {
        return Promise.reject(cancelledSessionError(error))
      }
      await sessionAdapter.handleRefreshFailure(httpError)
      return Promise.reject(httpError)
    }
    if (status === 401 && !config?.skipAuthRefresh && !snapshot?.accessToken) {
      return Promise.reject(httpError)
    }
    return Promise.reject(httpError)
  },
)

function requestSessionIsCurrent(config: InternalAxiosRequestConfig): boolean {
  if (config.sessionEpoch === undefined) return true
  const snapshot = getHttpSession()?.getSnapshot()
  return snapshot?.sessionEpoch === config.sessionEpoch && snapshot.signal.aborted !== true
}

function combineAbortSignals(
  requestSignal: GenericAbortSignal | undefined,
  sessionSignal: AbortSignal | undefined,
): GenericAbortSignal | undefined {
  if (!requestSignal) return sessionSignal
  if (!sessionSignal || requestSignal === sessionSignal) return requestSignal
  return AbortSignal.any([requestSignal as AbortSignal, sessionSignal])
}

function cancelledSessionError(cause?: unknown): HttpError {
  return new HttpError('会话已切换，请求已取消', {
    status: 401,
    kind: 'cancelled',
    cause,
  })
}
