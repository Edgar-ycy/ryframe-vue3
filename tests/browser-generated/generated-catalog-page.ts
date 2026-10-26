import { expect, type Page, type Request, type TestInfo } from '@playwright/test'
import { act, expectSuccessfulResponse } from '../browser-real/support'

export const catalogPath = '/api/v1/business/order/catalog'
export const precisePayload = { unsigned: '18446744073709551615', label: '创建正文' }
export const initialMetadata = { source: 'generated-catalog-ui', nested: { present: true } }

export type CatalogRow = {
  id: string
  code: string
  payload: unknown
  metadata: unknown
  enabled: boolean
  created_at: string
  updated_at: string
}

export async function openCatalog(page: Page) {
  await act(page, 'GET', catalogPath, () => page.goto('/order/catalog'))
  await page.waitForLoadState('networkidle')
}

export async function searchCatalog(page: Page, code: string) {
  await page.getByPlaceholder('请输入或选择code', { exact: true }).fill(code)
  const search = page.locator('.search-card').getByRole('button', { name: '搜索', exact: true })
  let observed: Request | undefined
  const observe = (request: Request) => {
    const url = new URL(request.url())
    if (
      request.method() === 'GET' &&
      url.pathname === catalogPath &&
      url.searchParams.get('code') === code
    )
      observed = request
  }
  page.on('request', observe)
  try {
    await search.click()
    await page.waitForLoadState('networkidle')
  } finally {
    page.off('request', observe)
  }
  const response = observed
    ? await observed.response()
    : await act(page, 'GET', catalogPath, () => search.click())
  if (!response) throw new Error('目录查询未完成，保留证据，不自动重放')
  await expectSuccessfulResponse(response)
  const data: { items: CatalogRow[]; total: number } = (await response.json()).data
  expect(Array.isArray(data.items)).toBe(true)
  await page.waitForLoadState('networkidle')
  return data
}

export async function createCatalog(
  page: Page,
  code: string,
  registered: (row: CatalogRow) => Promise<void>,
) {
  await page.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增全局目录', exact: true })
  for (const name of ['code', 'payload', 'metadata'])
    await expect(dialog.getByPlaceholder(`请输入${name}`, { exact: true })).toHaveValue('')
  const enabled = dialog.getByRole('switch')
  await expect(enabled).not.toBeChecked()
  await dialog.getByPlaceholder('请输入code', { exact: true }).fill(code)
  await dialog
    .getByPlaceholder('请输入payload', { exact: true })
    .fill(JSON.stringify(precisePayload))
  await dialog
    .getByPlaceholder('请输入metadata', { exact: true })
    .fill(JSON.stringify(initialMetadata))
  await dialog.locator('.el-switch').click()
  await expect(enabled).toBeChecked()
  const response = await act(page, 'POST', catalogPath, () =>
    dialog.getByRole('button', { name: '确定', exact: true }).click(),
  )
  const row: CatalogRow = (await response.json()).data
  expect(row.id).toMatch(/^[1-9][0-9]*$/u)
  expect(row.code).toBe(code)
  await registered(row)
  expect(response.request().postDataJSON()).toEqual({
    code,
    payload: precisePayload,
    metadata: initialMetadata,
    enabled: true,
  })
  expect(row).toMatchObject({ payload: precisePayload, metadata: initialMetadata, enabled: true })
  await expect(dialog).not.toBeVisible()
}

export async function editCatalog(
  page: Page,
  row: CatalogRow,
  registered: (row: CatalogRow) => Promise<void>,
) {
  const listed = await searchCatalog(page, row.code)
  expect(listed.total).toBe(1)
  expect(listed.items).toEqual([row])
  const target = page.locator('.el-table__body tr').filter({ hasText: row.code })
  const detail = await act(page, 'GET', `${catalogPath}/${row.id}`, () =>
    target.getByRole('button', { name: '编辑', exact: true }).click(),
  )
  expect((await detail.json()).data).toEqual(row)
  const dialog = page.getByRole('dialog', { name: '编辑全局目录', exact: true })
  await expect(dialog.getByPlaceholder('请输入code', { exact: true })).toHaveValue(row.code)
  const payload = dialog.getByPlaceholder('请输入payload', { exact: true })
  expect(JSON.parse(await payload.inputValue())).toEqual(row.payload)
  const metadata = dialog.getByPlaceholder('请输入metadata', { exact: true })
  expect(JSON.parse(await metadata.inputValue())).toEqual(row.metadata)
  const enabled = dialog.getByRole('switch')
  await expect(enabled).toBeChecked()
  const changed = { ...precisePayload, label: '编辑正文' }
  await payload.fill(JSON.stringify(changed))
  await metadata.fill('')
  await dialog.locator('.el-switch').click()
  await expect(enabled).not.toBeChecked()
  const response = await act(page, 'PUT', `${catalogPath}/${row.id}`, () =>
    dialog.getByRole('button', { name: '确定', exact: true }).click(),
  )
  const updated: CatalogRow = (await response.json()).data
  expect(updated.id).toBe(row.id)
  expect(updated.code).toBe(row.code)
  await registered(updated)
  expect(response.request().postDataJSON()).toEqual({
    code: row.code,
    payload: changed,
    metadata: null,
    enabled: false,
  })
  expect(updated).toMatchObject({ payload: changed, metadata: null, enabled: false })
  expect(updated.created_at).toBe(row.created_at)
  await expect(dialog).not.toBeVisible()
  const after = await searchCatalog(page, row.code)
  expect(after.total).toBe(1)
  expect(after.items).toEqual([updated])
  await expect(target).toContainText('18446744073709551615')
}

export async function deleteCatalog(
  page: Page,
  row: CatalogRow,
  info: TestInfo,
  intent: () => Promise<void>,
) {
  const listed = await searchCatalog(page, row.code)
  await info.attach('generated-catalog-delete-preimage', {
    body: JSON.stringify({ registered: row, observed: listed.items, total: listed.total }, null, 2),
    contentType: 'application/json',
  })
  expect(listed.total, '删除前必须唯一匹配登记目录').toBe(1)
  expect(listed.items, '完整前像漂移时保留现场，不删除').toEqual([row])
  const target = page.locator('.el-table__body tr').filter({ hasText: row.code })
  await target.getByRole('button', { name: '删除', exact: true }).click()
  await intent()
  await act(page, 'DELETE', `${catalogPath}/${row.id}`, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(target).toHaveCount(0)
  const after = await searchCatalog(page, row.code)
  expect(after.total).toBe(0)
  expect(after.items).toEqual([])
}
