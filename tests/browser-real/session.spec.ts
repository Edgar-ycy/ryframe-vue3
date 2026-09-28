import { test } from './fixture'
import { expect } from '@playwright/test'
import { act, login } from './support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

test('真实刷新 Cookie、跨标签恢复会话和同步退出', async ({ page, context }, info) => {
  const diagnostics = observeDiagnostics(page)
  await login(page)
  const refreshed = await act(page, 'POST', '/api/v1/auth/refresh', () => page.reload())
  expect(await refreshed.headerValue('set-cookie')).toBeTruthy()
  await expect(page.locator('main.workspace')).toBeVisible()
  await page.waitForLoadState('networkidle')
  const second = await context.newPage()
  const secondDiagnostics = observeDiagnostics(second)
  await act(second, 'POST', '/api/v1/auth/refresh', () => second.goto('/system/post'))
  await expect(second.locator('.content-card .card-header')).toContainText('岗位')
  await second.waitForLoadState('networkidle')
  await page.locator('.navbar .user-info').hover()
  await page.getByRole('menuitem', { name: '退出登录', exact: true }).click()
  await act(page, 'POST', '/api/v1/auth/logout', () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(page).toHaveURL(/\/login(?:\?|$)/u)
  await expect(second).toHaveURL(/\/login(?:\?|$)/u)
  await expect(second.locator('main.workspace')).toHaveCount(0)
  await expect(page.locator('main.workspace')).toHaveCount(0)
  await expectCleanDiagnostics(page, diagnostics)
  await expectCleanDiagnostics(second, secondDiagnostics)
  await second.close()
  info.annotations.push({ type: 'restore-scenario', description: 'session' })
})
