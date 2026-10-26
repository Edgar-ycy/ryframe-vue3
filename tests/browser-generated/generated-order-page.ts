import { expect, type Page, type Request, type Response, type TestInfo } from '@playwright/test'
import { act, expectSuccessfulResponse } from '../browser-real/support'
import { isolatedOrigin } from '../browser-real/network'
import type { observeRequestBudget } from '../browser-real/request-budget'

export const orderPath = '/api/v1/business/order/order'
export const orderPermissions = [
  'order:order:list',
  'order:order:add',
  'order:order:edit',
  'order:order:remove',
]

export type OrderRow = {
  id: string
  tenant_id: string
  owner_id: string
  code: string
  amount: string
  delivery_date: string | null
  remark: string | null
  created_at: string
  updated_at: string
}

export async function openOrders(page: Page) {
  await act(page, 'GET', orderPath, () => page.goto('/order/order'))
  await page.waitForLoadState('networkidle')
}

export async function searchOrders(page: Page, code: string) {
  await page.getByPlaceholder('请输入或选择code', { exact: true }).fill(code)
  const search = page.locator('.search-card').getByRole('button', { name: '搜索', exact: true })
  let observed: Request | undefined
  const observe = (request: Request) => {
    const url = new URL(request.url())
    if (
      request.method() === 'GET' &&
      url.pathname === orderPath &&
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
  // 已发出的请求必须完成，不能因响应尚未到达而再次点击并取消它。
  // 只有新鲜 Query Key 未发请求时，才再次点击同一查询执行显式刷新。
  const response = observed
    ? await observed.response()
    : await act(page, 'GET', orderPath, () => search.click())
  if (!response) throw new Error('订单搜索请求未完成，保留失败诊断，不能自动重放')
  await expectSuccessfulResponse(response)
  const data: { items: OrderRow[]; total: number } = (await response.json()).data
  expect(Array.isArray(data.items)).toBe(true)
  await page.waitForLoadState('networkidle')
  return { response, ...data }
}

export async function createOrder(
  page: Page,
  code: string,
  amount: string,
  register: (row: OrderRow) => Promise<void>,
): Promise<OrderRow> {
  await page.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增订单', exact: true })
  await dialog.getByPlaceholder('请输入code', { exact: true }).fill(code)
  await dialog.getByPlaceholder('请输入amount', { exact: true }).fill(amount)
  await dialog.getByPlaceholder('请输入remark', { exact: true }).fill('真实页面归属验收')
  const created = await act(page, 'POST', orderPath, () =>
    dialog.getByRole('button', { name: '确定', exact: true }).click(),
  )
  const row: OrderRow = (await created.json()).data
  await register(row)
  expect(row.id).toMatch(/^[1-9][0-9]*$/u)
  expect(row).toMatchObject({ code, amount, remark: '真实页面归属验收' })
  await expect(dialog).not.toBeVisible()
  return row
}

export async function editOrder(page: Page, row: OrderRow, amount: string) {
  await searchOrders(page, row.code)
  const target = page.locator('.el-table__body tr').filter({ hasText: row.code })
  await expect(target).toHaveCount(1)
  await act(page, 'GET', `${orderPath}/${row.id}`, () =>
    target.getByRole('button', { name: '编辑', exact: true }).click(),
  )
  const dialog = page.getByRole('dialog', { name: '编辑订单', exact: true })
  const input = dialog.getByPlaceholder('请输入amount', { exact: true })
  await expect(input).toHaveValue(row.amount)
  await input.fill(amount)
  const response = await act(page, 'PUT', `${orderPath}/${row.id}`, () =>
    dialog.getByRole('button', { name: '确定', exact: true }).click(),
  )
  expect(response.request().postDataJSON()).toMatchObject({ amount })
  await expect(dialog).not.toBeVisible()
  const listed = await searchOrders(page, row.code)
  expect(listed.total).toBe(1)
  expect(listed.items[0]).toMatchObject({ id: row.id, code: row.code, amount })
  await expect(target).toContainText(amount)
  return listed.items[0]!
}

export async function deleteOrder(page: Page, row: OrderRow, info: TestInfo) {
  const listed = await searchOrders(page, row.code)
  await info.attach(`generated-order-delete-preimage-${row.id}`, {
    body: JSON.stringify({ registered: row, observed: listed.items, total: listed.total }, null, 2),
    contentType: 'application/json',
  })
  expect(listed.total, '删除前必须唯一匹配登记订单').toBe(1)
  expect(listed.items, '删除前完整行必须与登记前像一致，漂移时保留现场').toEqual([row])
  const target = page.locator('.el-table__body tr').filter({ hasText: row.code })
  await target.getByRole('button', { name: '删除', exact: true }).click()
  await act(page, 'DELETE', `${orderPath}/${row.id}`, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(target).toHaveCount(0)
  expect((await searchOrders(page, row.code)).items).toEqual([])
}

/** 复用 Playwright 既有请求端口和当前列表的权威请求头，不读取客户端存储。 */
export async function expectOrderDenied(
  page: Page,
  current: Response,
  target: OrderRow,
  budget: ReturnType<typeof observeRequestBudget>,
) {
  const origin = isolatedOrigin(page.url())
  expect(new URL(current.url()).origin).toBe(origin)
  expect(new URL(current.url()).pathname).toBe(orderPath)
  const observed = await current.request().allHeaders()
  const headers = Object.fromEntries(
    Object.entries(observed).filter(([name]) =>
      ['authorization', 'x-tenant-id', 'x-forwarded-for', 'accept-language'].includes(name),
    ),
  )
  expect(headers.authorization).toBeTruthy()
  expect(headers['x-tenant-id']).toBeTruthy()
  const statuses: number[] = []
  for (const method of ['GET', 'PUT', 'DELETE']) {
    await budget.beforeApiRequest()
    const response = await page.request.fetch(`${origin}${orderPath}/${target.id}`, {
      method,
      headers,
      ...(method === 'PUT' ? { data: { amount: '1.234567' } } : {}),
      maxRedirects: 0,
    })
    try {
      statuses.push(response.status())
      expect(response.status(), `无权 ${method} 不得访问其他归属的订单`).toBe(404)
    } finally {
      await response.dispose()
    }
  }
  return statuses
}
