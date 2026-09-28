import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'

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

/** 为同一跨标签刷新维护等待者；更新操作时重新绑定超时。 */
export class RefreshWaiters {
  private readonly waiters = new Set<RemoteRefreshWaiter>()

  constructor(private readonly onExpired: (operationId: string) => void) {}

  retarget(operation: RemoteRefreshOperation): void {
    for (const waiter of this.waiters) this.schedule(waiter, operation)
  }

  settle(operationId: string, settle: (waiter: RemoteRefreshWaiter) => void): void {
    for (const waiter of this.waiters) {
      if (waiter.operationId !== operationId) continue
      this.waiters.delete(waiter)
      if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
      settle(waiter)
    }
  }

  wait(operation: RemoteRefreshOperation): Promise<string> {
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
      const waiter: RemoteRefreshWaiter = { operationId: operation.operationId, resolve, reject }
      this.waiters.add(waiter)
      this.schedule(waiter, operation)
    })
  }

  rejectAll(error: HttpError): void {
    for (const waiter of this.waiters) {
      if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
      waiter.reject(error)
    }
    this.waiters.clear()
  }

  private schedule(waiter: RemoteRefreshWaiter, operation: RemoteRefreshOperation): void {
    if (waiter.timeoutId !== undefined) clearTimeout(waiter.timeoutId)
    waiter.operationId = operation.operationId
    waiter.timeoutId = window.setTimeout(
      () => {
        if (!this.waiters.delete(waiter)) return
        this.onExpired(waiter.operationId)
        waiter.reject(
          new HttpError(translate('shell.session.remoteRefreshTimeout'), {
            status: 409,
            kind: 'timeout',
          }),
        )
      },
      Math.max(operation.expiresAt - Date.now(), 0),
    )
  }
}
