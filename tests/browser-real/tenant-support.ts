import { expect, type Locator, type Page } from '@playwright/test'
import { act, isolatedName } from './support'

function field(dialog: Locator, label: string): Locator {
  return dialog
    .locator('.el-form-item')
    .filter({ has: dialog.page().locator('label', { hasText: label }) })
}

export async function createTenantWithPlan(page: Page, target = 'shared-control') {
  const name = isolatedName('套餐')
  const key = isolatedName('plan')
  const tenant = isolatedName('tenant')
  const plansMenu = page.getByRole('menuitem', { name: '产品套餐', exact: true })
  if (!(await plansMenu.isVisible())) {
    await page.getByRole('menuitem', { name: '平台管理', exact: true }).click()
  }
  await act(page, 'GET', '/api/v1/platform/product-plans', () => plansMenu.click())
  await page.getByRole('button', { name: '新建套餐', exact: true }).click()
  const planDialog = page.getByRole('dialog', { name: '新建套餐', exact: true })
  await field(planDialog, '套餐键/能力码').locator('input').fill(key)
  await field(planDialog, '套餐名称').locator('input').fill(name)
  await act(page, 'POST', '/api/v1/platform/product-plans', () =>
    planDialog.getByRole('button', { name: '保存', exact: true }).click(),
  )
  const plan = page.locator('.el-table__body tr').filter({ hasText: key })
  await plan.click()
  const catalog = await act(page, 'GET', '/api/v1/platform/capabilities', () =>
    page.getByRole('button', { name: '新建版本', exact: true }).click(),
  )
  const catalogBody: unknown = await catalog.json()
  expect(catalogBody).toMatchObject({ data: [] })
  const version = page.getByRole('dialog', { name: '新建版本', exact: true })
  await field(version, '版本名称').locator('input').fill(`${name}-版本`)
  const created = await act(page, 'POST', /\/product-plans\/\d+\/versions$/u, () =>
    version.getByRole('button', { name: '保存', exact: true }).click(),
  )
  expect(created.request().postDataJSON()).toMatchObject({ capabilities: [] })
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await act(page, 'POST', /\/versions\/\d+\/publish$/u, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(page.getByText('已发布', { exact: true })).toBeVisible()

  await act(page, 'GET', '/api/v1/platform/tenants/page', () =>
    page.getByRole('menuitem', { name: '租户管理', exact: true }).click(),
  )
  await page.getByRole('button', { name: '创建租户', exact: true }).click()
  const create = page.getByRole('dialog', { name: '创建租户', exact: true })
  await field(create, '租户标识').locator('input').fill(tenant)
  await field(create, '租户名称').locator('input').fill(tenant)
  await field(create, '管理员账号').locator('input').fill('owner')
  await field(create, '初始密码').locator('input').fill('Valid!Owner123')
  await create.getByRole('combobox', { name: /产品套餐版本/u }).click()
  await page.getByRole('option', { name: `${name} · v1`, exact: true }).click()
  await create.getByRole('combobox', { name: /数据目标/u }).click()
  await page.getByRole('option').filter({ hasText: target }).click()
  await create.getByRole('spinbutton', { name: '最大用户数', exact: true }).fill('12')
  await create.getByRole('spinbutton', { name: '最大角色数', exact: true }).fill('8')
  await create.getByRole('spinbutton', { name: '存储配额（MiB）', exact: true }).fill('64')
  await create.getByRole('spinbutton', { name: '每分钟请求数', exact: true }).fill('600')
  const result = await act(page, 'POST', '/api/v1/platform/tenants', () =>
    create.getByRole('button', { name: '创建', exact: true }).click(),
  )
  expect(result.request().postDataJSON()).toMatchObject({
    tenant_id: tenant,
    admin_username: 'owner',
    max_users: 12,
    max_roles: 8,
    max_storage_mb: 64,
    max_requests_per_min: 600,
  })
  await expect(create).not.toBeVisible()
  return { tenant, planName: name, planKey: key }
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
