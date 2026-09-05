import { expect, test } from '@playwright/test'

test('Cron 构建器跟随外部表达式切换交互模式', async ({ page }) => {
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
  const builder = page.locator('.cron-builder')
  await expect(builder).toBeVisible()
  await expect(builder.locator('.cron-builder__checks')).toBeVisible()
  await expect(builder.locator('.cron-builder__summary span')).toHaveText(
    'monitor.schedules.summaryWeekly',
  )

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('cron-expression', { detail: '0 30 6 1,15 * * *' }))
  })
  await expect(builder.locator('.cron-builder__wide-control')).toBeVisible()
  await expect(builder.locator('.cron-builder__summary span')).toHaveText(
    'monitor.schedules.summaryMonthly',
  )

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('cron-expression', { detail: 'outside-builder' }))
  })
  await expect(builder.locator('.cron-builder__advanced input')).toHaveValue('outside-builder')
  await expect(builder.getByText('monitor.schedules.advancedOutsideBuilder')).toBeVisible()
  expect(pageErrors).toEqual([])
})
