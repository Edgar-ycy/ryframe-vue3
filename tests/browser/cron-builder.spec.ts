import { expect, test, type Page } from '@playwright/test'

async function openHarness(page: Page): Promise<string[]> {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.route('**/cron-builder-harness', async (route) => {
    await route.fulfill({
      body: `<!doctype html>
        <html lang="zh-CN">
          <head><meta charset="UTF-8" /><title>Cron builder harness</title></head>
          <body>
            <div id="app"></div>
            <script type="module" src="/tests/browser/support/cronBuilderHarness.ts"></script>
          </body>
        </html>`,
      contentType: 'text/html',
    })
  })

  await page.goto('/cron-builder-harness')
  await expect(page.locator('.cron-builder')).toBeVisible()
  return pageErrors
}

async function updateHarness(page: Page, type: string, detail: string | boolean): Promise<void> {
  await page.evaluate(
    ({ detail, type }) => window.dispatchEvent(new CustomEvent(type, { detail })),
    { detail, type },
  )
}

test('Cron 构建器跟随外部表达式切换交互模式', async ({ page }) => {
  const pageErrors = await openHarness(page)
  const builder = page.locator('.cron-builder')
  await expect(builder.locator('.cron-builder__checks')).toBeVisible()
  await expect(builder.locator('.cron-builder__summary span')).toHaveText(
    'monitor.schedules.summaryWeekly',
  )

  await updateHarness(page, 'cron-expression', '0 30 6 1,15 * * *')
  await expect(builder.locator('.cron-builder__wide-control')).toBeVisible()
  await expect(builder.locator('.cron-builder__summary span')).toHaveText(
    'monitor.schedules.summaryMonthly',
  )

  await updateHarness(page, 'cron-expression', 'outside-builder')
  await expect(builder.locator('.cron-builder__advanced input')).toHaveValue('outside-builder')
  await expect(builder.getByText('monitor.schedules.advancedOutsideBuilder')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('Cron 构建器在禁用和拒绝覆盖时保持当前表达式', async ({ page }) => {
  const pageErrors = await openHarness(page)
  const builder = page.locator('.cron-builder')
  const cronValue = page.getByTestId('cron-value')
  const initialExpression = '0 15 8 * * MON,WED *'

  await updateHarness(page, 'cron-disabled', true)
  const modeSelect = builder.getByRole('combobox', {
    name: 'monitor.schedules.builderMode',
  })
  await expect(modeSelect).toBeDisabled()
  const preset = builder.getByRole('button', {
    name: 'monitor.schedules.presetEveryFiveMinutes',
  })
  await expect(preset).toBeDisabled()
  await preset.click({ force: true })
  await expect(cronValue).toHaveText(initialExpression)
  await expect(builder.locator('.cron-builder__checks')).toBeVisible()

  const invalidExpression = '0 0 8 1 * MON *'
  await updateHarness(page, 'cron-disabled', false)
  await updateHarness(page, 'cron-expression', invalidExpression)
  await expect(builder.locator('.cron-builder__advanced input')).toHaveValue(invalidExpression)

  await builder.locator('.cron-builder__mode').click()
  await page.getByRole('option', { name: 'monitor.schedules.modeDaily' }).click()
  const confirmation = page.locator('.el-message-box')
  await expect(confirmation.getByText('monitor.schedules.advancedOverwriteTitle')).toBeVisible()
  await confirmation.locator('.el-button').first().click()

  await expect(cronValue).toHaveText(invalidExpression)
  await expect(builder.locator('.cron-builder__advanced input')).toHaveValue(invalidExpression)
  expect(pageErrors).toEqual([])
})
