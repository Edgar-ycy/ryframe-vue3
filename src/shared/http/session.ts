import { HttpError, toHttpError } from './errors'
import { httpTranslate } from './localization'

export interface HttpSessionAdapter {
  getSnapshot(): HttpSessionRequestContext | undefined
  observeTenantContext(observation: TenantContextObservation): void
  refreshAccessToken(onAccessTokenApplied: AccessTokenApplied): Promise<string>
  handleRefreshFailure(error: HttpError): Promise<void>
}

export type AccessTokenApplied = (accessToken: string) => void

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
    const refreshSnapshot = adapter.getSnapshot()
    if (
      !refreshSnapshot ||
      refreshSnapshot.sessionEpoch !== expectedEpoch ||
      refreshSnapshot.signal.aborted
    ) {
      throw cancelledSessionError()
    }
    let ownedAccessToken = refreshSnapshot.accessToken
    refreshEpoch = expectedEpoch
    const pending = adapter
      .refreshAccessToken((accessToken) => {
        ownedAccessToken = accessToken
      })
      .then((token) => {
        if (!isHttpSessionEpochCurrent(expectedEpoch)) throw cancelledSessionError()
        return token
      })
      .catch(async (error: unknown) => {
        const httpError = await toHttpError(error)
        if (httpError.kind === 'cancelled') throw httpError
        // 只有本次本地刷新明确应用过的 token 才属于该尝试；外部 token 不得被旧失败清理。
        if (!refreshFailureSessionIsCurrent(adapter, expectedEpoch, ownedAccessToken)) {
          throw cancelledSessionError()
        }
        await adapter.handleRefreshFailure(httpError)
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

function refreshFailureSessionIsCurrent(
  adapter: HttpSessionAdapter,
  expectedEpoch: number,
  ownedAccessToken: string,
): boolean {
  if (sessionAdapter !== adapter) return false
  const snapshot = adapter.getSnapshot()
  return (
    snapshot?.sessionEpoch === expectedEpoch &&
    snapshot.signal.aborted !== true &&
    snapshot.accessToken === ownedAccessToken
  )
}

function cancelledSessionError(): HttpError {
  return new HttpError('会话已切换，请求已取消', { status: 401, kind: 'cancelled' })
}
