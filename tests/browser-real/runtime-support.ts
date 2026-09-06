import { expect, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFile } from 'node:fs/promises'
import type { RuntimeStatus } from '../../src/api/modules/monitor'
import { act } from './support'

export async function verifyRuntimeBackup(page: Page, info: TestInfo): Promise<void> {
  const response = await act(page, 'GET', '/api/v1/monitor/runtime', () =>
    page.goto('/monitor/runtime'),
  )
  const body: { data: RuntimeStatus } = await response.json()
  const backup = body.data.backup
  expect(backup).toMatchObject({ collector_status: 'available', available: true })
  expect(Date.parse(backup.last_success_at ?? '')).toBeGreaterThan(0)
  const health = backup.health
  if (!health) throw new Error('真实运行状态缺少备份采集快照')
  expect(health.required_resources).toBeGreaterThan(0)

  const card = page.locator('.runtime-backup-card')
  await expect(card).toBeVisible()
  await expect(card.getByText('采集正常', { exact: true })).toBeVisible()
  await expect(
    card
      .locator('.runtime-backup-card__summary div')
      .filter({ has: page.getByText('必需资源', { exact: true }) })
      .locator('strong'),
  ).toHaveText(String(health.required_resources))
  await expect(
    card.getByText(new RegExp(`缺失资源：\\s*${health.missing_resources}$`, 'u')),
  ).toBeVisible()
  await expect(card.getByText('异常项', { exact: true })).toBeVisible()

  // 恢复验收读取实际恢复快照；普通新建环境必须明确展示尚未登记的备份与演练。
  if (!process.env.RYFRAME_RESTORE_BINDINGS) {
    expect(health.missing_resources).toBeGreaterThan(0)
    expect(health).toMatchObject({
      oldest_capture: null,
      last_restore_completed: null,
      last_restore_succeeded: false,
      restore_duration_seconds: null,
      recovery_point_age_seconds: null,
      restore_running: 0,
      restore_overdue: 0,
    })
    await expect(card.getByText(/最旧有效备份：\s*—/u)).toBeVisible()
    await expect(card.getByText(/最近恢复演练：\s*—/u)).toBeVisible()
    await expect(card.getByText(/恢复结果：\s*尚无演练/u)).toBeVisible()
    await expect(card.getByText(/恢复结果：\s*成功/u)).toHaveCount(0)
  }
  await verifyCardAccessibility(page, info, 'light')
  if (process.env.RYFRAME_E2E_SERVER === 'preview') {
    const themeSwitch = page.locator('.theme-switch .el-switch__core')
    await themeSwitch.click()
    try {
      await expect(page.locator('html')).toHaveClass(/\bdark\b/u)
      await verifyCardAccessibility(page, info, 'dark')
    } finally {
      await themeSwitch.click()
      await expect(page.locator('html')).not.toHaveClass(/\bdark\b/u)
    }
  }
}

async function verifyCardAccessibility(
  page: Page,
  info: TestInfo,
  theme: 'light' | 'dark',
): Promise<void> {
  const suffix = theme === 'light' ? '' : '-dark'
  // 数据先于加载遮罩退场；遮罩移除后再检查实际卡片背景，不能跳过不确定结果。
  await expect(page.locator('.monitor-page .el-loading-mask')).toHaveCount(0)
  if (process.env.RYFRAME_E2E_SERVER === 'preview') {
    const path = info.outputPath(`runtime-backup${suffix}.png`)
    const card = page.locator('.runtime-backup-card')
    await card.screenshot({ path, animations: 'disabled' })
    await info.attach(`运行时备份与恢复状态 ${theme}`, { path, contentType: 'image/png' })
  }
  const accessibility = await new AxeBuilder({ page }).include('.runtime-backup-card').analyze()
  const report = {
    theme,
    violations: accessibility.violations,
    incompleteContrast: accessibility.incomplete.filter((item) => item.id === 'color-contrast'),
    passingContrast: accessibility.passes.filter((item) => item.id === 'color-contrast'),
  }
  const path = info.outputPath(`runtime-backup-axe${suffix}.json`)
  await writeFile(path, JSON.stringify(report, null, 2), 'utf8')
  await info.attach(`运行时卡片 axe ${theme}`, { path, contentType: 'application/json' })
  expect(report.incompleteContrast, '卡片对比度必须能被明确核验').toEqual([])
  expect(
    report.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'),
  ).toEqual([])
}
