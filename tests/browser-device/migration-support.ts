import { expect, type Page } from '@playwright/test'
import type { TenantDataMigration, TenantDataMigrationState } from '@/api/modules/tenantData'
import { act } from '../browser-real/support'

export async function createDeviceMigration(
  page: Page,
  tenant: string,
  source: string,
  target: string,
) {
  await page.getByRole('tab', { name: '数据放置与迁移', exact: true }).click()
  await page.getByRole('button', { name: '发起迁移', exact: true }).click()
  const wizard = page.getByRole('dialog', { name: '迁移租户数据', exact: true })
  await wizard.getByRole('combobox').click()
  const options = page.getByRole('option').filter({ hasText: target })
  await (target === 'shared' ? options.filter({ hasNotText: 'shared-control' }) : options).click()
  const preview = await act(
    page,
    'POST',
    `/api/v1/platform/tenants/${tenant}/data-migration-previews`,
    () => wizard.getByRole('button', { name: '生成预览', exact: true }).click(),
  )
  expect((await preview.json()).data).toMatchObject({
    source_target_key: source,
    target_target_key: target,
    eligible: true,
    blockers: [],
    impact: { catalog_table_count: 1, stop_write: true, retention_hours: 168 },
  })
  await wizard.getByRole('textbox', { name: '再次输入租户 ID', exact: true }).fill(tenant)
  const response = await act(
    page,
    'POST',
    `/api/v1/platform/tenants/${tenant}/data-migrations`,
    () => wizard.getByRole('button', { name: '创建迁移', exact: true }).click(),
  )
  const migration: TenantDataMigration = (await response.json()).data
  expect(migration).toMatchObject({
    tenant_id: tenant,
    source_target_key: source,
    target_target_key: target,
  })
  return migration
}

export async function duringMigrationState<T>(
  page: Page,
  tenant: string,
  state: TenantDataMigrationState,
  action: () => Promise<T>,
): Promise<[TenantDataMigration, T]> {
  const completed = page.waitForResponse(
    async (response) => {
      if (
        response.request().method() !== 'GET' ||
        !/\/platform\/tenant-data-migrations\/\d+$/u.test(new URL(response.url()).pathname) ||
        response.status() !== 200
      )
        return false
      const data: TenantDataMigration = (await response.json()).data
      return data.tenant_id === tenant && data.state === state
    },
    { timeout: 90_000 },
  )
  const [response, result] = await Promise.all([completed, action()])
  return [(await response.json()).data, result]
}

export async function assertMigratedDevices(
  page: Page,
  migration: TenantDataMigration,
  target: string,
) {
  expect(migration.items).toHaveLength(1)
  expect(migration.items[0]).toMatchObject({
    table_name: 'biz_device',
    state: 'verified',
    source_row_count: '3',
    target_row_count: '3',
    error_code: null,
  })
  expect(migration.items[0]?.source_digest).toMatch(/^[a-f0-9]{64}$/u)
  expect(migration.items[0]?.target_digest).toBe(migration.items[0]?.source_digest)
  expect(migration.can_finalize).toBe(false)
  expect(migration.retention_hours).toBe(168)
  expect(migration.succeeded_at).toBeTruthy()
  expect(migration.retention_until).toBeTruthy()
  expect(
    Date.parse(migration.retention_until ?? '') - Date.parse(migration.succeeded_at ?? ''),
  ).toBe(168 * 60 * 60 * 1000)
  expect(migration.action_reasons).toContain('retention_period_not_elapsed')
  const detail = page.getByRole('dialog', { name: '迁移任务详情', exact: true })
  await expect(detail.locator('.detail-heading')).toContainText('保留期')
  await expect(detail.locator('.el-table__body tr')).toContainText('biz_device')
  await expect(detail.getByRole('button', { name: '完成清理', exact: true })).toBeDisabled()
  await detail.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(detail).not.toBeVisible()
  await expect(
    page.locator('.tenant-data-panel .el-descriptions').getByText(target, { exact: true }),
  ).toBeVisible()
}

export async function migrateDevices(page: Page, tenant: string, source: string, target: string) {
  const [migration, created] = await duringMigrationState(page, tenant, 'retention_pending', () =>
    createDeviceMigration(page, tenant, source, target),
  )
  expect(migration.id).toBe(created.id)
  await assertMigratedDevices(page, migration, target)
  return migration
}
