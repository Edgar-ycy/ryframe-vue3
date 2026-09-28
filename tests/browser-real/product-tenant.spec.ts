import { test } from './fixture'
import { expect } from '@playwright/test'
import { act, credentials, login, waitForApiResponse } from './support'
import { createTenantWithPlan, openTenantDetails } from './tenant-support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { expectNoSeriousAccessibilityViolations } from '../browser/support/accessibility'

test('空能力目录仍可发布、分配套餐并开通带配额的租户', async ({
  page,
  newClientContext,
  clientAddress,
}, info) => {
  const diagnostics = observeDiagnostics(page)
  await login(page)
  const { tenant, planName, planKey } = await createTenantWithPlan(page)
  await openTenantDetails(page, tenant)
  const quota = page.getByRole('region', { name: '配额配置', exact: true })
  for (const [label, value] of [
    ['最大用户数', '12'],
    ['最大角色数', '8'],
  ]) {
    await expect(
      quota.locator('.details-grid > div').filter({ hasText: label }).locator('dd'),
    ).toHaveText(value)
  }
  await expectNoSeriousAccessibilityViolations(page, '真实租户创建后容量页')
  const context = await act(page, 'GET', `/api/v1/platform/tenants/${tenant}/product-context`, () =>
    page.getByRole('tab', { name: '套餐与能力', exact: true }).click(),
  )
  const previous = (await context.json()).data
  expect(previous).toMatchObject({ plan_name: planName, capabilities: [], overrides: [] })
  const previousEpoch: string = previous.runtime_epoch

  const ownerContext = await newClientContext(clientAddress.replace('198.18.', '198.20.'))
  try {
    const owner = await ownerContext.newPage()
    const ownerLogin = waitForApiResponse(owner, 'POST', '/api/v1/auth/login')
    await login(owner, {
      ...credentials,
      tenantId: tenant,
      username: 'owner',
      password: 'Valid!Owner123',
    })
    const session = (await (await ownerLogin).json()).data.session_context
    expect(session).toMatchObject({
      user: { tenant_id: tenant, username: 'owner' },
      business_data: { state: 'active' },
      capabilities: [],
    })
    expect(session.roles.length).toBeGreaterThan(0)
    expect(session.permissions.length).toBeGreaterThan(0)
  } finally {
    await ownerContext.close()
  }
  await page.getByRole('button', { name: '变更套餐与能力', exact: true }).click()
  const change = page.getByRole('dialog', { name: '变更套餐与能力', exact: true })
  await change.getByRole('combobox', { name: '套餐', exact: true }).click()
  await page.getByRole('option', { name: `${planName} (${planKey})`, exact: true }).click()
  await change
    .locator('.el-select')
    .filter({
      has: page.getByRole('combobox', { name: '目标套餐版本', exact: true }),
    })
    .click()
  await page.getByRole('option', { name: '版本号 1', exact: true }).click()
  await act(page, 'POST', `/api/v1/platform/tenants/${tenant}/product-change-previews`, () =>
    change.getByRole('button', { name: '生成预览', exact: true }).click(),
  )
  const applied = await act(
    page,
    'POST',
    `/api/v1/platform/tenants/${tenant}/product-changes`,
    () => change.getByRole('button', { name: '应用变更', exact: true }).click(),
  )
  const current = (await applied.json()).data
  expect(current).toMatchObject({ plan_name: planName, capabilities: [], overrides: [] })
  expect(BigInt(current.runtime_epoch)).toBeGreaterThan(BigInt(previousEpoch))
  await expect(change).not.toBeVisible()
  await expectCleanDiagnostics(page, diagnostics)
  info.annotations.push({ type: 'restore-scenario', description: 'tenant' })
})
