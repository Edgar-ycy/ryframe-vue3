import { test } from './fixture'
import { expect, type Page } from '@playwright/test'
import { readFile, stat } from 'node:fs/promises'
import { act, isolatedName, login } from './support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

async function selectConfig(page: Page, name: string, changedScope = false) {
  if (page.url() === 'about:blank' || changedScope) {
    await act(page, 'GET', '/api/v1/system/configs', () =>
      page.url() === 'about:blank'
        ? page.goto('/system/config')
        : page.getByRole('menuitem', { name: '参数设置', exact: true }).click(),
    )
  } else await page.getByRole('menuitem', { name: '参数设置', exact: true }).click()
  await expect(page).toHaveURL(/\/system\/config$/u)
  await page.locator('.search-card').getByPlaceholder('请输入参数键名').fill(name)
  await act(page, 'GET', '/api/v1/system/configs', () =>
    page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click(),
  )
  const row = page.locator('.el-table__body tr').filter({ hasText: name })
  await expect(row).toHaveCount(1)
  return row
}

async function selectLatestTransfer(page: Page, transferId: string, status: string) {
  // 应用和回滚会更新授权纪元，旧 scope 的选择必须先清除，再从当前身份重新读取。
  await expect(page.getByText('选择历史记录，或用配置包创建一次新迁移。')).toBeVisible()
  await page.getByRole('button', { name: '查看迁移历史', exact: true }).click()
  const history = page.getByRole('dialog', { name: '迁移历史', exact: true })
  const latest = history.locator('.history-card').first()
  await expect(latest).toContainText(status)
  const selected = await act(page, 'GET', `/api/v1/system/config-transfers/${transferId}`, () =>
    latest.getByRole('button', { name: '查看', exact: true }).click(),
  )
  expect((await selected.json()).data).toMatchObject({ id: transferId })
  await expect(history).not.toBeVisible()
  await expect(page.locator('.plan-overview')).toContainText(status)
}

test('真实配置包导出、下载、上传、预览、应用与回滚保留参数值', async ({ page }, info) => {
  test.setTimeout(240_000)
  const name = isolatedName('config')
  const diagnostics = observeDiagnostics(page)
  await login(page)
  await page.getByRole('menuitem', { name: '系统管理', exact: true }).click()
  await act(page, 'GET', '/api/v1/system/configs', () =>
    page.getByRole('menuitem', { name: '参数设置', exact: true }).click(),
  )
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增参数', exact: true })
  await dialog.getByPlaceholder('请输入参数名称').fill(name)
  await dialog.getByPlaceholder('请输入参数键名').fill(name)
  await dialog.getByPlaceholder('请输入参数键值').fill('备份值')
  await dialog.locator('.portable-field .el-switch').click()
  await expect(dialog.getByRole('switch', { name: '允许配置包迁移', exact: true })).toBeChecked()
  await act(page, 'POST', '/api/v1/system/configs', () =>
    dialog.getByRole('button', { name: '确定', exact: true }).click(),
  )
  await page.getByRole('menuitem', { name: '配置迁移', exact: true }).click()
  await act(page, 'POST', '/api/v1/system/config-packages', () =>
    page.getByRole('button', { name: '生成配置包', exact: true }).click(),
  )
  const bundle = page.locator('.desktop-package-table .el-table__body tr').first()
  await expect(bundle).toContainText('已完成', { timeout: 90_000 })
  const downloading = page.waitForEvent('download')
  await bundle.getByRole('button', { name: '下载', exact: true }).click()
  const output = info.outputPath('bundle.ryframe-config.zip')
  await (await downloading).saveAs(output)
  expect((await stat(output)).size).toBeGreaterThan(100)

  const config = await selectConfig(page, name)
  const detail = await act(page, 'GET', /\/configs\/\d+$/u, () =>
    config.getByRole('button', { name: '编辑', exact: true }).click(),
  )
  const configPath = new URL(detail.url()).pathname
  const edit = page.getByRole('dialog', { name: '编辑参数', exact: true })
  await expect(edit.getByPlaceholder('请输入参数键值')).toHaveValue('备份值')
  await edit.getByPlaceholder('请输入参数键值').fill('回滚值')
  await act(page, 'PUT', configPath, () =>
    edit.getByRole('button', { name: '确定', exact: true }).click(),
  )

  await page.getByRole('menuitem', { name: '配置迁移', exact: true }).click()
  await page.getByRole('button', { name: '上传配置包', exact: true }).click()
  const upload = page.getByRole('dialog', { name: '上传配置包', exact: true })
  await upload.locator('input[type=file]').setInputFiles({
    name: `${name}.ryframe-config.zip`,
    mimeType: 'application/zip',
    buffer: await readFile(output),
  })
  const created = await act(page, 'POST', '/api/v1/system/config-transfers/upload', () =>
    upload.getByRole('button', { name: '上传并创建迁移', exact: true }).click(),
  )
  const transferId: string = (await created.json()).data.id
  const plan = page.locator('.plan-card')
  await act(page, 'POST', /\/config-transfers\/\d+\/preview$/u, () =>
    plan.getByRole('button', { name: '执行预览', exact: true }).click(),
  )
  await expect(plan.getByRole('button', { name: '应用配置', exact: true })).toBeVisible({
    timeout: 90_000,
  })
  await plan.getByRole('button', { name: '应用配置', exact: true }).click()
  await act(page, 'POST', /\/config-transfers\/\d+\/apply$/u, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await selectLatestTransfer(page, transferId, '已应用')
  const verification = await page.context().newPage()
  const verificationDiagnostics = observeDiagnostics(verification)
  await expect(await selectConfig(verification, name)).toContainText('备份值')
  await expectCleanDiagnostics(verification, verificationDiagnostics)
  await verification.close()
  await plan.getByRole('button', { name: '回滚', exact: true }).click()
  await act(page, 'POST', /\/config-transfers\/\d+\/rollback$/u, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await selectLatestTransfer(page, transferId, '已回滚')
  await expect(await selectConfig(page, name, true)).toContainText('回滚值')
  await config.getByRole('button', { name: '删除', exact: true }).click()
  await act(page, 'DELETE', configPath, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(config).toHaveCount(0)
  await expectCleanDiagnostics(page, diagnostics)
})
