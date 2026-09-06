import { expect } from '@playwright/test'
import { test } from '../browser-real/fixture'
import { act, credentials, login } from '../browser-real/support'
import {
  createTenantWithPlan,
  openTenantDetails,
  verifyDataTargets,
} from '../browser-real/tenant-support'
import { controlWorker, ensureWorkerRunning } from '../browser-real/worker-support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { createDevices, verifyAndDeleteDevices, verifyDevices } from './device-support'
import { createDeviceMigration, duringMigrationState, migrateDevices } from './migration-support'

test('真实排队 Device 迁移取消恢复源数据，并允许再次迁移', async ({
  page,
  newClientContext,
  clientAddress,
}, info) => {
  test.setTimeout(300_000)
  const diagnostics = observeDiagnostics(page)
  await login(page)
  await verifyDataTargets(page, ['shared'])
  const { tenant } = await createTenantWithPlan(page)
  const owner = await newClientContext(clientAddress.replace('198.18.', '198.19.'))
  const business = await owner.newPage()
  const beforeDiagnostics = observeDiagnostics(business)
  await login(business, {
    ...credentials,
    tenantId: tenant,
    username: 'owner',
    password: 'Valid!Owner123',
  })
  const names = await createDevices(business)
  await expectCleanDiagnostics(business, beforeDiagnostics)
  await business.close()
  await openTenantDetails(page, tenant)
  await controlWorker('stop')
  try {
    const created = await createDeviceMigration(page, tenant, 'shared-control', 'shared')
    expect(created).toMatchObject({
      state: 'prechecking',
      can_cancel: true,
      cancel_requested: false,
      prechecked_at: created.created_at,
      copy_started_at: null,
      copy_completed_at: null,
      items: [],
    })
    const detail = page.getByRole('dialog', { name: '迁移任务详情', exact: true })
    await detail.getByRole('button', { name: '取消', exact: true }).click()
    const accepted = await act(
      page,
      'POST',
      `/api/v1/platform/tenant-data-migrations/${created.id}/cancel`,
      () =>
        page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
    )
    expect((await accepted.json()).data).toMatchObject({
      id: created.id,
      cancel_requested: true,
      state: 'prechecking',
    })
    const [cancelled] = await duringMigrationState(page, tenant, 'cancelled', () =>
      controlWorker('start'),
    )
    expect(cancelled).toMatchObject({
      id: created.id,
      can_cancel: false,
      can_finalize: false,
      error_code: null,
      copy_started_at: null,
      copy_completed_at: null,
      items: [],
    })
    await detail.getByRole('button', { name: '关闭', exact: true }).click()
    const reloaded = await act(page, 'GET', '/api/v1/platform/tenants/page', () => page.reload())
    expect(await reloaded.finished()).toBeNull()
    await expect(page.locator('.tenant-table .el-loading-mask')).toBeHidden()
    await openTenantDetails(page, tenant)
    const placement = await act(
      page,
      'GET',
      `/api/v1/platform/tenants/${tenant}/data-placement`,
      () => page.getByRole('tab', { name: '数据放置与迁移', exact: true }).click(),
    )
    expect((await placement.json()).data).toMatchObject({
      current_target_key: 'shared-control',
      state: 'active',
      placement_generation: created.source_generation,
    })
    const restored = await owner.newPage()
    const restoredDiagnostics = observeDiagnostics(restored)
    await verifyDevices(restored, names)
    await expectCleanDiagnostics(restored, restoredDiagnostics)
    await restored.close()
    const migrated = await migrateDevices(page, tenant, 'shared-control', 'shared')
    expect(migrated.id).not.toBe(cancelled.id)
    const after = await owner.newPage()
    const afterDiagnostics = observeDiagnostics(after)
    await verifyAndDeleteDevices(after, names)
    await expectCleanDiagnostics(after, afterDiagnostics)
    await expectCleanDiagnostics(page, diagnostics)
    await after.close()
    await info.attach('device-cancellation.json', {
      body: JSON.stringify({ created, cancelled, migrated, names }, null, 2),
      contentType: 'application/json',
    })
  } finally {
    await ensureWorkerRunning()
  }
})
