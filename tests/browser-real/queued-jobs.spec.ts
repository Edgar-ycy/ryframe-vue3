import { expect } from '@playwright/test'
import { test } from './fixture'
import { act, isolatedName, login } from './support'
import { controlWorker, ensureWorkerRunning } from './worker-support'
import { createImport } from './import-support'
import type { UserImportJob } from '@/api/modules/userImport'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

test('真实空筛选确认、排队导出取消及 Worker 重启后删除', async ({ page }, info) => {
  const diagnostics = observeDiagnostics(page)
  await login(page)
  await controlWorker('stop')
  try {
    await act(page, 'GET', '/api/v1/system/posts', () => page.goto('/system/post'))
    let submitted = 0
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/v1/system/posts/exports'
      )
        submitted++
    })
    await page.locator('.card-header').getByRole('button', { name: '导出', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: '确认导出全部数据', exact: true })
    await expect(confirmation).toBeVisible()
    expect(submitted).toBe(0)
    const created = await act(page, 'POST', '/api/v1/system/posts/exports', () =>
      confirmation.getByRole('button', { name: '继续导出', exact: true }).click(),
    )
    expect(created.request().postDataJSON()).toEqual({ confirm_all: true, filter: {} })
    const job = (await created.json()).data
    expect(job.status).toBe('queued')
    await page.goto('/profile/exports')
    const row = page.locator('.exports-desktop .el-table__body tr').filter({ hasText: '排队中' })
    await expect(row).toHaveCount(1)
    await row.getByRole('button', { name: '取消任务', exact: true }).click()
    const cancelled = await act(page, 'POST', `/api/v1/common/jobs/${job.id}/cancel`, () =>
      page
        .locator('.el-message-box')
        .getByRole('button', { name: '取消任务', exact: true })
        .click(),
    )
    expect((await cancelled.json()).data).toMatchObject({ id: job.id, status: 'cancelled' })
    await controlWorker('start')
    await page.reload()
    const terminal = page
      .locator('.exports-desktop .el-table__body tr')
      .filter({ hasText: '已取消' })
    await expect(terminal).toHaveCount(1)
    await expect(terminal.getByRole('button', { name: '下载', exact: true })).toHaveCount(0)
    await terminal.getByRole('button', { name: '删除', exact: true }).click()
    await act(page, 'POST', '/api/v1/common/jobs/deletions', () =>
      page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click(),
    )
    await expect(terminal).toHaveCount(0)
    await info.attach('queued-export.json', {
      body: JSON.stringify({ id: job.id, submitted }),
      contentType: 'application/json',
    })
    await expectCleanDiagnostics(page, diagnostics)
  } finally {
    await ensureWorkerRunning()
  }
})

test('真实排队导入取消在 Worker 重启后生效且不创建用户', async ({ page }, info) => {
  const diagnostics = observeDiagnostics(page)
  const username = isolatedName('import')
  await login(page)
  await controlWorker('stop')
  try {
    const { history, row, created } = await createImport(page, info, username)
    const job = (await created.json()).data
    expect(job.status).toBe('pending')
    await row.getByRole('button', { name: '取消任务', exact: true }).click()
    const cancelled = await act(page, 'POST', `/api/v1/system/user-imports/${job.id}/cancel`, () =>
      page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
    )
    expect((await cancelled.json()).data).toMatchObject({
      cancel_requested: true,
      processed_rows: 0,
    })
    await controlWorker('start')
    await expect
      .poll(
        async () => {
          const response = await act(page, 'GET', '/api/v1/system/user-imports', () =>
            history.getByRole('button', { name: '刷新', exact: true }).click(),
          )
          const items: UserImportJob[] = (await response.json()).data.items
          const value = items.find((item) => item.id === job.id)
          expect(value).toMatchObject({
            processed_rows: 0,
            success_count: 0,
            report_available: false,
          })
          return value?.status
        },
        { timeout: 30_000 },
      )
      .toBe('cancelled')
    await history.getByRole('button', { name: '关闭此对话框', exact: true }).click()
    await page.getByPlaceholder('用户名').fill(username)
    const listed = await act(page, 'GET', '/api/v1/system/users', () =>
      page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click(),
    )
    expect((await listed.json()).data.total).toBe(0)
    await expectCleanDiagnostics(page, diagnostics)
  } finally {
    await ensureWorkerRunning()
  }
})
