import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirmAndSubmitExportIntent } from '@/app/exports/exportIntent'
import {
  deactivateServerStateScope,
  getServerStateScope,
  transitionServerStateScope,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function activate(subjectId: string, fingerprint: string) {
  transitionServerStateScope(
    { tenantId: 'tenant-a', subjectId, authorizationFingerprint: fingerprint },
    () => undefined,
    { force: true },
  )
  const scope = getServerStateScope()
  if (!scope) throw new Error('测试会话范围未激活')
  return scope
}

afterEach(() => {
  deactivateServerStateScope()
})

describe('导出确认会话范围', () => {
  it('同租户 A→B 后旧确认不触发 HTTP 或 UI 回写', async () => {
    const confirmation = deferred<boolean>()
    const http = vi.fn(async (_scope: ServerStateScope) => undefined)
    const ui = vi.fn()
    activate('user-a', 'authorization-a')

    const pending = confirmAndSubmitExportIntent(
      { isEmpty: true },
      async (scope) => {
        await http(scope)
        ui()
      },
      { requestConfirmation: () => confirmation.promise },
    )
    activate('user-b', 'authorization-b')
    confirmation.resolve(true)
    await pending

    expect(http).not.toHaveBeenCalled()
    expect(ui).not.toHaveBeenCalled()
  })

  it('同主体 authorization epoch 变化后旧确认不触发 HTTP 或 UI 回写', async () => {
    const confirmation = deferred<boolean>()
    const http = vi.fn(async (_scope: ServerStateScope) => undefined)
    const ui = vi.fn()
    activate('user-a', 'authorization-a')

    const pending = confirmAndSubmitExportIntent(
      { isEmpty: true },
      async (scope) => {
        await http(scope)
        ui()
      },
      { requestConfirmation: () => confirmation.promise },
    )
    activate('user-a', 'authorization-b')
    confirmation.resolve(true)
    await pending

    expect(http).not.toHaveBeenCalled()
    expect(ui).not.toHaveBeenCalled()
  })

  it('当前 scope 确认后只把预先捕获的 scope 交给提交入口', async () => {
    const expected = activate('user-a', 'authorization-a')
    const submit = vi.fn(async () => undefined)

    await confirmAndSubmitExportIntent({ isEmpty: false }, submit)

    expect(submit).toHaveBeenCalledOnce()
    expect(submit).toHaveBeenCalledWith({
      tenantId: expected.tenantId,
      subjectId: expected.subjectId,
      sessionEpoch: expected.sessionEpoch,
    })
  })

  it('KeepAlive 页面失活后旧确认不触发提交', async () => {
    const confirmation = deferred<boolean>()
    const submit = vi.fn(async () => undefined)
    let pageActive = true
    activate('user-a', 'authorization-a')

    const pending = confirmAndSubmitExportIntent({ isEmpty: true }, submit, {
      ownsOperation: () => pageActive,
      requestConfirmation: () => confirmation.promise,
    })
    pageActive = false
    confirmation.resolve(true)
    await pending

    expect(submit).not.toHaveBeenCalled()
  })
})
