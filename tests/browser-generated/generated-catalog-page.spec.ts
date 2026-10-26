import { expect } from '@playwright/test'
import { test } from '../browser-real/fixture'
import { credentials, isolatedName, login } from '../browser-real/support'
import { observeSession } from '../browser-real/session-observation'
import { observeRequestBudget } from '../browser-real/request-budget'
import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import {
  catalogPath,
  createCatalog,
  deleteCatalog,
  editCatalog,
  initialMetadata,
  openCatalog,
  precisePayload,
  searchCatalog,
  type CatalogRow,
} from './generated-catalog-page'

test('系统管理员通过生成目录页面完成精确 JSON、可空清除与布尔 CRUD', async ({ page }, info) => {
  expect(credentials.tenantId, '全局目录场景必须使用明确的系统租户配置').toBe('system')
  const diagnostics = observeSession(page)
  const budget = observeRequestBudget(page)
  const code = isolatedName('catalog-ui')
  type Phase =
    'planned' | 'creating' | 'created' | 'editing' | 'deleting' | 'deleted' | 'needs-reconciliation'
  const ownership: {
    phase: Phase
    row?: CatalogRow
    intent?: { operation: string; input?: unknown; before?: CatalogRow }
  } = { phase: 'planned' }
  let sequence = 0
  const save = () =>
    info.attach(`generated-catalog-ownership-${++sequence}`, {
      body: JSON.stringify(
        {
          scope_id: loadRealBrowserEnvironment().scopeId,
          tenant_id: credentials.tenantId,
          resource: 'catalog',
          code,
          ...ownership,
          retained_for_copy: false,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    })
  const registered = async (row: CatalogRow) => {
    ownership.row = row
    ownership.phase = 'created'
    await save()
  }
  const deleting = async () => {
    ownership.intent = { operation: 'delete', before: ownership.row }
    ownership.phase = 'deleting'
    await save()
  }
  let original: unknown
  const failures: unknown[] = []
  try {
    await budget.beforePageBootstrap()
    const signedIn = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/v1/auth/login',
    )
    await login(page)
    expect((await (await signedIn).json()).data.session_context).toMatchObject({
      password_change_required: false,
      is_super_admin: true,
      user: { tenant_id: 'system' },
    })
    await budget.beforePageBootstrap()
    await openCatalog(page)
    const before = await searchCatalog(page, code)
    expect(before.total).toBe(0)
    expect(before.items).toEqual([])
    ownership.intent = {
      operation: 'create',
      input: { code, payload: precisePayload, metadata: initialMetadata, enabled: true },
    }
    ownership.phase = 'creating'
    await save()
    await createCatalog(page, code, registered)
    const created = ownership.row
    if (!created) throw new Error('新增目录响应未登记，保留现场，不猜测 ID')
    const listed = await searchCatalog(page, code)
    expect(listed.total).toBe(1)
    expect(listed.items).toEqual([created])
    await expect(page.locator('.el-table__body tr').filter({ hasText: code })).toContainText(
      precisePayload.unsigned,
    )
    ownership.intent = {
      operation: 'update',
      before: created,
      input: {
        code,
        payload: { ...precisePayload, label: '编辑正文' },
        metadata: null,
        enabled: false,
      },
    }
    ownership.phase = 'editing'
    await save()
    await editCatalog(page, created, registered)
    const updated = ownership.row
    if (!updated) throw new Error('编辑目录响应未登记，保留未知结果')
    await budget.beforeCleanup()
    await deleteCatalog(page, updated, info, deleting)
    ownership.phase = 'deleted'
    await save()
    await info.attach('generated-catalog-behavior', {
      body: JSON.stringify({
        route: '/order/catalog',
        api: catalogPath,
        id_transport: 'string',
        json_unsigned: precisePayload.unsigned,
        metadata_cleared: true,
        enabled_toggled: true,
      }),
      contentType: 'application/json',
    })
  } catch (error) {
    original = error
  } finally {
    if (['creating', 'editing', 'deleting'].includes(ownership.phase))
      ownership.phase = 'needs-reconciliation'
    try {
      await save()
    } catch (error) {
      failures.push(error)
    }
    if (ownership.phase === 'created' && ownership.row) {
      try {
        await budget.beforePageBootstrap()
        await openCatalog(page)
        await budget.beforeCleanup()
        await deleteCatalog(page, ownership.row, info, deleting)
        ownership.phase = 'deleted'
        await save()
      } catch (error) {
        ownership.phase = 'needs-reconciliation'
        failures.push(error)
      }
    }
    try {
      await save()
    } catch (error) {
      failures.push(error)
    }
    try {
      await diagnostics.verify()
    } catch (error) {
      failures.push(error)
    }
  }
  if (original || failures.length)
    throw new AggregateError(
      [...(original ? [original] : []), ...failures],
      '目录页面验收或精确清理失败',
    )
})
