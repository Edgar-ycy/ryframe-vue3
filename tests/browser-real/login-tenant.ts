import { expect, type Page } from '@playwright/test'

/** 真实登录通过租户名称选择控件，标识只用于定位同名选项。 */
export async function selectLoginTenant(page: Page, tenantId: string) {
  const select = page.getByRole('combobox', { name: '请选择租户名称' })
  if (!(await select.isVisible())) return
  await select.click()
  const option = page.getByTestId(`login-tenant-${tenantId}`)
  while (!(await option.isVisible())) {
    const more = page.getByRole('button', { name: '加载更多租户' })
    await expect(more).toBeVisible()
    const response = page.waitForResponse(
      (value) => new URL(value.url()).pathname === '/api/v1/auth/tenants',
    )
    await more.click()
    expect((await response).ok()).toBe(true)
  }
  await option.click()
  await page.waitForLoadState('networkidle')
}
