import { expect, test } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from './support/accessibility'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'

test('单租户登录使用桌面左右布局并隐藏租户选择', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
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
