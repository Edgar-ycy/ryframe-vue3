import { expect, test } from '@playwright/test'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { loginWithFixture, openSidebarPage } from './support/navigation'

test('筛选后跨页导出并管理终态记录', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const { deletionBodies, exportBodies } = await installApiFixture(page, diagnostics)

  await loginWithFixture(page)
  await openSidebarPage(page, '系统管理', '用户管理')
  await expect(page).toHaveURL(/\/system\/user$/u)
  await expect(page.getByText('alice', { exact: true })).toBeVisible()

  const filteredResponse = page.waitForResponse((response) => {
    const request = response.request()
    const url = new URL(response.url())
    return (
      request.method() === 'GET' &&
      url.pathname === '/api/v1/system/users' &&
      url.searchParams.get('username')?.trim() === 'alice'
    )
  })
  await page.getByPlaceholder('请输入用户名').fill('  alice  ')
  await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  await filteredResponse
  await expect(page.getByText('共 21 条')).toBeVisible()

  const exportButton = page
    .locator('.card-header')
    .getByRole('button', { name: '导出', exact: true })
  await expect(exportButton).toBeEnabled()
  const exportRequest = page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/v1/system/users/exports',
  )
  await exportButton.click()
  await exportRequest
  expect(exportBodies).toEqual([{ confirm_all: false, filter: { username: 'alice' } }])

  await page.getByRole('button', { name: '测试用户', exact: true }).click()
  await page.getByRole('menuitem', { name: '我的导出', exact: true }).click()
  await expect(page).toHaveURL(/\/profile\/exports$/u)
  const table = page.locator('.exports-desktop')
  const completedRow = table.getByRole('row').filter({ hasText: 'users.xlsx' })
  await expect(completedRow).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await completedRow.getByRole('button', { name: '下载', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('users.xlsx')

  await completedRow.getByRole('button', { name: '删除', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect(table.getByText('users.xlsx', { exact: true })).toHaveCount(0)
  expect(deletionBodies[0]).toEqual({ ids: ['job-1'] })

  await table.getByLabel('选择导出记录“roles.xlsx”').click()
  await table.getByLabel('选择导出记录“posts.xlsx”').click()
  await page.getByRole('button', { name: '删除所选（2）', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect(table.getByText('roles.xlsx', { exact: true })).toHaveCount(0)
  await expect(table.getByText('posts.xlsx', { exact: true })).toHaveCount(0)
  expect(deletionBodies[1]).toEqual({ ids: ['job-2', 'job-3'] })

  await expectCleanDiagnostics(page, diagnostics)
})
