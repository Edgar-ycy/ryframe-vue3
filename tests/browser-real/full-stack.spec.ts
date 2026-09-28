import { test } from './fixture'
import { expect } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from '../browser/support/accessibility'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

import { login, waitForApiResponse, expectSuccessfulResponse } from './support'
import { verifyRuntimeBackup } from './runtime-support'

test('真实后端完成登录、首页、岗位与租户基本流程', async ({ page }, info) => {
  const diagnostics = observeDiagnostics(page)
  const authenticatedRefreshFailures: string[] = []
  let authenticated = false

  page.on('response', (response) => {
    if (!authenticated || response.status() < 400) return
    const url = new URL(response.url())
    if (url.pathname === '/api/v1/auth/refresh') {
      authenticatedRefreshFailures.push(`${response.status()} ${url.pathname}`)
    }
  })

  await login(page)
  authenticated = true
  await expect(page.locator('main.workspace')).toBeVisible()
  await expect(page.getByText('已登录', { exact: true })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '真实首页')

  const postListResponse = waitForApiResponse(page, 'GET', '/api/v1/system/posts')
  await page.goto('/system/post')
  await expectSuccessfulResponse(await postListResponse)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.content-card .card-header')).toContainText('岗位')
  await expectNoSeriousAccessibilityViolations(page, '真实岗位管理页')

  const postSearchResponse = waitForApiResponse(page, 'GET', '/api/v1/system/posts')
  await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  await expectSuccessfulResponse(await postSearchResponse)

  const userListResponse = waitForApiResponse(page, 'GET', '/api/v1/system/users')
  await page.goto('/system/user')
  await expectSuccessfulResponse(await userListResponse)
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const userDialog = page.getByRole('dialog', { name: '新增用户' })
  await expect(userDialog).toBeVisible()
  await userDialog.getByRole('button', { name: '取消', exact: true }).click()

  const tenantListResponse = waitForApiResponse(page, 'GET', '/api/v1/platform/tenants/page')
  await page.goto('/platform/tenants')
  await expectSuccessfulResponse(await tenantListResponse)
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: '租户容量管理' })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '真实租户容量页')

  const tenantSearchResponse = waitForApiResponse(page, 'GET', '/api/v1/platform/tenants/page')
  await page.locator('.filter-card').getByRole('button', { name: '查询', exact: true }).click()
  await expectSuccessfulResponse(await tenantSearchResponse)

  await verifyRuntimeBackup(page, info)

  expect(authenticatedRefreshFailures).toEqual([])
  await expectCleanDiagnostics(page, diagnostics)
  info.annotations.push({ type: 'restore-scenario', description: 'login' })
})
