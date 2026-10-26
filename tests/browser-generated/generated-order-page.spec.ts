import { expect } from '@playwright/test'
import { test } from '../browser-real/session-fixture'
import { act, credentials, isolatedName } from '../browser-real/support'
import { setRolePermissions } from '../browser-real/session-identities'
import { observeSession, watchCancellationToasts } from '../browser-real/session-observation'
import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import { prepareOrderUsers } from './generated-order-identities'
import {
  createOrder,
  deleteOrder,
  editOrder,
  expectOrderDenied,
  openOrders,
  orderPermissions,
  searchOrders,
  type OrderRow,
} from './generated-order-page'

test('生成订单页面精确金额 CRUD、mounted 按钮撤权与同租户 owner 隔离', async ({
  page: admin,
  clientAddress,
  sessionResources,
}, info) => {
  // 完整身份准备和页面切换需等待限流窗口，须为撤权及精确清理保留总执行时间。
  test.setTimeout(600_000)
  const { resources, budget, newContext } = sessionResources
  const prepared = await prepareOrderUsers(admin, newContext, clientAddress, resources, budget)
  const [first, second] = prepared.actors
  if (!first || !second) throw new Error('生成页面验收必须具备两个已登记普通主体')
  const tab = await first.context.newPage()
  budget.observePage(tab)
  const tabDiagnostics = observeSession(tab)
  type Owned = {
    subject: string
    code: string
    phase: 'creating' | 'created' | 'editing' | 'deleting' | 'deleted' | 'needs-reconciliation'
    row?: OrderRow
  }
  const owned: Owned[] = []
  let receipt = 0
  const save = () =>
    info.attach(`generated-order-ownership-${++receipt}`, {
      body: JSON.stringify(
        {
          scope_id: loadRealBrowserEnvironment().scopeId,
          tenant_id: credentials.tenantId,
          identity_receipt: 'session-resources.json',
          retained_for_copy: false,
          orders: owned.map(({ subject, code, phase, row }) => ({ subject, code, phase, row })),
        },
        null,
        2,
      ),
      contentType: 'application/json',
    })
  async function createOwned(actor: NonNullable<typeof first>) {
    const entry: Owned = {
      subject: actor.initial.user.id,
      code: isolatedName('order-page'),
      phase: 'creating',
    }
    owned.push(entry)
    await save()
    const row = await createOrder(
      actor.page,
      entry.code,
      '9007199254740993.123456',
      async (row) => {
        expect(row.id).toMatch(/^[1-9][0-9]*$/u)
        entry.row = row
        entry.phase = 'created'
        await save()
      },
    )
    expect(row).toMatchObject({ tenant_id: credentials.tenantId, owner_id: entry.subject })
    return entry
  }
  let original: unknown
  const cleanupErrors: unknown[] = []
  try {
    await budget.beforePageBootstrap()
    await openOrders(first.page)
    let own = await createOwned(first)
    own.phase = 'editing'
    await save()
    own.row = await editOrder(first.page, own.row!, '9007199254740994.654321')
    own.phase = 'created'
    await save()
    await budget.beforePageBootstrap()
    await openOrders(second.page)
    const other = await createOwned(second)
    const otherBefore = (await searchOrders(second.page, other.code)).items
    expect(otherBefore).toEqual([other.row])
    const foreign = await searchOrders(first.page, other.code)
    expect(foreign.total).toBe(0)
    expect(foreign.items).toEqual([])
    const statuses = await expectOrderDenied(first.page, foreign.response, other.row!, budget)
    expect((await searchOrders(second.page, other.code)).items).toEqual(otherBefore)
    const ownBefore = (await searchOrders(first.page, own.code)).items
    const hidden = await searchOrders(second.page, own.code)
    expect(hidden.total).toBe(0)
    const reverse = await expectOrderDenied(second.page, hidden.response, own.row!, budget)
    expect((await searchOrders(first.page, own.code)).items).toEqual(ownBefore)
    own.phase = 'deleting'
    await save()
    await deleteOrder(first.page, own.row!, info)
    own.phase = 'deleted'
    await save()
    own = await createOwned(first)
    const mountedBefore = (await searchOrders(first.page, own.code)).items
    const target = first.page.locator('.el-table__body tr').filter({ hasText: own.code })
    await expect(target.getByRole('button', { name: '编辑', exact: true })).toBeVisible()
    await expect(target.getByRole('button', { name: '删除', exact: true })).toBeVisible()
    await budget.beforePageBootstrap()
    const baseline = await act(tab, 'POST', '/api/v1/auth/refresh', () => tab.goto('/index'))
    const before = (await baseline.json()).data.session_context
    await first.page.waitForLoadState('networkidle')
    const mounted = await first.page.locator('.page-container').elementHandle()
    expect(mounted).not.toBeNull()
    await budget.beforeAuthorizationChange()
    const cancellationToasts = await watchCancellationToasts(first.page)
    await setRolePermissions(admin, prepared.role, ['order:order:list'], prepared.diagnostics)
    await budget.beforePageBootstrap()
    const refreshed = await act(tab, 'POST', '/api/v1/auth/refresh', () => tab.reload())
    const current = (await refreshed.json()).data.session_context
    expect(current.user.id).toBe(before.user.id)
    expect(current.user.tenant_id).toBe(before.user.tenant_id)
    expect(BigInt(current.authorization_epoch)).toBeGreaterThan(BigInt(before.authorization_epoch))
    expect(current.permissions).toContain('order:order:list')
    for (const permission of orderPermissions.slice(1))
      expect(current.permissions).not.toContain(permission)
    await expect(first.page).toHaveURL(/\/order\/order$/u)
    await expect(
      first.page.locator('.card-header').getByRole('button', { name: '新增', exact: true }),
    ).toHaveCount(0)
    await expect(target.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
    await expect(target.getByRole('button', { name: '删除', exact: true })).toHaveCount(0)
    expect(await mounted!.evaluate((element) => element.isConnected)).toBe(true)
    await mounted!.dispose()
    expect((await searchOrders(first.page, own.code)).items).toEqual(mountedBefore)
    await cancellationToasts()
    await info.attach('generated-order-behavior', {
      body: JSON.stringify({
        same_tenant_denials: statuses,
        reverse_denials: reverse,
        mounted: true,
      }),
      contentType: 'application/json',
    })
  } catch (error) {
    original = error
  } finally {
    for (const entry of owned) {
      if (['creating', 'editing', 'deleting'].includes(entry.phase))
        entry.phase = 'needs-reconciliation'
    }
    try {
      await save()
    } catch (error) {
      cleanupErrors.push(error)
    }
    for (const entry of owned) {
      if (entry.phase !== 'created' || !entry.row) continue
      try {
        await budget.beforePageBootstrap()
        await openOrders(admin)
        await budget.beforeCleanup()
        entry.phase = 'deleting'
        await save()
        await deleteOrder(admin, entry.row, info)
        entry.phase = 'deleted'
        await save()
      } catch (error) {
        entry.phase = 'needs-reconciliation'
        cleanupErrors.push(error)
        try {
          await save()
        } catch (evidenceError) {
          cleanupErrors.push(evidenceError)
        }
      }
    }
    for (const diagnostics of [
      first.diagnostics,
      second.diagnostics,
      tabDiagnostics,
      prepared.diagnostics,
    ]) {
      try {
        await diagnostics.verify()
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
    try {
      await save()
    } catch (error) {
      cleanupErrors.push(error)
    }
  }
  if (original || cleanupErrors.length)
    throw new AggregateError(
      [...(original ? [original] : []), ...cleanupErrors],
      '订单页面验收或精确清理失败',
    )
})
