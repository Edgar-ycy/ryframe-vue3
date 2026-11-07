import { expect, type Locator, type Page, type Response } from '@playwright/test'
import type { OperationJsonResponse } from '@/api/contract'
import { act, isolatedName } from './support'

function field(dialog: Locator, label: string): Locator {
  return dialog
    .locator('.el-form-item')
    .filter({ has: dialog.page().locator('label', { hasText: label }) })
}

export async function createTenantWithPlan(
  page: Page,
  target = 'shared-control',
  identity?: { tenant: string; planKey: string; planName: string },
  beforeWrite?: () => Promise<void>,
) {
  const name = identity?.planName ?? isolatedName('套餐')
  const key = identity?.planKey ?? isolatedName('plan')
  const tenant = identity?.tenant ?? isolatedName('tenant')
  const plan = await createPublishedPlan(page, { planName: name, planKey: key }, beforeWrite)
  await createTenantFromPlan(page, { id: tenant, name: tenant }, plan, target, beforeWrite)
  return { tenant, planName: name, planKey: key }
}

/** 创建并发布空能力套餐，供单个或多个独占租户复用。 */
export async function createPublishedPlan(
  page: Page,
  identity?: { planKey: string; planName: string },
  beforeWrite?: () => Promise<void>,
) {
  const name = identity?.planName ?? isolatedName('套餐')
  const key = identity?.planKey ?? isolatedName('plan')
  const plansMenu = page.getByRole('menuitem', { name: '产品套餐', exact: true })
  if (!(await plansMenu.isVisible())) {
    await page.getByRole('menuitem', { name: '平台管理', exact: true }).click()
  }
  await plansMenu.click()
  const newPlan = page.getByRole('button', { name: '新建套餐', exact: true })
  await expect(newPlan).toBeVisible()
  await page.waitForLoadState('networkidle')
  await newPlan.click()
  const planDialog = page.getByRole('dialog', { name: '新建套餐', exact: true })
  await field(planDialog, '套餐键/能力码').locator('input').fill(key)
  await field(planDialog, '套餐名称').locator('input').fill(name)
  await beforeWrite?.()
  await act(page, 'POST', '/api/v1/platform/product-plans', () =>
    planDialog.getByRole('button', { name: '保存', exact: true }).click(),
  )
  const plan = page.locator('.el-table__body tr').filter({ hasText: key })
  await plan.click()
  const catalog = await act(page, 'GET', '/api/v1/platform/capabilities', () =>
    page.getByRole('button', { name: '新建版本', exact: true }).click(),
  )
  const catalogBody: unknown = await catalog.json()
  expect(catalogBody).toMatchObject({
    data: [
      { code: 'system.message', variants: [{ code: 'standard', schema_version: 1 }] },
      { code: 'system.notice', variants: [{ code: 'standard', schema_version: 1 }] },
    ],
  })
  const version = page.getByRole('dialog', { name: '新建版本', exact: true })
  await field(version, '版本名称').locator('input').fill(`${name}-版本`)
  await beforeWrite?.()
  const created = await act(page, 'POST', /\/product-plans\/\d+\/versions$/u, () =>
    version.getByRole('button', { name: '保存', exact: true }).click(),
  )
  expect(created.request().postDataJSON()).toMatchObject({ capabilities: [] })
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await beforeWrite?.()
  await act(page, 'POST', /\/versions\/\d+\/publish$/u, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(page.getByText('已发布', { exact: true })).toBeVisible()
  return { planName: name, planKey: key }
}

/** 通过创建表单使用已有已发布套餐，保留配额和初始账号设置。 */
export async function createTenantFromPlan(
  page: Page,
  tenant: { id: string; name: string },
  plan: { planName: string; planKey: string },
  target = 'shared-control',
  beforeWrite?: () => Promise<void>,
) {
  await page.getByRole('menuitem', { name: '租户管理', exact: true }).click()
  const newTenant = page.getByRole('button', { name: '创建租户', exact: true })
  await expect(newTenant).toBeVisible()
  await page.waitForLoadState('networkidle')
  await newTenant.click()
  const create = page.getByRole('dialog', { name: '创建租户', exact: true })
  await field(create, '租户标识').locator('input').fill(tenant.id)
  await field(create, '租户名称').locator('input').fill(tenant.name)
  await field(create, '管理员账号').locator('input').fill('owner')
  await field(create, '初始密码').locator('input').fill('Valid!Owner123')
  await create.getByRole('combobox', { name: /产品套餐版本/u }).click()
  await page.getByRole('option', { name: `${plan.planName} · v1`, exact: true }).click()
  await create.getByRole('combobox', { name: /数据目标/u }).click()
  await page.getByRole('option').filter({ hasText: target }).click()
  await create.getByRole('spinbutton', { name: '最大用户数', exact: true }).fill('12')
  await create.getByRole('spinbutton', { name: '最大角色数', exact: true }).fill('8')
  await create.getByRole('spinbutton', { name: '存储配额（MiB）', exact: true }).fill('64')
  await create.getByRole('spinbutton', { name: '每分钟请求数', exact: true }).fill('600')
  await beforeWrite?.()
  const result = await act(page, 'POST', '/api/v1/platform/tenants', () =>
    create.getByRole('button', { name: '创建', exact: true }).click(),
  )
  expect(result.request().postDataJSON()).toMatchObject({
    tenant_id: tenant.id,
    name: tenant.name,
    admin_username: 'owner',
    max_users: 12,
    max_roles: 8,
    max_storage_mb: 64,
    max_requests_per_min: 600,
  })
  await expect(create).not.toBeVisible()
  return result
}

/** 核对真实租户名称查询的分页参数及返回数据。 */
export async function readTenantSearchPage(response: Response, search: string, page: number) {
  const query = new URL(response.url()).searchParams
  const observed = {
    search: query.get('search'),
    page: query.get('page'),
    page_size: query.get('page_size'),
  }
  expect(response.status()).toBe(200)
  expect(observed).toEqual({ search, page: String(page), page_size: '20' })
  const body: OperationJsonResponse<'get_auth_tenants'> = await response.json()
  if (!body.data) throw new Error('租户名称查询未返回分页数据')
  return { ...observed, status: response.status(), ...body.data }
}

export async function openTenantDetails(page: Page, tenant: string) {
  await page.getByPlaceholder('按租户标识搜索').fill(tenant)
  await act(page, 'GET', '/api/v1/platform/tenants/page', () =>
    page.locator('.filter-card').getByRole('button', { name: '查询', exact: true }).click(),
  )
  const tenantRow = page.locator('.tenant-table .el-table__body tr').filter({ hasText: tenant })
  await act(page, 'GET', `/api/v1/platform/tenants/${tenant}`, () =>
    tenantRow.getByRole('button', { name: '详情', exact: true }).click(),
  )
}

export async function verifyDataTargets(page: Page, keys: string[]) {
  await page.getByRole('menuitem', { name: '平台管理', exact: true }).click()
  await act(page, 'GET', '/api/v1/platform/data-targets', () =>
    page.getByRole('menuitem', { name: '数据目标', exact: true }).click(),
  )
  for (const key of keys) {
    const row = page
      .locator('.el-table__body tr')
      .filter({ has: page.getByText(key, { exact: true }) })
    const response = await act(page, 'GET', `/api/v1/platform/data-targets/${key}`, () =>
      row.getByRole('button', { name: '详情', exact: true }).click(),
    )
    expect((await response.json()).data).toMatchObject({ key, health: 'verified', connected: true })
    await page
      .getByRole('dialog', { name: '数据目标详情', exact: true })
      .getByRole('button', { name: '关闭', exact: true })
      .click()
  }
}
