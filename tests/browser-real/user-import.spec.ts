import { expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { test } from './fixture'
import { createImport } from './import-support'
import { act, isolatedName, login } from './support'

test('真实模板上传、Worker 导入、重复跳过与错误报告', async ({ page }, info) => {
  const username = isolatedName('import')
  const diagnostics = observeDiagnostics(page)
  await login(page)
  const { history, row, fixture } = await createImport(page, info, username, true)
  expect(fixture.bytes).toBeGreaterThan(3 * 1024 * 1024)
  expect(fixture.bytes).toBeLessThan(10 * 1024 * 1024)
  await history.getByRole('button', { name: '关闭此对话框', exact: true }).click()
  await page.getByRole('button', { name: '导入历史', exact: true }).click()
  await expect(row).toContainText('部分完成', { timeout: 90_000 })
  const detail = await act(page, 'GET', /\/user-imports\/\d+$/u, () =>
    row.getByRole('button', { name: '详情', exact: true }).click(),
  )
  expect(await detail.json()).toMatchObject({
    data: {
      status: 'partial',
      success_count: 1,
      skipped_count: 1,
      failure_count: 1,
      total_rows: 3,
    },
  })
  const download = page.waitForEvent('download')
  await row.getByRole('button', { name: '下载错误报告', exact: true }).click()
  const report = info.outputPath('report.xlsx')
  await (await download).saveAs(report)
  const reportContent = await readFile(report)
  expect(reportContent.byteLength).toBeGreaterThan(100)
  expect(reportContent.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  await expectCleanDiagnostics(page, diagnostics)
})
