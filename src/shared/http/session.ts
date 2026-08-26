import { HttpError, toHttpError } from './errors'
import { httpTranslate } from './localization'

export interface HttpSessionAdapter {
  getAccessToken(): string | null
  getTenantId(): string
  observeTenantContext(observation: TenantContextObservation): void
  refreshAccessToken(): Promise<string>
  handleRefreshFailure(error: HttpError): Promise<void>
}

export interface TenantContextObservation {
  authorizationEpoch?: string
  runtimeEpoch?: string
  placementGeneration?: string
  businessDataState?: string
}

let sessionAdapter: HttpSessionAdapter | undefined
let refreshPromise: Promise<string> | undefined

export function configureHttpSession(adapter: HttpSessionAdapter): void {
  sessionAdapter = adapter
}

export function getHttpSession(): HttpSessionAdapter | undefined {
  return sessionAdapter
}

export async function refreshSession(): Promise<string> {
  if (!sessionAdapter) {
    throw new HttpError(httpTranslate('shell.http.sessionNotInitialized'), {
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
