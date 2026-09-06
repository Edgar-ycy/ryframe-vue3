import { expect, test } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from './support/accessibility'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { loginWithFixture } from './support/navigation'

test('登录后按会话权限投影首页与导航', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  await installApiFixture(page, diagnostics)

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'RyFrame' })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '登录页')

  await loginWithFixture(page)
  await expect(page.getByRole('heading', { name: /测试用户/u })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveClass(/\bdark\b/u)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const probe = document.createElement('span')
        probe.style.color = 'var(--el-color-primary)'
        document.body.append(probe)
        const color = getComputedStyle(probe).color.replaceAll(' ', '')
        probe.remove()
        return color
      }),
    )
    .toBe('rgb(59,130,246)')
  await expect(
    page.locator('.sidebar-container').getByText('系统管理', { exact: true }),
  ).toBeVisible()
  await page.locator('.sidebar-container').getByText('系统管理', { exact: true }).click()
  await expect(
    page.locator('.sidebar-container').getByText('用户管理', { exact: true }),
  ).toBeVisible()
  await expect(
    page.locator('.sidebar-container').getByText('岗位管理', { exact: true }),
  ).toBeVisible()
  await expect(
    page.locator('.sidebar-container').getByText('角色管理', { exact: true }),
  ).toHaveCount(0)
  await expectNoSeriousAccessibilityViolations(page, '首页')

  await expectCleanDiagnostics(page, diagnostics)
})
