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

  expect(tenantRequestContexts.length).toBeGreaterThan(0)
  for (const context of tenantRequestContexts) {
    expect(context.authorization).toBe('Bearer access-token-smoke')
    expect(context.tenantId).toBe('system')
  }
  await expectCleanDiagnostics(page, diagnostics)
})
