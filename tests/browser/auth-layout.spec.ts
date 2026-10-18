import { expect, test } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from './support/accessibility'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { fulfillJson } from './support/http'

test('单租户登录使用桌面左右布局并隐藏租户选择', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const tenantRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/auth/tenants') {
      tenantRequests.push(request.url())
    }
  })
  await installApiFixture(page, diagnostics, { multiTenancyEnabled: false })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/login')
  const brand = await page.locator('.auth-brand').boundingBox()
  const content = await page.locator('.auth-content').boundingBox()

  if (!brand || !content) throw new Error('登录页桌面布局节点缺失')
  expect(brand.x).toBeLessThan(content.x)
  await expect(page.getByRole('combobox', { name: '选择租户' })).toHaveCount(0)
  await expectNoSeriousAccessibilityViolations(page, '单租户登录页')
  await expectCleanDiagnostics(page, diagnostics)
  expect(tenantRequests).toEqual([])
})

test('运行能力探测失败后可以重试，恢复前不推断租户模式', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  await installApiFixture(page, diagnostics, { multiTenancyEnabled: false })
  let available = false
  let failedProbes = 0
  const tenantRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/auth/tenants') {
      tenantRequests.push(request.url())
    }
  })
  await page.route('**/api/v1/version', async (route) => {
    if (available) {
      await route.fallback()
      return
    }
    failedProbes += 1
    await fulfillJson(route, undefined, 503)
  })

  await page.goto('/login')
  await expect(page).toHaveURL(/\/503$/)
  await expect(page.getByRole('heading', { name: '503', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: '选择租户' })).toHaveCount(0)
  expect(tenantRequests).toEqual([])
  available = true
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page).toHaveURL(/\/login(?:\?|$)/)
  await expect(page.getByPlaceholder('用户名')).toBeVisible()
  await expect(page.getByRole('combobox', { name: '选择租户' })).toHaveCount(0)
  await expectNoSeriousAccessibilityViolations(page, '运行能力探测恢复后的登录页')
  await page.waitForTimeout(200)
  expect(failedProbes).toBeGreaterThan(0)
  expect(diagnostics.httpErrors).toEqual(Array(failedProbes).fill('503 /api/v1/version'))
  expect(diagnostics.unhandledApi).toEqual([])
  expect(diagnostics.pageErrors).toEqual([])
  expect(diagnostics.requestFailures).toEqual([])
  expect(diagnostics.console).toEqual([])
  expect(tenantRequests).toEqual([])
})

test('登录页在移动端切换为单列布局', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  await installApiFixture(page, diagnostics, { multiTenancyEnabled: false })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  const brand = await page.locator('.auth-brand').boundingBox()
  const content = await page.locator('.auth-content').boundingBox()

  if (!brand || !content) throw new Error('登录页移动布局节点缺失')
  expect(brand.y).toBeLessThan(content.y)
  expect(Math.abs(brand.width - content.width)).toBeLessThanOrEqual(1)
  await expectNoSeriousAccessibilityViolations(page, '移动端登录页')
  await expectCleanDiagnostics(page, diagnostics)
})
