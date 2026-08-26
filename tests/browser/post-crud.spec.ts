import { expect, test } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from './support/accessibility'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { loginWithFixture, openSidebarPage } from './support/navigation'

test('生成的岗位页面完成查询、导出和增改删闭环', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const {
    postCreateBodies,
    postDeleteIds,
    postExportBodies,
    postRequestContexts,
    postUpdateBodies,
  } = await installApiFixture(page, diagnostics)

  await loginWithFixture(page)
  await openSidebarPage(page, '系统管理', '岗位管理')
  await expect(page).toHaveURL(/\/system\/post$/u)
  await expect(page.getByText('测试岗位', { exact: true })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '岗位管理页')

  const addButton = page.locator('.card-header').getByRole('button', { name: '新增', exact: true })
  await expect(addButton).toBeVisible()
  await addButton.click()
  const addDialog = page.getByRole('dialog', { name: '新增岗位' })
  await expect(addDialog).toBeVisible()
  await addDialog.getByPlaceholder('请输入岗位名称').fill('浏览器岗位')
  await addDialog.getByPlaceholder('请输入岗位编码').fill('browser-post')
  await addDialog.getByRole('spinbutton').fill('12')
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/system/posts',
  )
  await addDialog.getByRole('button', { name: '确定', exact: true }).click()
  await createResponse
  await expect(page.getByText('浏览器岗位', { exact: true })).toBeVisible()

  const createdRow = page.locator('.el-table__body tr').filter({ hasText: '浏览器岗位' })
  const detailResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/system/posts/2002',
  )
  await createdRow.getByRole('button', { name: '编辑', exact: true }).click()
  await detailResponse
  const editDialog = page.getByRole('dialog', { name: '编辑岗位' })
  await expect(editDialog).toBeVisible()
  await expect(editDialog.getByPlaceholder('请输入岗位编码')).toBeDisabled()
  await editDialog.getByPlaceholder('请输入岗位名称').fill('浏览器岗位已改')
  await editDialog.getByRole('spinbutton').fill('18')
  await editDialog.getByText('停用', { exact: true }).click()
  const updateResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === '/api/v1/system/posts/2002',
  )
  await editDialog.getByRole('button', { name: '确定', exact: true }).click()
  await updateResponse
  await expect(page.getByText('浏览器岗位已改', { exact: true })).toBeVisible()

  const filteredResponse = page.waitForResponse((response) => {
    const request = response.request()
    const url = new URL(response.url())
    return (
      request.method() === 'GET' &&
      url.pathname === '/api/v1/system/posts' &&
      url.searchParams.get('name') === '浏览器岗位已改'
    )
  })
  await page.getByPlaceholder('请输入或选择岗位名称').fill('浏览器岗位已改')
  await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  await filteredResponse

  const exportButton = page
    .locator('.card-header')
    .getByRole('button', { name: '导出', exact: true })
  const exportResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/system/posts/exports',
  )
  await exportButton.click()
  await exportResponse

  const updatedRow = page.locator('.el-table__body tr').filter({ hasText: '浏览器岗位已改' })
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      new URL(response.url()).pathname === '/api/v1/system/posts/2002',
  )
  await updatedRow.getByRole('button', { name: '删除', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await deleteResponse
  await expect(page.getByText('浏览器岗位已改', { exact: true })).toHaveCount(0)

  expect(postCreateBodies).toEqual([{ code: 'browser-post', name: '浏览器岗位', sort: 12 }])
  expect(postUpdateBodies).toEqual([
    { body: { name: '浏览器岗位已改', sort: 18, status: '0' }, id: '2002' },
  ])
  expect(postExportBodies).toEqual([{ confirm_all: false, filter: { name: '浏览器岗位已改' } }])
  expect(postDeleteIds).toEqual(['2002'])
  expect(postRequestContexts.length).toBeGreaterThanOrEqual(8)
  for (const context of postRequestContexts) {
    expect(context.authorization).toBe('Bearer access-token-smoke')
    expect(context.tenantId).toBe('default')
  }
  await expectCleanDiagnostics(page, diagnostics)
})
