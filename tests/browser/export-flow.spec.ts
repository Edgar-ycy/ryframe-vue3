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
  expect(exportBodies).toEqual([{ confirm_all: false, filter: { username: 'alice' }, ids: [] }])

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

test('勾选与全选只导出当前页记录，翻页清空选择，空筛选必须确认', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const { exportBodies } = await installApiFixture(page, diagnostics)
  await loginWithFixture(page)
  await openSidebarPage(page, '系统管理', '用户管理')
  const row = page.locator('.el-table__body tr').filter({ hasText: 'alice' })
  await expect(row).toBeVisible()
  const checkbox = row.getByRole('checkbox')
  const exportButton = page
    .locator('.card-header')
    .getByRole('button', { name: '导出', exact: true })

  await checkbox.check()
  await expect(page.getByText('已选择 1 行', { exact: true })).toBeVisible()
  await exportButton.click()
  await expect.poll(() => exportBodies).toEqual([{ confirm_all: false, filter: {}, ids: ['1001'] }])
  await expect(page.locator('.el-message-box')).toHaveCount(0)

  await checkbox.uncheck()
  await page.getByRole('button', { name: '全选当前页', exact: true }).click()
  await expect(checkbox).toBeChecked()
  await expect(page.getByText('共 21 条')).toBeVisible()
  await expect(exportButton).toBeEnabled()
  await exportButton.click()
  await expect.poll(() => exportBodies.length).toBe(2)
  expect(exportBodies[1]).toEqual({ confirm_all: false, filter: {}, ids: ['1001'] })

  const nextPage = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === '/api/v1/system/users' && url.searchParams.get('page') === '2'
  })
  await page.locator('.el-pagination .btn-next').click()
  await nextPage
  await expect(checkbox).not.toBeChecked()
  await expect(page.getByText('已选择 1 行', { exact: true })).toHaveCount(0)
  await expect(exportButton).toBeEnabled()
  await exportButton.click()
  const confirmation = page.locator('.el-message-box')
  await expect(confirmation).toContainText(
    '当前已应用筛选为空，将导出你有权查看的全部匹配数据。数据量可能较大，是否继续？',
  )
  await confirmation.getByRole('button', { name: '取消', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  expect(exportBodies).toHaveLength(2)

  await exportButton.click()
  await confirmation.getByRole('button', { name: '继续导出', exact: true }).click()
  await expect.poll(() => exportBodies.length).toBe(3)
  expect(exportBodies[2]).toEqual({ confirm_all: true, filter: {}, ids: [] })
  await expectCleanDiagnostics(page, diagnostics)
})
