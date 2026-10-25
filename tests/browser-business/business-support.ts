import { expect, type Page } from '@playwright/test'
import { isolatedOrigin } from '../browser-real/network'
import { act, isolatedName } from '../browser-real/support'

const resourcePath = '/api/v1/business/order/order'

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error('业务夹具响应不是对象')
  return Object.fromEntries(Object.entries(value))
}

async function requestContext(page: Page) {
  // 业务样本通过正式 API 准备；迁移、取消和清理由平台页面的真实操作完成。
  // 只复用本次页面的请求头，不读取或改写客户端 Token，不记录凭据。
  const response = await act(page, 'GET', '/api/v1/system/posts', () => page.goto('/system/post'))
  const origin = isolatedOrigin(page.url())
  expect(new URL(response.url()).origin).toBe(origin)
  const observed = await response.request().allHeaders()
  const headers = Object.fromEntries(
    Object.entries(observed).filter(([name]) =>
      ['authorization', 'x-tenant-id', 'x-forwarded-for', 'accept-language'].includes(name),
    ),
  )
  if (!headers.authorization || !/^tenant-[a-f0-9]{8}$/u.test(headers['x-tenant-id'] || ''))
    throw new Error('业务样本缺少本次隔离租户的权威请求上下文')
  return { origin, headers }
}

export async function createOrders(page: Page): Promise<string[]> {
  const { origin, headers } = await requestContext(page)
  const names = Array.from({ length: 3 }, () => isolatedName('迁移业务'))
  for (const code of names) {
    const response = await page.request.post(`${origin}${resourcePath}`, {
      headers,
      data: { code, amount: '123.45' },
      maxRedirects: 0,
    })
    expect(response.status()).toBe(200)
    const body = record(await response.json())
    expect(body.code).toBe(200)
    await response.dispose()
  }
  await verifyOrders(page, names)
  return names
}

async function orderRows(page: Page) {
  const { origin, headers } = await requestContext(page)
  const response = await page.request.get(`${origin}${resourcePath}`, { headers, maxRedirects: 0 })
  expect(response.status()).toBe(200)
  const data = record(record(await response.json()).data)
  expect(data.total).toBe(3)
  if (!Array.isArray(data.items)) throw new Error('业务分页响应缺少完整 items')
  const rows = data.items.map(record)
  await response.dispose()
  return { origin, headers, rows }
}

export async function verifyOrders(page: Page, names: string[]): Promise<void> {
  const { rows } = await orderRows(page)
  expect(rows.map((row) => row.code).sort()).toEqual([...names].sort())
  for (const row of rows) {
    expect(row.id).toMatch(/^[1-9][0-9]*$/u)
    expect(row.created_at).toBeTruthy()
    expect(row.updated_at).toBeTruthy()
  }
}

export async function verifyAndDeleteOrders(page: Page, names: string[]): Promise<void> {
  await verifyOrders(page, names)
  const { origin, headers, rows } = await orderRows(page)
  for (const row of rows) {
    if (typeof row.id !== 'string') throw new Error('业务主键必须按字符串传输')
    const response = await page.request.delete(`${origin}${resourcePath}/${row.id}`, {
      headers,
      maxRedirects: 0,
    })
    expect(response.status()).toBe(200)
    await response.dispose()
  }
  const response = await page.request.get(`${origin}${resourcePath}`, { headers, maxRedirects: 0 })
  expect(record(record(await response.json()).data).total).toBe(0)
  await response.dispose()
}
