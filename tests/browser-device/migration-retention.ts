import { expect, type Page, type Response, type TestInfo } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import type { TenantDataMigration } from '@/api/modules/tenantData'
import { isolatedOrigin } from '../browser-real/network'
import { act } from '../browser-real/support'
import { controlWorker, ensureWorkerRunning } from '../browser-real/worker-support'
import { migrationHistory, record } from './migration-history'
import { duringMigrationState } from './migration-support'

async function openDetail(page: Page, migration: string) {
  const dialog = page.getByRole('dialog', { name: '迁移任务详情', exact: true })
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(dialog).not.toBeVisible()
  }
  const row = page.locator('.migration-table .el-table__body tr').filter({ hasText: migration })
  const response = await act(
    page,
    'GET',
    `/api/v1/platform/tenant-data-migrations/${migration}`,
    () => row.getByRole('button', { name: '详情', exact: true }).click(),
  )
  const data: TenantDataMigration = (await response.json()).data
  return { dialog, response, data }
}

async function rejectedFinalize(page: Page, response: Response) {
  const url = new URL(response.url())
  expect(url.origin).toBe(isolatedOrigin(page.url()))
  // 复用刚刚完成的真实管理员请求头，凭据只留内存，不写入 fixture/附件。
  const observed = await response.request().allHeaders()
  const headers = Object.fromEntries(
    Object.entries(observed).filter(([name]) =>
      ['authorization', 'x-tenant-id', 'x-forwarded-for', 'accept-language'].includes(name),
    ),
  )
  if (!headers.authorization || headers['x-tenant-id'] !== 'system') {
    throw new Error('未取得本次系统租户管理员的请求上下文')
  }
  const result = await page.request.post(`${url.href}/finalize`, {
    headers: { ...headers, 'Idempotency-Key': `retention-reject-${randomUUID()}` },
    maxRedirects: 0,
  })
  expect(result.status(), '服务端必须独立拒绝尚不满足清理条件的请求').toBe(409)
  await result.dispose()
}

async function waitForCompletedJob(tenant: string, migration: string) {
  await expect
    .poll(
      async () => {
        const result = await migrationHistory('inspect', tenant, migration)
        return record(result.snapshot).job_status
      },
      { timeout: 30_000 },
    )
    .toBe('succeeded')
}

export async function verifyHistoricalRetention(
  page: Page,
  tenant: string,
  migration: TenantDataMigration,
  info: TestInfo,
) {
  const current = await openDetail(page, migration.id)
  expect(current.data.action_reasons).toContain('retention_period_not_elapsed')
  await expect(current.dialog.getByRole('button', { name: '完成清理', exact: true })).toBeDisabled()
  await rejectedFinalize(page, current.response)
  await waitForCompletedJob(tenant, migration.id)
  await controlWorker('stop')
  try {
    const planned = await migrationHistory('plan-history', tenant, migration.id)
    expect(planned).toMatchObject({
      state: 'history-planned',
      shift_hours: 169,
      retention_hours: 168,
    })
    const planSha = planned.plan_sha256
    if (typeof planSha !== 'string' || !/^[a-f0-9]{64}$/u.test(planSha)) {
      throw new Error('历史状态只读计划缺少有效 SHA256')
    }
    const observed = await migrationHistory('inspect', tenant, migration.id)
    const expected = record(planned.before)
    const actual = record(observed.snapshot)
    for (const key of Object.keys(expected).filter((field) => field !== 'remaining_seconds')) {
      expect(actual[key], `只读计划不应更改 ${key}`).toEqual(expected[key])
    }
    await info.attach('device-retention-plan.json', {
      body: JSON.stringify(planned, null, 2),
      contentType: 'application/json',
    })
    const historical = await migrationHistory('historical-expired', tenant, migration.id, planSha)
    expect(historical).toMatchObject({
      state: 'historical-expired',
      artificial_history: true,
      natural_elapsed_7_days: false,
      shift_hours: 169,
      retention_hours: 168,
    })
    await info.attach('device-retention-artificial-history.json', {
      body: JSON.stringify(historical, null, 2),
      contentType: 'application/json',
    })
    const expired = await openDetail(page, migration.id)
    expect(expired.data.retention_hours).toBe(168)
    expect(expired.data.action_reasons).not.toContain('retention_period_not_elapsed')
    expect(expired.data.action_reasons).toContain('validated_backup_required')
    await expect(
      expired.dialog.getByRole('button', { name: '完成清理', exact: true }),
    ).toBeDisabled()
    await rejectedFinalize(page, expired.response)
    const exported = await migrationHistory('export-backup', tenant, migration.id)
    expect(exported).toMatchObject({
      state: 'backup-exported',
      artificial_history: true,
      natural_elapsed_7_days: false,
      restored: false,
    })
    await info.attach('device-retention-real-export.json', {
      body: JSON.stringify(exported, null, 2),
      contentType: 'application/json',
    })
    const eligible = await openDetail(page, migration.id)
    expect(eligible.data.can_finalize).toBe(true)
    await eligible.dialog.getByRole('button', { name: '完成清理', exact: true }).click()
    const accepted = await act(
      page,
      'POST',
      `/api/v1/platform/tenant-data-migrations/${migration.id}/finalize`,
      () =>
        page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
    )
    expect((await accepted.json()).data).toMatchObject({
      id: migration.id,
      finalize_requested: true,
    })
    const [finalized] = await duringMigrationState(page, tenant, 'finalized', () =>
      controlWorker('start'),
    )
    expect(finalized).toMatchObject({ id: migration.id, retention_hours: 168, can_finalize: false })
    expect(finalized.items[0]).toMatchObject({
      table_name: 'biz_device',
      cleanup_state: 'cleaned',
      cleanup_row_count: '3',
    })
    await waitForCompletedJob(tenant, migration.id)
    const proof = await migrationHistory('verify-cleaned', tenant, migration.id)
    expect(proof).toMatchObject({
      state: 'cleaned',
      artificial_history: true,
      natural_elapsed_7_days: false,
      restored: false,
      snapshot: {
        source_count: 0,
        target_count: 3,
        source_fences: 0,
        source_slots: 0,
        target_fence_matches: 1,
        target_slot_matches: 1,
        placement_matches: true,
      },
    })
    await info.attach('device-retention-cleanup.json', {
      body: JSON.stringify({ proof, finalized }, null, 2),
      contentType: 'application/json',
    })
    await eligible.dialog.getByRole('button', { name: '关闭', exact: true }).click()
  } finally {
    await ensureWorkerRunning()
  }
}
