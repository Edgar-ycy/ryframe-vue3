import { expect, type Page } from '@playwright/test'

export async function loginWithFixture(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByPlaceholder('用户名').fill('tester')
  await page.getByPlaceholder('密码').fill('browser-secret')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/\/index$/u)
}

export async function openSidebarPage(
  page: Page,
  directory: string,
  pageName: string,
): Promise<void> {
  const sidebar = page.locator('.sidebar-container')
  await sidebar.getByText(directory, { exact: true }).click()
  await sidebar.getByText(pageName, { exact: true }).click()
}
