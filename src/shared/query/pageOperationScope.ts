import { HttpError } from '@/shared/http/client'
import {
  assertServerStateScopeCurrent,
  getServerStateScope,
  isServerStateScopeCurrent,
} from './client'
import type { ServerStateScope } from './scope'

export interface ServerStatePageOperation {
  readonly scope: ServerStateScope
  apply<T>(effect: () => T, ownsOperation?: () => boolean): T
  assertCurrent(ownsOperation?: () => boolean): void
  isCurrent(ownsOperation?: () => boolean): boolean
}

/** 捕获页面操作开始时的完整会话范围，供 await 后的界面副作用校验。 */
export function beginServerStatePageOperation(): ServerStatePageOperation {
  const active = getServerStateScope()
  if (!active || active.signal.aborted) {
    throw new HttpError('会话已切换，操作已取消', {
      status: 401,
      kind: 'cancelled',
    })
  }
  const scope: ServerStateScope = {
    tenantId: active.tenantId,
    subjectId: active.subjectId,
    sessionEpoch: active.sessionEpoch,
  }
  const assertCurrent = (ownsOperation: () => boolean = () => true): void => {
    assertServerStateScopeCurrent(scope)
    if (!ownsOperation()) {
      throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    }
  }
  return {
    scope,
    apply<T>(effect: () => T, ownsOperation?: () => boolean): T {
      assertCurrent(ownsOperation)
      return effect()
    },
    assertCurrent,
    isCurrent: (ownsOperation = () => true) => isServerStateScopeCurrent(scope) && ownsOperation(),
  }
}
