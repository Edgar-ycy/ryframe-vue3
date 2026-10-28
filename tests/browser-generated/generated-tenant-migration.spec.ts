import { expect } from '@playwright/test'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from '../browser-real/fixture'
import { credentials, login } from '../browser-real/support'
import { observeSession } from '../browser-real/session-observation'
import { observeRequestBudget } from '../browser-real/request-budget'
import { openTenantDetails, verifyDataTargets } from '../browser-real/tenant-support'
import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import { openOrders } from './generated-order-page'
import {
  activateOwner,
  migrateRecorded,
  provisionTenant,
  type TenantReceipt,
} from './generated-tenant-setup'
import {
  readCompleteOrders,
  seedOrders,
  observeMountedOrder,
  type OwnedOrder,
} from './generated-tenant-orders'
import {
  assertTenantIsolation,
  rejectTenantCatalog,
  systemCatalogSnapshot,
} from './generated-tenant-boundaries'

// 写入结果未知时保留原账本，CI 也不能自动重执场景。
test.describe.configure({ retries: 0 })

for (const [source, target] of [
  ['shared-control', 'shared'],
  ['dedicated-a', 'dedicated-b'],
] as const) {
  test(`生成订单 ${source} → ${target} 非空迁移保留同一 owner 会话与完整业务行`, async ({
    page: admin,
    newClientContext,
    clientAddress,
  }, info) => {
    test.setTimeout(600_000)
    expect(credentials.tenantId).toBe('system')
    const budget = observeRequestBudget(admin)
    const diagnostics = [observeSession(admin)]
    const tenants: TenantReceipt[] = []
    const orders: OwnedOrder[] = []
    const migration: { intent?: unknown; created?: unknown; completed?: unknown } = {}
    const boundary: { catalogIntent?: unknown; catalogStatuses?: number[]; isolation?: unknown } =
      {}
    const observedOwners: Awaited<ReturnType<typeof activateOwner>>[] = []
    let mounted: Awaited<ReturnType<typeof observeMountedOrder>> | undefined
    let mountedEvidence:
      Awaited<ReturnType<Awaited<ReturnType<typeof observeMountedOrder>>['read']>> | undefined
    let phase = 'preparing'
    let sequence = 0
    let catalogBefore: Awaited<ReturnType<typeof systemCatalogSnapshot>> | undefined
    const environment = loadRealBrowserEnvironment()
    if (!environment.runId) throw new Error('非空迁移验收必须绑定本次专有 runId')
    const runDirectory = path.resolve(
      '.local-tests/playwright-real/results',
      environment.fixture,
      environment.serverMode,
      environment.runId,
    )
    expect(path.resolve(info.project.outputDir)).toBe(runDirectory)
    const receiptPath = info.outputPath('generated-tenant-ownership.json')
    await mkdir(path.dirname(receiptPath), { recursive: true })
    // 独占保留本次测试的账本路径；已有文件即拒绝，不能覆盖旧运行现场。
    await writeFile(receiptPath, '', { flag: 'wx' })
    let saving = Promise.resolve()
    const save = () => {
      // 在入队前固定完整像，后续对象变化不能改写排队中的写前意图。
      const snapshot =
        JSON.stringify(
          {
            scope_id: environment.scopeId,
            run_id: environment.runId,
            test_id: info.testId,
            retry: info.retry,
            source,
            target,
            phase,
            tenants,
            orders,
            migration,
            boundary,
            mounted_observation: mountedEvidence,
            owner_traffic: observedOwners.map((owner) => owner.traffic.snapshot()),
            retained_for_fixture_teardown: true,
            retention_hours: 168,
            cleanup:
              '保留待主控核对，当前未绑定自动清理消费者；本记录不授权删除，来源按自然保留期及正式 finalize 条件处理',
          },
          null,
          2,
        ) + '\n'
      const attachment = `generated-tenant-ownership-${++sequence}`
      saving = saving.then(async () => {
        await writeFile(`${receiptPath}.tmp`, snapshot, { flag: 'wx' })
        await rename(`${receiptPath}.tmp`, receiptPath)
        await info.attach(attachment, { path: receiptPath, contentType: 'application/json' })
      })
      // 不吞掉或重置拒绝链；写前等待失败后禁止继续远端写入。
      return saving
    }
    const failures: unknown[] = []
    try {
      await budget.beforePageBootstrap()
      await login(admin)
      await budget.beforePageBootstrap()
      await verifyDataTargets(admin, ['shared-control', 'shared', 'dedicated-a', 'dedicated-b'])
      if (source === 'shared-control') {
        catalogBefore = await systemCatalogSnapshot(admin, budget)
        await info.attach('system-catalog-before', {
          body: JSON.stringify(catalogBefore),
          contentType: 'application/json',
        })
      }
      const tenant = await provisionTenant(admin, source, tenants, save, budget)
      const ownerContext = await newClientContext(clientAddress)
      const owner = await activateOwner(ownerContext, tenant, save, budget)
      observedOwners.push(owner)
      diagnostics.push(owner.diagnostics)
      await budget.beforePageBootstrap()
      await openOrders(owner.page)
      const before = await seedOrders(
        owner.page,
        tenant.tenant,
        tenant.owner_id!,
        orders,
        save,
        budget,
        3,
      )
      await readCompleteOrders(owner.page, before)
      await info.attach('generated-order-migration-before', {
        body: JSON.stringify({ tenant: tenant.tenant, owner: tenant.owner_id, rows: before }),
        contentType: 'application/json',
      })
      if (source === 'shared-control') {
        const second = await provisionTenant(admin, 'shared-control', tenants, save, budget)
        const secondContext = await newClientContext(clientAddress)
        const otherOwner = await activateOwner(secondContext, second, save, budget)
        observedOwners.push(otherOwner)
        diagnostics.push(otherOwner.diagnostics)
        await budget.beforePageBootstrap()
        await openOrders(otherOwner.page)
        const other = await seedOrders(
          otherOwner.page,
          second.tenant,
          second.owner_id!,
          orders,
          save,
          budget,
          1,
        )
        if (!other[0]) throw new Error('第二租户业务完整响应未登记')
        boundary.isolation = await assertTenantIsolation(
          owner.page,
          otherOwner.page,
          before,
          other[0],
          budget,
        )
        boundary.catalogStatuses = await rejectTenantCatalog(owner.page, budget, async (intent) => {
          boundary.catalogIntent = intent
          await save()
        })
        await save()
      }
      await budget.beforeProvisioning()
      await openTenantDetails(admin, tenant.tenant)
      mounted = await observeMountedOrder(owner.page)
      mountedEvidence = await mounted.read()
      expect(mountedEvidence.points.at(-1)).toMatchObject({
        maintenance: false,
        banner: '',
        root_connected: true,
        writes: [1, 3, 3],
      })
      phase = 'migrating'
      await save()
      const completed = await migrateRecorded(admin, tenant.tenant, source, target, migration, save)
      expect(completed.state).toBe('retention_pending')
      await expect
        .poll(() => owner.traffic.latest()?.business_data)
        .toEqual({ state: 'active', placement_generation: completed.target_generation })
      await mounted.assertRestored()
      // 不关闭、刷新或重新登录 owner；直接在原页面以原会话读取切换后的业务目标。
      await budget.beforeCleanup()
      const after = await readCompleteOrders(owner.page, before)
      await info.attach('generated-order-migration-after', {
        body: JSON.stringify({
          tenant: tenant.tenant,
          owner: tenant.owner_id,
          rows: after.items,
          same_page: true,
          same_browser_context: true,
          observation: '原页面及已有浏览器上下文的 HTTP 全行核对，不证明 Redis 物理缓存版本',
          migration_id: completed.id,
        }),
        contentType: 'application/json',
      })
      phase = 'verified-retained'
    } catch (error) {
      phase = 'failed-retained'
      for (const tenant of tenants) {
        if (tenant.phase === 'activating-owner') tenant.phase = 'owner-needs-reconciliation'
      }
      failures.push(error)
    } finally {
      if (mounted) {
        try {
          mountedEvidence = await mounted.stop()
        } catch (error) {
          failures.push(error)
        }
      }
      for (const owner of observedOwners) {
        try {
          owner.traffic.stop()
          await owner.traffic.flush()
          const traffic = owner.traffic.snapshot()
          expect(traffic.overflow).toBe(false)
          expect(traffic.failures).toEqual([])
        } catch (error) {
          failures.push(error)
        }
      }
      // 任何未知写入只留证据；不重放、不按前缀删除、不跳过保留期 finalize。
      try {
        await save()
      } catch (error) {
        failures.push(error)
      }
      if (catalogBefore !== undefined) {
        try {
          const after = await systemCatalogSnapshot(admin, budget)
          await info.attach('system-catalog-after', {
            body: JSON.stringify(after),
            contentType: 'application/json',
          })
          expect(after).toEqual(catalogBefore)
        } catch (error) {
          failures.push(error)
        }
      }
      for (const collector of diagnostics) {
        try {
          await collector.verify()
        } catch (error) {
          failures.push(error)
        }
      }
      try {
        await save()
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length)
      throw new AggregateError(failures, '生成业务租户边界或非空迁移失败，登记资源保留供精确核对')
  })
}
