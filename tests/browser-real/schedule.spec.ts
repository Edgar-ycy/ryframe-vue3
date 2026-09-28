import { test } from './fixture'
import { expect } from '@playwright/test'
import { act, isolatedName, login } from './support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

test('真实调度预览、保存、定时与手动执行、历史及删除', async ({ page }, info) => {
  test.setTimeout(180_000)
  const name = isolatedName('计划')
  const diagnostics = observeDiagnostics(page)
  await login(page)
  await act(page, 'GET', '/api/v1/monitor/schedules', () => page.goto('/monitor/schedules'))
  await page.getByRole('button', { name: '新增计划', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增定时任务', exact: true })
  await dialog.getByPlaceholder('请输入计划名称').fill(name)
  await dialog.getByRole('combobox', { name: /调度目标/u }).click()
  await page.getByRole('option', { name: /导出结果过期清理/u }).click()
  await dialog
    .locator('.el-select')
    .filter({ has: page.getByRole('combobox', { name: '执行周期类型', exact: true }) })
    .click()
  await page.getByRole('option', { name: '每隔几分钟', exact: true }).click()
  await dialog.getByRole('spinbutton').first().fill('1')
  await dialog.getByRole('spinbutton').first().press('Tab')
  await expect(dialog.getByText('服务端预览已通过', { exact: true })).toBeVisible()
  const created = await act(page, 'POST', '/api/v1/monitor/schedules', () =>
    dialog.getByRole('button', { name: '确认保存', exact: true }).click(),
  )
  expect(created.request().postDataJSON()).toMatchObject({
    name,
    cron_expression: '0 */1 * * * * *',
    enabled: true,
  })
  const scheduleId: string = (await created.json()).data.id
  const schedulePath = `/api/v1/monitor/schedules/${scheduleId}`
  const row = page.locator('.el-table__body tr').filter({ hasText: name })
  await expect(row).toHaveCount(1)
  await row.getByRole('button', { name: '立即执行', exact: true }).click()
  await act(page, 'POST', `${schedulePath}/run`, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await row.getByRole('button', { name: '执行历史', exact: true }).click()
  const history = page.getByRole('dialog').filter({ hasText: name })
  const executions = history.locator('.el-table__body tr')
  for (const trigger of ['立即执行', '正常触发']) {
    await expect
      .poll(
        async () => {
          await act(page, 'GET', `${schedulePath}/executions`, () =>
            history.getByRole('button', { name: '搜索', exact: true }).click(),
          )
          return executions.filter({ hasText: trigger }).filter({ hasText: '已成功' }).count()
        },
        { timeout: 90_000, intervals: [1000] },
      )
      .toBeGreaterThan(0)
  }
  await history.getByRole('button', { name: /close|关闭/iu }).click()
  await row.getByRole('button', { name: '删除', exact: true }).click()
  await act(page, 'DELETE', schedulePath, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(row).toHaveCount(0)
  await expectCleanDiagnostics(page, diagnostics)
  info.annotations.push({ type: 'restore-scenario', description: 'schedule' })
})
