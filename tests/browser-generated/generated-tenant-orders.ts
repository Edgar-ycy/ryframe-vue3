import { expect, type Page, type Response } from '@playwright/test'
import { isolatedOrigin } from '../browser-real/network'
import { isolatedName } from '../browser-real/support'
import { orderPath, searchOrders, type OrderRow } from './generated-order-page'
import type { Budget } from './generated-tenant-setup'

export type OwnedOrder = {
  tenant: string
  owner: string
  phase: 'creating' | 'created' | 'needs-reconciliation'
  input: { code: string; amount: string; delivery_date: string | null; remark: string }
  response?: { status: number; body: string }
  row?: OrderRow
}

/** 只复用当前页面真实列表的请求头，不读 Token 存储或输出凭据。 */
export async function tenantRequest(
  page: Page,
  current: Response,
  path: string,
  method: 'GET' | 'POST',
  budget: Budget,
  data?: unknown,
) {
  const origin = isolatedOrigin(page.url())
  expect(new URL(current.url()).origin).toBe(origin)
  const headers = Object.fromEntries(
    Object.entries(await current.request().allHeaders()).filter(([key]) =>
      ['authorization', 'x-tenant-id', 'x-forwarded-for', 'accept-language'].includes(key),
    ),
  )
  expect(headers.authorization).toBeTruthy()
  expect(headers['x-tenant-id']).toBeTruthy()
  await budget.beforeApiRequest()
  return page.request.fetch(`${origin}${path}`, {
    method,
    headers,
    ...(data === undefined ? {} : { data }),
    maxRedirects: 0,
  })
}

export async function seedOrders(
  page: Page,
  tenant: string,
  owner: string,
  owned: OwnedOrder[],
  save: () => Promise<void>,
  budget: Budget,
  count: 1 | 3,
) {
  const current = await searchOrders(page, '')
  expect(current.total).toBe(0)
  expect(current.items).toEqual([])
  const samples = [
    {
      amount: '9007199254740993.123456',
      delivery_date: '2024-02-29',
      remark: '非空迁移 · 中文 Ω 第一行',
    },
    {
      amount: '999999999999999999.999999',
      delivery_date: null,
      remark: '空日期 / 保留精确金额 第二行',
    },
    { amount: '0.000001', delivery_date: '2030-12-31', remark: '小额与 Unicode 😀 第三行' },
  ]
  for (const sample of samples.slice(0, count)) {
    const entry: OwnedOrder = {
      tenant,
      owner,
      phase: 'creating',
      input: { code: isolatedName('move-order'), ...sample },
    }
    owned.push(entry)
    await save()
    try {
      const response = await tenantRequest(
        page,
        current.response,
        orderPath,
        'POST',
        budget,
        entry.input,
      )
      try {
        entry.response = { status: response.status(), body: await response.text() }
        await save()
        expect(response.status()).toBe(200)
        const row: OrderRow = JSON.parse(entry.response.body).data
        entry.row = row
        await save()
        expect(row.id).toMatch(/^[1-9][0-9]*$/u)
        expect(row.code).toBe(entry.input.code)
        expect(row.tenant_id).toBe(tenant)
        expect(row.owner_id).toBe(owner)
        expect(row).toMatchObject(entry.input)
        expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/u)
        expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/u)
        entry.phase = 'created'
        await save()
      } finally {
        await response.dispose()
      }
    } finally {
      if (entry.phase === 'creating') entry.phase = 'needs-reconciliation'
      await save()
    }
  }
  return owned
    .filter((entry) => entry.tenant === tenant)
    .map((entry) => {
      if (!entry.row) throw new Error('业务响应未登记完整行，不能猜测迁移输入')
      return entry.row
    })
}

export async function readCompleteOrders(page: Page, expected: OrderRow[]) {
  const all = await searchOrders(page, '')
  expect(all.total).toBe(expected.length)
  expect(all.items).toHaveLength(expected.length)
  const byId = (rows: OrderRow[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id))
  expect(byId(all.items)).toEqual(byId(expected))
  return all
}

/** 只观察真实 DOM；不读取 Store，也不修改页面或业务响应。 */
export async function observeMountedOrder(page: Page) {
  const root = page
    .locator('.page-container')
    .filter({ has: page.locator('.card-header').getByText('订单', { exact: true }) })
  await expect(root).toHaveCount(1)
  const element = await root.elementHandle()
  if (!element) throw new Error('原订单页面根节点不存在')
  const handle = await page.evaluateHandle((original) => {
    if (!original) throw new Error('原订单页面根节点不存在')
    type Point = {
      at_ms: number
      maintenance: boolean
      banner: string
      root_connected: boolean
      writes: number[]
    }
    const points: Point[] = []
    let overflow = false
    let previous = ''
    const visible = (node: Element) => {
      const style = getComputedStyle(node)
      return (
        node.getClientRects().length > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      )
    }
    const capture = () => {
      const banners = [...document.querySelectorAll('.business-data-banner')].filter(visible)
      const title = banners
        .map((banner) => banner.querySelector('.el-alert__title')?.textContent?.trim() ?? '')
        .join(' | ')
      const buttons = [
        ...original.querySelectorAll('.card-header button, .el-table__body button'),
      ].filter(visible)
      const state = {
        maintenance: banners.length === 1 && title.startsWith('业务数据正在维护'),
        banner: title.slice(0, 180),
        root_connected: original.isConnected,
        writes: ['新增', '编辑', '删除'].map(
          (label) => buttons.filter((button) => button.textContent?.trim() === label).length,
        ),
      }
      const key = JSON.stringify(state)
      if (key === previous) return
      previous = key
      if (points.length >= 64) {
        overflow = true
        return
      }
      points.push({ at_ms: Date.now(), ...state })
    }
    const observer = new MutationObserver(capture)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    })
    capture()
    return {
      read: () => {
        capture()
        return { points: [...points], overflow }
      },
      stop: () => {
        observer.disconnect()
        capture()
        return { points: [...points], overflow }
      },
    }
  }, element)
  await element.dispose()
  return {
    read: () => handle.evaluate((value) => value.read()),
    stop: async () => {
      try {
        return await handle.evaluate((value) => value.stop())
      } finally {
        await handle.dispose()
      }
    },
    assertRestored: async () => {
      await expect(page.locator('.business-data-banner')).toHaveCount(0)
      await expect(root.getByRole('button', { name: '新增', exact: true })).toBeVisible()
      for (const label of ['编辑', '删除']) {
        const buttons = root.getByRole('button', { name: label, exact: true })
        await expect(buttons).toHaveCount(3)
        for (const button of await buttons.all()) await expect(button).toBeVisible()
      }
      const evidence = await handle.evaluate((value) => value.read())
      expect(evidence.overflow).toBe(false)
      const maintenance = evidence.points.filter((point) => point.maintenance)
      expect(maintenance.length, '必须真实观察到维护横幅，不得跳过维护窗口').toBeGreaterThan(0)
      expect(
        evidence.points.every((point) => point.root_connected),
        '原页面不得卸载替换',
      ).toBe(true)
      for (const point of maintenance) expect(point.writes).toEqual([0, 0, 0])
      expect(evidence.points.at(-1)?.writes).toEqual([1, 3, 3])
    },
  }
}
