import { test } from './fixture'
import { expect } from '@playwright/test'
import { act, isolatedName, login } from './support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

test('真实公告完成新增、修改、发布消息和删除', async ({ page }, info) => {
  const title = isolatedName('公告')
  const diagnostics = observeDiagnostics(page)
  await login(page)
  await act(page, 'GET', '/api/v1/system/notices', () => page.goto('/system/notice'))
  await page.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input').first().fill(title)
  await dialog.locator('textarea').fill(`# ${title}\n\n真实业务消息`)
  await act(page, 'POST', '/api/v1/system/notices', () =>
    dialog.getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.el-table__body tr').filter({ hasText: title })).toHaveCount(1)
  await act(page, 'GET', '/api/v1/system/notices', async () => {
    await page.locator('.search-card input').first().fill(title)
    await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  })
  const row = page.locator('.el-table__body tr').filter({ hasText: title })
  await expect(row).toHaveCount(1)
  const detail = await act(page, 'GET', /\/system\/notices\/\d+$/u, () =>
    row.getByRole('button', { name: '编辑', exact: true }).click(),
  )
  const path = new URL(detail.url()).pathname
  await expect(dialog.locator('textarea')).toHaveValue(`# ${title}\n\n真实业务消息`)
  await dialog.locator('textarea').fill(`# ${title}\n\n修改后的消息`)
  await dialog.getByRole('radio', { name: '已发布', exact: true }).check()
  await act(page, 'PUT', path, () =>
    dialog.getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(row).toContainText('修改后的消息')
  await row.getByRole('button', { name: '发布到消息中心', exact: true }).click()
  await act(page, 'POST', /\/notices\/\d+\/publish-message$/u, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await page.locator('.message-center-trigger button').click()
  const inbox = page.getByRole('dialog', { name: '消息中心', exact: true })
  await expect(inbox.getByText(title, { exact: true })).toBeVisible({ timeout: 90_000 })
  await inbox.getByText(title, { exact: true }).click()
  const message = page.getByRole('dialog', { name: title, exact: true })
  await expect(message.locator('.message-detail__markdown')).toContainText('修改后的消息')
  await message.getByRole('button', { name: '删除', exact: true }).click()
  const deletedMessage = await act(page, 'POST', '/api/v1/system/messages/delete', () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  expect(deletedMessage.request().postDataJSON()).toMatchObject({ ids: [expect.any(String)] })
  await expect(message).not.toBeVisible()
  await expect(inbox.getByText(title, { exact: true })).toHaveCount(0)
  await inbox.getByRole('button', { name: /close|关闭/iu }).click()
  await row.getByRole('button', { name: '删除', exact: true }).click()
  await act(page, 'DELETE', path, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(row).toHaveCount(0)
  await expectCleanDiagnostics(page, diagnostics)
  info.annotations.push(
    { type: 'restore-scenario', description: 'notice' },
    { type: 'restore-scenario', description: 'message' },
  )
})
