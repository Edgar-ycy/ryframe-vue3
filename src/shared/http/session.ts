import { HttpError, toHttpError } from './errors'
import { httpTranslate } from './localization'

export interface HttpSessionAdapter {
  getSnapshot(): HttpSessionRequestContext | undefined
  observeTenantContext(observation: TenantContextObservation): void
  refreshAccessToken(): Promise<string>
  handleRefreshFailure(error: HttpError): Promise<void>
}

export interface HttpSessionRequestContext {
  accessToken: string
  tenantId: string
  sessionEpoch: number
  signal: AbortSignal
}

export interface TenantContextObservation {
  authorizationEpoch?: string
  runtimeEpoch?: string
  placementGeneration?: string
  businessDataState?: string
}

let sessionAdapter: HttpSessionAdapter | undefined
let refreshPromise: Promise<string> | undefined
let refreshEpoch: number | undefined

export function configureHttpSession(adapter: HttpSessionAdapter): void {
  sessionAdapter = adapter
}

export function getHttpSession(): HttpSessionAdapter | undefined {
  return sessionAdapter
}

export function isHttpSessionEpochCurrent(expected: number): boolean {
  const snapshot = sessionAdapter?.getSnapshot()
  return snapshot?.sessionEpoch === expected && snapshot.signal.aborted !== true
}

export async function refreshSession(expectedEpoch: number): Promise<string> {
  if (!sessionAdapter) {
    throw new HttpError(httpTranslate('shell.http.sessionNotInitialized'), {
      status: 401,
      kind: 'http',
    })
  }
  if (!isHttpSessionEpochCurrent(expectedEpoch)) throw cancelledSessionError()
  if (!refreshPromise || refreshEpoch !== expectedEpoch) {
    const adapter = sessionAdapter
    refreshEpoch = expectedEpoch
    const pending = adapter
      .refreshAccessToken()
      .then((token) => {
        if (!isHttpSessionEpochCurrent(expectedEpoch)) throw cancelledSessionError()
        return token
      })
      .catch(async (error: unknown) => {
        const httpError = await toHttpError(error)
        if (httpError.kind !== 'cancelled' && isHttpSessionEpochCurrent(expectedEpoch)) {
          await adapter.handleRefreshFailure(httpError)
        }
        throw httpError
      })
      .finally(() => {
        if (refreshPromise === pending) {
          refreshPromise = undefined
          refreshEpoch = undefined
        }
      })
    refreshPromise = pending
  }
  return refreshPromise
}

function cancelledSessionError(): HttpError {
  return new HttpError('会话已切换，请求已取消', { status: 401, kind: 'cancelled' })
}
