import type { Page, Response } from '@playwright/test'
import type { SessionResources } from '../../scripts/browser-session-resources.mjs'

export async function createOwnedIdentity(
  page: Page,
  resources: SessionResources,
  kind: 'user' | 'role',
  name: string,
  submit: () => Promise<unknown>,
): Promise<Response> {
  let submission: Promise<{ error?: unknown }> = Promise.resolve({})
  const result = await resources.create(kind, name, async () => {
    const response = page.waitForResponse((value) => {
      const request = value.request()
      return (
        request.method() === 'POST' &&
        new URL(value.url()).pathname === `/api/v1/system/${kind}s` &&
        request.postDataJSON()?.[kind === 'role' ? 'code' : 'username'] === name
      )
    })
    // 点击完成与服务器响应分别观测；服务器已返回 ID 时，点击异常也不能丢失 ownership。
    submission = Promise.resolve()
      .then(submit)
      .then(
        () => ({}),
        (error: unknown) => ({ error }),
      )
    const created = await response
    if (
      created.ok() &&
      created.request().headers()['x-tenant-id'] !== resources.snapshot().tenant_id
    ) {
      throw new Error('身份创建请求的实际租户与本测试收据不一致')
    }
    const body: unknown = created.ok() ? await created.json() : undefined
    const id =
      body &&
      typeof body === 'object' &&
      'data' in body &&
      body.data &&
      typeof body.data === 'object' &&
      'id' in body.data
        ? body.data.id
        : undefined
    return { status: created.status(), id, response: created }
  })
  const outcome = await submission
  if ('error' in outcome) throw outcome.error
  return result.response
}
