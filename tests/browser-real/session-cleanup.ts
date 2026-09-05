import { expect, type Page, type Request, type Response } from '@playwright/test'
import type { SessionResource } from '../../scripts/browser-session-resources.mjs'
import { act } from './support'
import { openIdentityPage } from './session-identities'
import { observeSession } from './session-observation'

function authorizeDeletionWindow(
  page: Page,
  resource: SessionResource,
  diagnostics: ReturnType<typeof observeSession>,
) {
  let deleted = false
  let contextReceived = false
  const list = `/api/v1/system/${resource.kind}s`
  const response = (value: Response) => {
    const method = value.request().method(),
      pathname = new URL(value.url()).pathname
    if (value.ok() && method === 'DELETE' && pathname === `${list}/${resource.id}`) deleted = true
    if (deleted && value.ok() && method === 'GET' && pathname === '/api/v1/auth/context')
      contextReceived = true
  }
  const request = (value: Request) => {
    const url = new URL(value.url())
    if (
      deleted &&
      !contextReceived &&
      value.method() === 'GET' &&
      url.pathname === list &&
      url.searchParams.get(resource.kind === 'role' ? 'code' : 'username') === resource.name
    )
      diagnostics.cancel(value)
  }
  page.on('response', response)
  page.on('request', request)
  return () => {
    page.off('response', response)
    page.off('request', request)
  }
}

/** 页面仅用于定位当前条目；删除前比较权威列表 ID，绝不接管同名资源。 */
export async function deleteOwnedIdentity(
  page: Page,
  resource: SessionResource,
  diagnostics: ReturnType<typeof observeSession>,
) {
  await openIdentityPage(page, resource.kind)
  const filter = page
    .locator('.search-card')
    .getByPlaceholder(resource.kind === 'role' ? '请输入角色编码' : '请输入用户名')
  await filter.fill(resource.name)
  const listed = await act(page, 'GET', `/api/v1/system/${resource.kind}s`, () =>
    page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click(),
  )
  const body: unknown = await listed.json()
  expect(body).toMatchObject({ data: { total: 1, items: [{ id: resource.id }] } })
  const row = page.locator('.el-table__body tr').filter({ hasText: resource.name })
  await expect(row).toHaveCount(1)
  await row.getByRole('button', { name: '删除', exact: true }).click()
  const stop = authorizeDeletionWindow(page, resource, diagnostics)
  try {
    const response = await act(
      page,
      'DELETE',
      `/api/v1/system/${resource.kind}s/${resource.id}`,
      () =>
        page
          .locator('.el-message-box')
          .getByRole('button', { name: '确认删除', exact: true })
          .click(),
    )
    await expect(row).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    await diagnostics.verify()
    return { status: response.status() }
  } finally {
    stop()
  }
}
