import type { SessionContext } from '@/features/session/contracts'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import {
  isSessionMessage,
  type SessionMessage,
  type SessionOutboundMessage,
} from './sessionMessage'

const CHANNEL_NAME = 'ryframe-auth-v0.5'
const REMOTE_REFRESH_WAIT_MS = 8_000

export interface RefreshOperation {
  operationId: string
  startedAt: number
}

export interface RemoteRefreshOperation extends RefreshOperation {
  source: string
  expiresAt: number
  pending: boolean
}

interface RemoteRefreshWaiter {
  operationId: string
  resolve(token: string): void
  reject(error: HttpError): void
  timeoutId?: number
}

interface SessionChannelHandlers {
  isTerminating(): boolean
  onAuthenticated(accessToken: string, sessionContext: SessionContext): void
  onRefreshFailed(status?: number): void
  onLogout(): void
}

function randomIdentifier(): string | undefined {
  if (typeof crypto === 'undefined') return undefined
  const randomUuid: unknown = Reflect.get(crypto, 'randomUUID')
  if (typeof randomUuid === 'function') {
    const value: unknown = randomUuid.call(crypto)
    if (typeof value === 'string' && value) return value
  }
  const values = crypto.getRandomValues(new Uint32Array(4))
  return [...values].map((value) => value.toString(16).padStart(8, '0')).join('')
}

const sourceId = randomIdentifier()
const remoteRefreshWaiters = new Set<RemoteRefreshWaiter>()

let channel: BroadcastChannel | undefined
let handlers: SessionChannelHandlers | undefined
let remoteRefreshOperation: RemoteRefreshOperation | undefined
let latestLogoutAt = 0
let latestSessionOperationAt = 0
let latestSessionOperationId: string | undefined
let latestSessionOperationIsLocal = false

export function installSessionChannel(nextHandlers: SessionChannelHandlers): void {
  handlers = nextHandlers
  if (
    !sourceId ||
    channel ||
    typeof window === 'undefined' ||
    typeof BroadcastChannel === 'undefined'
  )
    return

  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.addEventListener('message', (event) => {
    if (isSessionMessage(event.data)) handleSessionMessage(event.data)
  })
}

function handleSessionMessage(message: SessionMessage): void {
  if (message.source === sourceId) return
  if (message.type === 'refresh-start') {
    startRemoteRefresh(message)
    return
  }
  if (message.type === 'authenticated') {
    if (!matchesCurrentRemoteRefresh(message)) return
    remoteRefreshOperation!.pending = false
    handlers?.onAuthenticated(message.accessToken, message.sessionContext)
    settleRemoteRefreshWaiters(message.operationId, (waiter) => waiter.resolve(message.accessToken))
    return
  }
  if (message.type === 'refresh-failed') {
    if (!matchesCurrentRemoteRefresh(message)) return
    remoteRefreshOperation!.pending = false
    handlers?.onRefreshFailed(message.status)
    const error = new HttpError(translate('shell.session.otherTabRefreshFailed'), {
      status: message.status,
      kind: 'http',
    })
    settleRemoteRefreshWaiters(message.operationId, (waiter) => waiter.reject(error))
    return
  }
  if (message.type === 'logout') {
    if (message.at <= latestLogoutAt) return
    latestLogoutAt = message.at
    latestSessionOperationAt = Math.max(latestSessionOperationAt, message.at)
    latestSessionOperationId = undefined
    latestSessionOperationIsLocal = false
    handlers?.onLogout()
  }
}

function startRemoteRefresh(message: Extract<SessionMessage, { type: 'refresh-start' }>): void {
  if (message.startedAt <= latestLogoutAt || !isNewerSessionOperation(message)) return

  latestSessionOperationAt = Math.max(latestSessionOperationAt, message.startedAt)
  latestSessionOperationId = message.operationId
  latestSessionOperationIsLocal = false
  const next: RemoteRefreshOperation = {
    operationId: message.operationId,
    source: message.source,
    startedAt: message.startedAt,
    expiresAt: Date.now() + REMOTE_REFRESH_WAIT_MS,
    pending: true,
  }
  remoteRefreshOperation = next
  for (const waiter of remoteRefreshWaiters) scheduleRemoteRefreshWaiter(waiter, next)
}

function isNewerSessionOperation(
  message: Extract<SessionMessage, { type: 'refresh-start' }>,
): boolean {
  if (message.startedAt !== latestSessionOperationAt) {
    return message.startedAt > latestSessionOperationAt
  }
  if (latestSessionOperationIsLocal) return false
  return !latestSessionOperationId || message.operationId > latestSessionOperationId
}

function matchesCurrentRemoteRefresh(
  message: Extract<SessionMessage, { type: 'authenticated' | 'refresh-failed' }>,
): boolean {
  const current = remoteRefreshOperation
  if (
    !current?.pending ||
    current.operationId !== message.operationId ||
    current.source !== message.source ||
    current.startedAt !== message.startedAt ||
    message.startedAt <= latestLogoutAt ||
    handlers?.isTerminating() ||
    latestSessionOperationIsLocal ||
    latestSessionOperationAt !== current.startedAt ||
    latestSessionOperationId !== current.operationId
  )
    return false

  if (current.expiresAt <= Date.now()) {
    current.pending = false
    return false
  }
  return true
}

function settleRemoteRefreshWaiters(
  operationId: string,
  settle: (waiter: RemoteRefreshWaiter) => void,
): void {
  for (const waiter of remoteRefreshWaiters) {
    if (waiter.operationId !== operationId) continue
    remoteRefreshWaiters.delete(waiter)
    if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
    settle(waiter)
  }
}

function scheduleRemoteRefreshWaiter(
  waiter: RemoteRefreshWaiter,
  operation: RemoteRefreshOperation,
): void {
  if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
  waiter.operationId = operation.operationId
  const remaining = operation.expiresAt - Date.now()
  waiter.timeoutId = window.setTimeout(
    () => {
      if (!remoteRefreshWaiters.delete(waiter)) return
      if (
        remoteRefreshOperation?.operationId === waiter.operationId &&
        remoteRefreshOperation.pending
      )
        remoteRefreshOperation.pending = false
      waiter.reject(
        new HttpError(translate('shell.session.remoteRefreshTimeout'), {
          status: 409,
          kind: 'timeout',
        }),
      )
    },
    Math.max(remaining, 0),
  )
}

export function getRemoteRefreshOperation(): RemoteRefreshOperation | undefined {
  return remoteRefreshOperation
}

export function waitForRemoteRefresh(operation: RemoteRefreshOperation): Promise<string> {
  if (!operation.pending || operation.expiresAt <= Date.now()) {
    operation.pending = false
    return Promise.reject(
      new HttpError(translate('shell.session.remoteRefreshFinished'), {
        status: 409,
        kind: 'http',
      }),
    )
  }
  return new Promise<string>((resolve, reject) => {
    const waiter: RemoteRefreshWaiter = {
      operationId: operation.operationId,
      resolve,
      reject,
    }
    remoteRefreshWaiters.add(waiter)
    scheduleRemoteRefreshWaiter(waiter, operation)
  })
}

export function startLocalRefreshOperation(): RefreshOperation {
  latestSessionOperationAt = Math.max(Date.now(), latestLogoutAt + 1, latestSessionOperationAt + 1)
  const startedAt = latestSessionOperationAt
  const nonce = randomIdentifier()
  const operationId = sourceId && nonce ? `${sourceId}:${startedAt}:${nonce}` : `local:${startedAt}`
  latestSessionOperationId = operationId
  latestSessionOperationIsLocal = true
  if (remoteRefreshOperation?.pending) remoteRefreshOperation.pending = false
  postMessage({ type: 'refresh-start', operationId, startedAt })
  return { operationId, startedAt }
}

export function broadcastAuthenticated(
  operation: RefreshOperation,
  accessToken: string,
  sessionContext: SessionContext,
): void {
  postMessage({
    type: 'authenticated',
    ...operation,
    accessToken,
    sessionContext,
  })
}

export function broadcastRefreshFailed(operation: RefreshOperation, status?: number): void {
  postMessage({ type: 'refresh-failed', ...operation, status })
}

export function broadcastLogout(): void {
  postMessage({ type: 'logout', at: latestLogoutAt || Date.now() })
}

function postMessage(message: SessionOutboundMessage): void {
  if (!sourceId) return
  try {
    channel?.postMessage({ ...message, source: sourceId })
  } catch {
    // 跨标签页协调只是优化，不能让本地已经成功的会话操作失败。
  }
}

export function invalidateSessionChannelOperations(): void {
  latestLogoutAt = Math.max(latestLogoutAt, Date.now())
  latestSessionOperationAt = Math.max(latestSessionOperationAt, latestLogoutAt)
  latestSessionOperationId = undefined
  latestSessionOperationIsLocal = true
  remoteRefreshOperation = undefined
  const error = new HttpError(translate('shell.session.operationCancelled'), {
    status: 401,
    kind: 'cancelled',
  })
  for (const waiter of remoteRefreshWaiters) {
    if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
    waiter.reject(error)
  }
  remoteRefreshWaiters.clear()
}
