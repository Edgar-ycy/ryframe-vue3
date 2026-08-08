import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { getApplicationLocale } from '@/i18n'
import { runtimeConfig } from '@/shared/config/runtimeConfig'
import { toHttpError } from './errors'
import { getHttpSession, refreshSession } from './session'

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

function observeResponseAuthorizationEpoch(response: AxiosResponse | undefined): void {
  const session = getHttpSession()
  if (!session) return
  const accessToken = session.getAccessToken()
  const requestAuthorization = response?.config.headers.get('Authorization')
  if (!accessToken || requestAuthorization !== `Bearer ${accessToken}`) return
  const raw = response?.headers['x-authorization-epoch']
  const authorizationEpoch = typeof raw === 'string' ? Number(raw) : raw
  if (typeof authorizationEpoch !== 'number' || !Number.isSafeInteger(authorizationEpoch)) return
  session.observeAuthorizationEpoch(authorizationEpoch)
}

function removeJsonContentTypeForFormData(config: InternalAxiosRequestConfig): void {
  if (!(config.data instanceof FormData)) return
  config.headers.delete('Content-Type')
  config.headers.delete('content-type')
}

function applyAcceptLanguage(config: InternalAxiosRequestConfig): void {
  if (!config.headers.get('Accept-Language')) {
    config.headers.set('Accept-Language', getApplicationLocale())
  }
}

transport.interceptors.request.use((config) => {
  applyAcceptLanguage(config)
  const sessionAdapter = getHttpSession()
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

transport.interceptors.response.use(
  (response) => {
    observeResponseAuthorizationEpoch(response)
    return response
  },
  async (error: AxiosError) => {
    observeResponseAuthorizationEpoch(error.response)
    const config = error.config
    const status = error.response?.status
    const sessionAdapter = getHttpSession()

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
      config.headers['X-Tenant-Id'] = getHttpSession()?.getTenantId()
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
