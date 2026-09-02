import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deactivateServerStateScope,
  getServerStateScope,
  transitionServerStateScope,
} from '@/shared/query/client'
import {
  confirmServerStatePageOperation,
  validateServerStatePageOperation,
} from '@/shared/query/scopedConfirmation'

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

describe('服务端状态确认操作', () => {
  it('同租户 A→B 后丢弃旧确认结果', async () => {
    const confirmation = deferred<boolean>()
    activate('user-a', 'authorization-a')

    const pending = confirmServerStatePageOperation(() => confirmation.promise)
    activate('user-b', 'authorization-b')
    confirmation.resolve(true)

    await expect(pending).resolves.toBeUndefined()
  })

  it('同主体 authorization epoch 变化后丢弃旧确认结果', async () => {
    const confirmation = deferred<boolean>()
    activate('user-a', 'authorization-a')

    const pending = confirmServerStatePageOperation(() => confirmation.promise)
    activate('user-a', 'authorization-b')
    confirmation.resolve(true)

    await expect(pending).resolves.toBeUndefined()
  })

  it('KeepAlive 页面失活后丢弃旧确认结果', async () => {
    const confirmation = deferred<boolean>()
    let pageActive = true
    activate('user-a', 'authorization-a')

    const pending = confirmServerStatePageOperation(
      () => confirmation.promise,
      () => pageActive,
    )
    pageActive = false
    confirmation.resolve(true)

    await expect(pending).resolves.toBeUndefined()
  })

  it('当前页面确认后返回预先捕获的完整 scope', async () => {
    const expected = activate('user-a', 'authorization-a')
    const requestConfirmation = vi.fn(async () => true)

    const operation = await confirmServerStatePageOperation(requestConfirmation)

    expect(requestConfirmation).toHaveBeenCalledOnce()
    expect(operation?.scope).toEqual({
      tenantId: expected.tenantId,
      subjectId: expected.subjectId,
      sessionEpoch: expected.sessionEpoch,
    })
  })

  it('用户取消时不返回操作', async () => {
    activate('user-a', 'authorization-a')

    await expect(confirmServerStatePageOperation(async () => false)).resolves.toBeUndefined()
  })

  it('旧表单校验返回后不允许调用 HTTP 或 UI 回写', async () => {
    const validation = deferred<boolean>()
    const http = vi.fn()
    const ui = vi.fn()
    activate('user-a', 'authorization-a')

    const pending = validateServerStatePageOperation(() => validation.promise)
    activate('user-b', 'authorization-b')
    validation.resolve(true)
    const operation = await pending
    if (operation) {
      http()
      ui()
    }

    expect(http).not.toHaveBeenCalled()
    expect(ui).not.toHaveBeenCalled()
  })
})
