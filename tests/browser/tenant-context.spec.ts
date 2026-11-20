import { expect, test } from '@playwright/test'
import type {
  ProductChangePreview,
  ProductPlan,
  TenantProductContext,
} from '@/api/modules/productPlan'
import { expectNoSeriousAccessibilityViolations } from './support/accessibility'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { fixtureRequest, fulfillJson } from './support/http'
import { loginWithFixture, openSidebarPage } from './support/navigation'
import { createSessionContext } from './support/sessionFixture'

test('系统租户会话进入租户容量页并携带租户上下文', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const { tenantRequestContexts } = await installApiFixture(page, diagnostics, {
    multiTenancyEnabled: true,
    tenantId: 'system',
  })

  await loginWithFixture(page)
  await openSidebarPage(page, '平台管理', '租户管理')
  await expect(page).toHaveURL(/\/platform\/tenants$/u)
  await expect(page.getByRole('heading', { name: '租户容量管理' })).toBeVisible()
  await expect(page.getByText('默认租户', { exact: true }).first()).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '租户容量页')

  const tenant = page.locator('.tenant-table .el-table__body tr').filter({ hasText: '默认租户' })
  const detailResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/platform/tenants/default',
  )
  await tenant.getByRole('button', { name: '详情', exact: true }).click()
  expect((await detailResponse).ok()).toBe(true)
  const drawer = page.getByRole('dialog', { name: '租户容量详情', exact: true })
  await expect(drawer.getByRole('heading', { name: '默认租户', exact: true })).toBeVisible()
  const statusTags = drawer.locator('.tenant-heading__tags')
  await expect(statusTags.getByText('启用', { exact: true })).toBeVisible()
  await expect(statusTags.getByText('永不过期', { exact: true })).toBeVisible()
  await expect(statusTags.getByText('正常', { exact: true })).toBeVisible()
  await expect(drawer.getByRole('region', { name: '配额配置', exact: true })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page, '租户容量详情')
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()

  expect(tenantRequestContexts.length).toBeGreaterThan(0)
  for (const context of tenantRequestContexts) {
    expect(context.authorization).toBe('Bearer access-token-smoke')
    expect(context.tenantId).toBe('system')
  }
  await expectCleanDiagnostics(page, diagnostics)
})

test('重复提交当前套餐时提示成功并沿用当前上下文', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const options = { multiTenancyEnabled: true, tenantId: 'system' } as const
  await installApiFixture(page, diagnostics, options)
  const session = createSessionContext(options)
  session.permissions.push(
    'tenant:product:view',
    'tenant:product:assign',
    'platform:product-plan:list',
  )
  const context: TenantProductContext = {
    tenant_id: 'default',
    plan_key: 'standard',
    plan_name: '标准套餐',
    plan_version: 1,
    plan_version_id: '12',
    runtime_epoch: '7',
    capabilities: [],
    overrides: [],
  }
  const plan: ProductPlan = {
    id: '11',
    key: context.plan_key,
    name: context.plan_name,
    created_by: '42',
    status: '1',
    versions: [
      {
        id: context.plan_version_id,
        version: context.plan_version,
        name: '标准套餐版本',
        status: 'published',
        created_by: '42',
        capabilities: [],
      },
    ],
  }
  const preview: ProductChangePreview = {
    tenant_id: context.tenant_id,
    runtime_epoch: context.runtime_epoch,
    current: context,
    target: context,
    plan_hash: 'a'.repeat(64),
    capability_additions: [],
    capability_changes: [],
    capability_removals: [],
    menu_additions: [],
    menu_removals: [],
    permission_additions: [],
    permission_removals: [],
    warnings: [],
  }
  const requests = { productContext: 0, sessionContext: 0, applied: 0 }
  await page.route('**/api/v1/**', async (route) => {
    switch (fixtureRequest(route).key) {
      case 'POST /auth/login':
        return fulfillJson(route, {
          access_token: 'access-token-smoke',
          expires_in: 900,
          session_context: session,
        })
      case 'GET /auth/context':
        requests.sessionContext++
        return fulfillJson(route, session)
      case 'GET /platform/tenants/default/product-context':
        requests.productContext++
        return fulfillJson(route, context)
      case 'GET /platform/product-plans':
        return fulfillJson(route, {
          items: [plan],
          max_page_size: 100,
          page: 1,
          page_size: 100,
          total: 1,
          total_pages: 1,
        })
      case 'GET /platform/product-plans/11':
        return fulfillJson(route, plan)
      case 'POST /platform/tenants/default/product-change-previews':
        return fulfillJson(route, preview)
      case 'POST /platform/tenants/default/product-changes':
        requests.applied++
        return fulfillJson(route, context)
      default:
        return route.fallback()
    }
  })
  await loginWithFixture(page)
  await openSidebarPage(page, '平台管理', '租户管理')
  const tenant = page.locator('.tenant-table .el-table__body tr').filter({ hasText: '默认租户' })
  await tenant.getByRole('button', { name: '详情', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '租户容量详情', exact: true })
  await drawer.getByRole('tab', { name: '套餐与能力', exact: true }).click()
  const title = '变更套餐与能力'
  await drawer.getByRole('button', { name: title, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: title, exact: true })
  await dialog.getByRole('combobox', { name: '套餐', exact: true }).click()
  await page.getByRole('option', { name: '标准套餐 (standard)', exact: true }).click()
  await dialog
    .locator('.el-select')
    .filter({ has: page.getByRole('combobox', { name: '目标套餐版本', exact: true }) })
    .click()
  await page.getByRole('option', { name: '版本号 1', exact: true }).click()
  await dialog.getByRole('button', { name: '生成预览', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: '变更预览', exact: true })).toBeVisible()
  const before = { ...requests }
  expect(before.productContext).toBeGreaterThan(0)
  const applied = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/platform/tenants/default/product-changes',
  )
  await dialog.getByRole('button', { name: '应用变更', exact: true }).click()
  const response = await applied
  expect(response.ok()).toBe(true)
  expect(response.request().postDataJSON()).toMatchObject({
    plan_version_id: context.plan_version_id,
    preview_runtime_epoch: context.runtime_epoch,
    plan_hash: preview.plan_hash,
    overrides: [],
  })
  await expect(page.getByText('租户产品上下文已更新', { exact: true })).toHaveCount(1)
  await expect(dialog).not.toBeVisible()
  await expectCleanDiagnostics(page, diagnostics)
  expect(requests).toEqual({ ...before, applied: before.applied + 1 })
})
