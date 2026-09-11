import { expect } from '@playwright/test'
import { test } from '../browser-real/fixture'
import { credentials, login } from '../browser-real/support'
import {
  createTenantWithPlan,
  openTenantDetails,
  verifyDataTargets,
} from '../browser-real/tenant-support'
import { controlWorker, ensureWorkerRunning } from '../browser-real/worker-support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { createDevices, verifyAndDeleteDevices } from './device-support'
import { holdMigrationGate } from './migration-gate'
import {
  assertMigratedDevices,
  createDeviceMigration,
  duringMigrationState,
} from './migration-support'

test('真实 Device 复制阻塞时 Worker 崩溃，重启后同一迁移恢复并完成校验', async ({
  page,
  newClientContext,
  clientAddress,
}, info) => {
  test.setTimeout(300_000)
  info.annotations.push({ type: 'device-scenario', description: 'crash-recovery' })
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
  let gate: Awaited<ReturnType<typeof holdMigrationGate>> | undefined
  try {
    const created = await createDeviceMigration(page, tenant, 'shared-control', 'shared')
    expect(created).toMatchObject({ state: 'prechecking', items: [] })
    gate = await holdMigrationGate(tenant, created.id)
    expect(await controlWorker('start')).toBe('running')
    const blocked = await gate.waitBlocked()
    expect(blocked).toMatchObject({
      migration_id: created.id,
      tenant_id: tenant,
      state: 'copying',
      item_state: 'copying',
      job_status: 'running',
      attempts: 1,
      source_rows: 0,
      target_rows: 0,
      table_name: 'biz_device',
      blocking_connection_id: gate.held.blocking_connection_id,
    })
    expect(blocked.waiting_connection_id).not.toBe(blocked.blocking_connection_id)
    await info.attach('device-worker-copy-gate.json', {
      body: JSON.stringify({ held: gate.held, blocked, names }, null, 2),
      contentType: 'application/json',
    })
    expect(await controlWorker('crash')).toBe('stopped')
    await gate.release()
    // 等待真实租约过期和恢复轮询；不更改数据库租约，也不缩短产品超时。
    const [migration] = await duringMigrationState(page, tenant, 'retention_pending', () =>
      controlWorker('start'),
    )
    expect(migration.id).toBe(created.id)
    await assertMigratedDevices(page, migration, 'shared')
    const after = await owner.newPage()
    const afterDiagnostics = observeDiagnostics(after)
    await verifyAndDeleteDevices(after, names)
    await expectCleanDiagnostics(after, afterDiagnostics)
    await expectCleanDiagnostics(page, diagnostics)
    await after.close()
    await info.attach('device-worker-recovered.json', {
      body: JSON.stringify({ created, migration, names }, null, 2),
      contentType: 'application/json',
    })
  } finally {
    try {
      await gate?.release()
    } finally {
      await ensureWorkerRunning()
    }
  }
})
