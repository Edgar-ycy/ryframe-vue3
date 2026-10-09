import { test } from '../browser-real/fixture'
import { credentials, login } from '../browser-real/support'
import {
  createTenantWithPlan,
  openTenantDetails,
  verifyDataTargets,
} from '../browser-real/tenant-support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { createOrders, verifyAndDeleteOrders } from './business-support'
import { verifyHistoricalRetention } from './migration-retention'
import { migrateOrders } from './migration-support'

for (const [source, target] of [
  ['shared-control', 'shared'],
  ['dedicated-a', 'dedicated-b'],
]) {
  test(`真实业务数据从 ${source} 复制校验并切换到 ${target}`, async ({
    page,
    newClientContext,
    clientAddress,
  }, info) => {
    info.annotations.push({
      type: 'business-scenario',
      description: source === 'shared-control' ? 'shared-migration' : 'dedicated-migration',
    })
    if (source === 'dedicated-a')
      info.annotations.push({ type: 'business-scenario', description: 'retention' })
    test.setTimeout(source === 'dedicated-a' ? 420_000 : 240_000)
    const diagnostics = observeDiagnostics(page)
    await login(page)
    await verifyDataTargets(page, ['shared', 'dedicated-a', 'dedicated-b'])
    const { tenant } = await createTenantWithPlan(page, source)
    const owner = await newClientContext(clientAddress.replace('198.18.', '198.19.'))
    const business = await owner.newPage()
    const businessDiagnostics = observeDiagnostics(business)
    await login(business, {
      ...credentials,
      tenantId: tenant,
      username: 'owner',
      password: 'Valid!Owner123',
    })
    const names = await createOrders(business)
    await expectCleanDiagnostics(business, businessDiagnostics)
    await business.close()
    await openTenantDetails(page, tenant)
    const migration = await migrateOrders(page, tenant, source, target)
    if (source === 'dedicated-a') await verifyHistoricalRetention(page, tenant, migration, info)
    await info.attach('business-migration.json', {
      body: JSON.stringify({ migration, names }, null, 2),
      contentType: 'application/json',
    })
    const after = await owner.newPage()
    const afterDiagnostics = observeDiagnostics(after)
    await verifyAndDeleteOrders(after, names)
    await expectCleanDiagnostics(after, afterDiagnostics)
    await expectCleanDiagnostics(page, diagnostics)
    await after.close()
  })
}
