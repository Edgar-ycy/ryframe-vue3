import { expect, test } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from './support/accessibility'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { loginWithFixture, openSidebarPage } from './support/navigation'

test('系统租户会话进入租户容量页并携带租户上下文', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const { tenantRequestContexts } = await installApiFixture(page, diagnostics, {
    multiTenancyEnabled: true,
    tenantId: 'system',
  })

  await loginWithFixture(page)
  await openSidebarPage(page, '平台管理', '租户管理')
  await expect(page).toHaveURL(/\/platform\/tenants$/u)
  await expect(page.getByRole('heading', { name: '租户容量管理' })).toBeVisible()
  await expect(page.getByText('默认租户', { exact: true }).first()).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '租户容量页')

  const tenant = page.locator('.tenant-table .el-table__body tr').filter({ hasText: '默认租户' })
  const detailResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/platform/tenants/default',
  )
  await tenant.getByRole('button', { name: '详情', exact: true }).click()
  expect((await detailResponse).ok()).toBe(true)
  const drawer = page.getByRole('dialog', { name: '租户容量详情', exact: true })
  await expect(drawer.getByRole('heading', { name: '默认租户', exact: true })).toBeVisible()
  const statusTags = drawer.locator('.tenant-heading__tags')
  await expect(statusTags.getByText('启用', { exact: true })).toBeVisible()
  await expect(statusTags.getByText('永不过期', { exact: true })).toBeVisible()
  await expect(statusTags.getByText('正常', { exact: true })).toBeVisible()
  await expect(drawer.getByRole('region', { name: '配额配置', exact: true })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '租户容量详情')
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()

  expect(tenantRequestContexts.length).toBeGreaterThan(0)
  for (const context of tenantRequestContexts) {
    expect(context.authorization).toBe('Bearer access-token-smoke')
    expect(context.tenantId).toBe('system')
  }
  await expectCleanDiagnostics(page, diagnostics)
})
