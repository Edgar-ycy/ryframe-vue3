import { expect, test, type Locator, type Page, type Route } from '@playwright/test'
import type { BrowserDiagnostics } from './support/types'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'

test.use({ timezoneId: 'Asia/Shanghai' })

async function openHarness(page: Page, scheduleForm = false): Promise<BrowserDiagnostics> {
  const diagnostics = observeDiagnostics(page)
  const query = scheduleForm ? '?schedule-form' : ''
  await page.goto(`/tests/browser/support/cron-builder-harness.html${query}`)
  await expect(page.locator('.cron-builder')).toBeVisible()
  return diagnostics
}

async function updateHarness(page: Page, type: string, detail: string | boolean): Promise<void> {
  await page.evaluate(
    ({ detail, type }) => window.dispatchEvent(new CustomEvent(type, { detail })),
    { detail, type },
  )
}

async function selectMode(page: Page, builder: Locator, name: string): Promise<void> {
  await builder.locator('.cron-builder__mode').click()
  await page.getByRole('option', { name, exact: true }).click()
}

async function fillNumber(builder: Locator, name: string, value: number): Promise<void> {
  const input = builder.getByRole('spinbutton', { name })
  await input.fill(String(value))
  await input.blur()
}

async function selectOption(page: Page, control: Locator, name: string): Promise<void> {
  await control
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " el-select ")][1]',
    )
    .click()
  await page.getByRole('option', { name, exact: true }).click()
}

async function fulfillPreview(route: Route): Promise<void> {
  await route.fulfill({
    body: JSON.stringify({
      code: 200,
      data: {
        calculated_at: '2026-09-11T00:00:00Z',
        occurrences: [{ schedule_time: '2026-09-12 00:00:00', utc: '2026-09-11T16:00:00Z' }],
        timezone: 'Asia/Shanghai',
      },
      error_key: null,
      message: 'ok',
      request_id: 'cron-builder-browser',
    }),
    contentType: 'application/json',
    status: 200,
  })
}

async function completeRequiredScheduleFields(page: Page): Promise<Locator> {
  const dialog = page.getByRole('dialog', { name: '新增定时任务' })
  await dialog.getByPlaceholder('请输入计划名称').fill('浏览器调度计划')
  await selectOption(page, dialog.getByRole('combobox', { name: /调度目标/u }), '数据清理')
  return dialog
}

test('Cron 构建器逐项编辑间隔、每日和每周规则并回显提交值', async ({ page }) => {
  const diagnostics = await openHarness(page)
  const builder = page.locator('.cron-builder')
  const cronValue = page.getByTestId('cron-value')

  await selectMode(page, builder, '每隔几分钟')
  await fillNumber(builder, '间隔分钟（1～59）', 12)
  await expect(cronValue).toHaveText('0 */12 * * * * *')

  await selectMode(page, builder, '每隔几小时')
  await fillNumber(builder, '间隔小时（1～23）', 3)
  await fillNumber(builder, '在第几分钟执行', 45)
  await expect(cronValue).toHaveText('0 45 */3 * * * *')

  await selectMode(page, builder, '每天')
  await fillNumber(builder, '小时', 23)
  await fillNumber(builder, '分钟', 59)
  await expect(cronValue).toHaveText('0 59 23 * * * *')

  await selectMode(page, builder, '每周')
  await builder.getByText('周五', { exact: true }).click()
  await fillNumber(builder, '小时', 6)
  await fillNumber(builder, '分钟', 5)
  await expect(cronValue).toHaveText('0 5 6 * * MON,FRI *')

  await page.getByTestId('submit-cron').click()
  await expect(page.getByTestId('submitted-cron')).toHaveText('0 5 6 * * MON,FRI *')
  await expectCleanDiagnostics(page, diagnostics)
})

test('Cron 构建器编辑月度、年度和高级规则并显示日期边界提示', async ({ page }) => {
  const diagnostics = await openHarness(page)
  const builder = page.locator('.cron-builder')
  const cronValue = page.getByTestId('cron-value')

  await selectMode(page, builder, '每月')
  await selectOption(page, builder.getByRole('combobox', { name: '选择日期' }), '31')
  await page.keyboard.press('Escape')
  await expect(cronValue).toHaveText('0 0 0 1,31 * * *')
  await expect(
    builder.getByText('选择 29、30 或 31 日时，没有该日期的月份会跳过，不会自动改到月末。'),
  ).toBeVisible()

  await selectMode(page, builder, '每年')
  await selectOption(page, builder.getByRole('combobox', { name: '月份' }), '2 月')
  await selectOption(page, builder.getByRole('combobox', { name: '日期' }), '29')
  await fillNumber(builder, '小时', 8)
  await fillNumber(builder, '分钟', 30)
  await expect(cronValue).toHaveText('0 30 8 29 2 * *')
  await expect(builder.getByText('2 月 29 日只会在闰年执行。')).toBeVisible()

  await selectMode(page, builder, '高级 Cron')
  await builder.getByPlaceholder('例如：0 0 0 * * * *').fill('0 20 14 * * MON-FRI *')
  await expect(cronValue).toHaveText('0 20 14 * * MON-FRI *')
  await page.getByTestId('submit-cron').click()
  await expect(page.getByTestId('submitted-cron')).toHaveText('0 20 14 * * MON-FRI *')
  await expectCleanDiagnostics(page, diagnostics)
})

test('Cron 构建器跟随外部表达式切换交互模式', async ({ page }) => {
  const diagnostics = await openHarness(page)
  const builder = page.locator('.cron-builder')
  await expect(builder.locator('.cron-builder__checks')).toBeVisible()
  await expect(builder.locator('.cron-builder__summary span')).toHaveText('每周一、周三 08:15 执行')

  await updateHarness(page, 'cron-expression', '0 30 6 1,15 * * *')
  await expect(builder.locator('.cron-builder__wide-control')).toBeVisible()
  await expect(builder.locator('.cron-builder__summary span')).toHaveText(
    '每月 1、15 日 06:30 执行',
  )

  await updateHarness(page, 'cron-expression', 'outside-builder')
  await expect(builder.locator('.cron-builder__advanced input')).toHaveValue('outside-builder')
  await expect(
    builder.getByText('该规则超出常用生成器范围，已完整保留并交由服务端校验。'),
  ).toBeVisible()
  await expectCleanDiagnostics(page, diagnostics)
})

test('Cron 构建器在禁用和拒绝覆盖时保持当前表达式', async ({ page }) => {
  const diagnostics = await openHarness(page)
  const builder = page.locator('.cron-builder')
  const cronValue = page.getByTestId('cron-value')
  const initialExpression = '0 15 8 * * MON,WED *'

  await updateHarness(page, 'cron-disabled', true)
  const modeSelect = builder.getByRole('combobox', { name: '执行周期类型' })
  await expect(modeSelect).toBeDisabled()
  const preset = builder.getByRole('button', { name: '每隔 5 分钟' })
  await expect(preset).toBeDisabled()
  await preset.click({ force: true })
  await expect(cronValue).toHaveText(initialExpression)
  await expect(builder.locator('.cron-builder__checks')).toBeVisible()

  const invalidExpression = '0 0 8 1 * MON *'
  await updateHarness(page, 'cron-disabled', false)
  await updateHarness(page, 'cron-expression', invalidExpression)
  await expect(builder.locator('.cron-builder__advanced input')).toHaveValue(invalidExpression)

  await selectMode(page, builder, '每天')
  const confirmation = page.locator('.el-message-box')
  await expect(confirmation.getByText('确认覆盖高级规则')).toBeVisible()
  await confirmation.getByRole('button', { name: 'Cancel' }).click()

  await expect(cronValue).toHaveText(invalidExpression)
  await expect(builder.locator('.cron-builder__advanced input')).toHaveValue(invalidExpression)
  await expectCleanDiagnostics(page, diagnostics)
})

test('定时任务表单提交构建器生成的表达式并回显载荷', async ({ page }) => {
  const previewBodies: unknown[] = []
  await page.route('**/api/v1/monitor/schedules/preview', async (route) => {
    previewBodies.push(route.request().postDataJSON())
    await fulfillPreview(route)
  })
  const diagnostics = await openHarness(page, true)
  const dialog = await completeRequiredScheduleFields(page)

  await expect.poll(() => previewBodies.length).toBe(1)
  await expect(dialog.getByRole('button', { name: '确认保存' })).toBeVisible()
  await dialog.getByRole('button', { name: '确认保存' }).click()

  await expect(page.getByTestId('submitted-schedule')).toContainText(
    '"cron_expression":"0 0 0 * * * *"',
  )
  expect(previewBodies).toEqual([{ cron_expression: '0 0 0 * * * *', timezone: 'Asia/Shanghai' }])
  await expectCleanDiagnostics(page, diagnostics)
})

test('定时任务表单在浏览器内拒绝日期和星期同时受限的表达式', async ({ page }) => {
  let previewRequests = 0
  await page.route('**/api/v1/monitor/schedules/preview', async (route) => {
    previewRequests += 1
    await fulfillPreview(route)
  })
  const diagnostics = await openHarness(page, true)
  const dialog = await completeRequiredScheduleFields(page)
  await expect.poll(() => previewRequests).toBe(1)

  const builder = dialog.locator('.cron-builder')
  await selectMode(page, builder, '高级 Cron')
  await builder.getByPlaceholder('例如：0 0 0 * * * *').fill('0 0 8 1 * MON *')
  await dialog.getByRole('button', { name: '重新计算最近时间' }).click()

  await expect(
    dialog.getByText('Cron 日期字段和星期字段不能同时受限，其中一项必须为 *。'),
  ).toBeVisible()
  await dialog.getByRole('button', { name: '预览并继续' }).click()
  await expect(page.getByTestId('submitted-schedule')).toBeEmpty()
  await expect.poll(() => previewRequests).toBe(1)
  await expectCleanDiagnostics(page, diagnostics)
})
