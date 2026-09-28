import { test } from './fixture'
import { expect } from '@playwright/test'
import { readFile, stat } from 'node:fs/promises'
import { act, isolatedName, login } from './support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { inspectExportArtifact, verifyDownloadedExportContent } from './artifact-support'
import type { ExportJob } from '@/api/modules/exportJob'

test('真实岗位增改查删、已应用筛选导出、Worker 下载与删除', async ({ page }, info) => {
  const name = isolatedName('岗位')
  const code = isolatedName('post')
  const diagnostics = observeDiagnostics(page)
  await login(page)
  await act(page, 'GET', '/api/v1/system/posts', () => page.goto('/system/post'))
  await page.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
  const add = page.getByRole('dialog', { name: '新增岗位', exact: true })
  await add.getByPlaceholder('请输入岗位名称').fill(name)
  await add.getByPlaceholder('请输入岗位编码').fill(code)
  await add.getByRole('spinbutton').fill('12')
  await act(page, 'POST', '/api/v1/system/posts', () =>
    add.getByRole('button', { name: '确定', exact: true }).click(),
  )
  await act(page, 'GET', '/api/v1/system/posts', async () => {
    await page.getByPlaceholder('请输入或选择岗位名称').fill(name)
    await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  })
  const row = page.locator('.el-table__body tr').filter({ hasText: code })
  await expect(row).toHaveCount(1)
  const detail = await act(page, 'GET', /\/system\/posts\/\d+$/u, () =>
    row.getByRole('button', { name: '编辑', exact: true }).click(),
  )
  const resourcePath = new URL(detail.url()).pathname
  const edit = page.getByRole('dialog', { name: '编辑岗位', exact: true })
  await expect(edit.getByPlaceholder('请输入岗位编码')).toBeDisabled()
  await expect(edit.getByPlaceholder('请输入岗位名称')).toHaveValue(name)
  const updatedName = `${name}-修改`
  await edit.getByPlaceholder('请输入岗位名称').fill(updatedName)
  await edit.getByRole('spinbutton').fill('18')
  await act(page, 'PUT', resourcePath, () =>
    edit.getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(row).toContainText(updatedName)

  await act(page, 'GET', '/api/v1/system/posts', async () => {
    await page.getByPlaceholder('请输入或选择岗位名称').fill(updatedName)
    await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  })
  await expect(row).toHaveCount(1)

  // 输入未应用的条件，导出仍必须使用上一次成功查询。
  await page.getByPlaceholder('请输入或选择岗位名称').fill('未应用条件')
  const exported = await act(page, 'POST', '/api/v1/system/posts/exports', () =>
    page.locator('.card-header').getByRole('button', { name: '导出', exact: true }).click(),
  )
  expect(exported.request().postDataJSON()).toEqual({
    confirm_all: false,
    filter: { name: updatedName },
  })
  const jobId: string = (await exported.json()).data.id
  await act(page, 'GET', '/api/v1/common/jobs', () => page.goto('/profile/exports'))
  let fileName = ''
  await expect
    .poll(
      async () => {
        const response = await act(page, 'GET', '/api/v1/common/jobs', () =>
          page.getByRole('button', { name: '刷新导出任务', exact: true }).click(),
        )
        const items: ExportJob[] = (await response.json()).data
        const job = items.find((item) => item.id === jobId)
        fileName = job?.status === 'succeeded' ? (job.result_file_name ?? '') : ''
        return fileName
      },
      { timeout: 90_000 },
    )
    .not.toBe('')
  const completed = page
    .locator('.exports-desktop')
    .getByRole('row')
    .filter({
      has: page.getByText(fileName, { exact: true }),
    })
  await expect(completed).toHaveCount(1)
  await expect(completed.getByRole('button', { name: '下载', exact: true })).toBeEnabled({
    timeout: 90_000,
  })
  const downloadPromise = page.waitForEvent('download')
  await completed.getByRole('button', { name: '下载', exact: true }).click()
  const download = await downloadPromise
  expect(await download.failure()).toBeNull()
  const destination = info.outputPath('posts.xlsx')
  await download.saveAs(destination)
  expect((await stat(destination)).size).toBeGreaterThan(100)
  const receipt = info.outputPath('export-artifact.json')
  expect(await inspectExportArtifact('snapshot', jobId, receipt)).toBe('present')
  verifyDownloadedExportContent(await readFile(receipt, 'utf8'), jobId, await readFile(destination))
  await completed.getByRole('button', { name: '删除', exact: true }).click()
  const deleted = await act(page, 'POST', '/api/v1/common/jobs/deletions', () =>
    page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click(),
  )
  expect(deleted.request().postDataJSON()).toEqual({ ids: [jobId] })
  expect(deleted.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/u)
  await expect(completed).toHaveCount(0)
  await expect
    .poll(() => inspectExportArtifact('verify-deleted', jobId, receipt), { timeout: 45_000 })
    .toBe('deleted')

  await act(page, 'GET', '/api/v1/system/posts', () => page.goto('/system/post'))
  await act(page, 'GET', '/api/v1/system/posts', async () => {
    await page.getByPlaceholder('请输入或选择岗位名称').fill(updatedName)
    await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  })
  await row.getByRole('button', { name: '删除', exact: true }).click()
  await act(page, 'DELETE', resourcePath, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(row).toHaveCount(0)
  await expectCleanDiagnostics(page, diagnostics)
  info.annotations.push(
    { type: 'restore-scenario', description: 'post' },
    { type: 'restore-scenario', description: 'export' },
  )
})
