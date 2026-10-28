import { expect, type Page } from '@playwright/test'
import { catalogPath, openCatalog, searchCatalog, type CatalogRow } from './generated-catalog-page'
import { expectOrderDenied, searchOrders, type OrderRow } from './generated-order-page'
import { tenantRequest, readCompleteOrders } from './generated-tenant-orders'
import { isolatedName } from '../browser-real/support'
import type { Budget } from './generated-tenant-setup'

export async function systemCatalogSnapshot(admin: Page, budget: Budget) {
  await budget.beforePageBootstrap()
  await openCatalog(admin)
  const observed = admin.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === catalogPath,
  )
  const first = await searchCatalog(admin, '')
  const current = await observed
  const rows: CatalogRow[] = [...first.items]
  // 核对完整分页，不将首屏相同冒充整个系统目录未变。
  if (first.total > 0) expect(first.items.length).toBeGreaterThan(0)
  const size = first.items.length
  for (let page = 2; rows.length < first.total; page += 1) {
    const response = await tenantRequest(
      admin,
      current,
      `${catalogPath}?page=${page}&page_size=${size}`,
      'GET',
      budget,
    )
    try {
      expect(response.status()).toBe(200)
      const data: { total: number; items: CatalogRow[] } = (await response.json()).data
      expect(data.total).toBe(first.total)
      expect(data.items.length).toBeGreaterThan(0)
      rows.push(...data.items)
    } finally {
      await response.dispose()
    }
  }
  expect(rows).toHaveLength(first.total)
  expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
  return rows.sort((a, b) => a.id.localeCompare(b.id))
}

export async function assertTenantIsolation(
  first: Page,
  second: Page,
  before: OrderRow[],
  other: OrderRow,
  budget: Budget,
) {
  const foreign = await searchOrders(first, other.code)
  expect(foreign.total).toBe(0)
  expect(foreign.items).toEqual([])
  const forward = await expectOrderDenied(first, foreign.response, other, budget)
  const own = before[0]
  if (!own) throw new Error('跨租户验证缺少已登记业务前像')
  const hidden = await searchOrders(second, own.code)
  expect(hidden.total).toBe(0)
  expect(hidden.items).toEqual([])
  const reverse = await expectOrderDenied(second, hidden.response, own, budget)
  await readCompleteOrders(first, before)
  await readCompleteOrders(second, [other])
  return { forward, reverse }
}

export async function rejectTenantCatalog(
  owner: Page,
  budget: Budget,
  recordIntent: (value: unknown) => Promise<void>,
) {
  const current = await searchOrders(owner, '')
  const data = {
    code: isolatedName('forbidden-catalog'),
    payload: { label: '租户禁止创建' },
    metadata: null,
    enabled: true,
  }
  // 即使预期拒绝也先保存 intent；意外成功不自动删除未知全局资源。
  await recordIntent({ operation: 'catalog-list-and-create-denied', input: data })
  const statuses: number[] = []
  for (const method of ['GET', 'POST'] as const) {
    const response = await tenantRequest(
      owner,
      current.response,
      catalogPath,
      method,
      budget,
      method === 'POST' ? data : undefined,
    )
    try {
      statuses.push(response.status())
      expect(response.status(), `普通租户不得 ${method} 系统全局目录`).toBe(403)
    } finally {
      await response.dispose()
    }
  }
  return statuses
}
