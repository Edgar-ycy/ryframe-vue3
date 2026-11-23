import { expect, type Locator, type Page, type Request, type Response } from '@playwright/test'
import type { ProductChangePreview, TenantProductContext } from '@/api/modules/productPlan'
import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { test } from './fixture'
import { observeRequestBudget } from './request-budget'
import { act, isolatedName, login, waitForApiResponse } from './support'
import { createTenantWithPlan, openTenantDetails } from './tenant-support'

const assignmentTitle = '变更套餐与能力'
const productTab = '套餐与能力'
const successText = '租户产品上下文已更新'
const noticeCapability = 'system.notice'

test.describe.configure({ retries: 0 })

async function readData<T>(response: Response): Promise<T> {
  expect(response.status()).toBe(200)
  const body: { data: T } = await response.json()
  return body.data
}

async function openCurrentAssignment(page: Page, current: TenantProductContext) {
  await page.getByRole('button', { name: assignmentTitle, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: assignmentTitle, exact: true })
  await dialog.getByRole('combobox', { name: '套餐', exact: true }).click()
  await page
    .getByRole('option', { name: `${current.plan_name} (${current.plan_key})`, exact: true })
    .click()
  // 空版本选择框的输入被占位节点覆盖，通过选择器容器打开实际选项。
  await dialog
    .locator('.el-select')
    .filter({ has: page.getByRole('combobox', { name: '目标套餐版本', exact: true }) })
    .click()
  await page.getByRole('option', { name: `版本号 ${current.plan_version}`, exact: true }).click()
  return dialog
}

function noticeOverride(dialog: Locator) {
  return dialog.locator('.override-card').filter({
    has: dialog.page().getByText(noticeCapability, { exact: true }),
  })
}

function previewAssignment(page: Page, dialog: Locator, path: string) {
  return act(page, 'POST', path, () =>
    dialog.getByRole('button', { name: '生成预览', exact: true }).click(),
  )
}

function applyAssignment(page: Page, dialog: Locator, path: string) {
  return act(page, 'POST', path, () =>
    dialog.getByRole('button', { name: '应用变更', exact: true }).click(),
  )
}

async function readProductTab(page: Page, contextPath: string) {
  return readData<TenantProductContext>(
    await act(page, 'GET', contextPath, () =>
      page.getByRole('tab', { name: productTab, exact: true }).click(),
    ),
  )
}

async function restoreFixtureOverride(
  page: Page,
  budget: ReturnType<typeof observeRequestBudget>,
  initial: TenantProductContext,
  prepared: TenantProductContext,
  paths: { context: string; preview: string; apply: string },
) {
  // 清理前通过正式页面重读已经确认的写入像，未知写入不重放。
  await budget.beforePageBootstrap()
  await page.reload()
  await openTenantDetails(page, initial.tenant_id)
  const observed = await readProductTab(page, paths.context)
  expect(observed).toEqual(prepared)
  await budget.beforeProvisioning()
  const cleanup = await openCurrentAssignment(page, observed)
  const card = noticeOverride(cleanup)
  await expect(card.locator('.override-config')).toBeVisible()
  await card.locator('.override-toggle .el-switch').click()
  await previewAssignment(page, cleanup, paths.preview)
  const [refreshed, applied] = await Promise.all([
    waitForApiResponse(page, 'GET', paths.context),
    applyAssignment(page, cleanup, paths.apply),
  ])
  const restored = await readData<TenantProductContext>(refreshed)
  expect(restored).toEqual(await readData<TenantProductContext>(applied))
  expect(restored).toMatchObject({
    tenant_id: initial.tenant_id,
    plan_version_id: initial.plan_version_id,
    capabilities: initial.capabilities,
    overrides: initial.overrides,
  })
  await expect(cleanup).not.toBeVisible()
}

test('真实重复提交保留非空能力覆盖和运行时版本，关闭编辑器且不额外读上下文', async ({
  page,
}, info) => {
  test.setTimeout(300_000)
  const diagnostics = observeDiagnostics(page)
  const budget = observeRequestBudget(page)
  const identity = {
    tenant: isolatedName('tenant'),
    planKey: isolatedName('plan'),
    planName: isolatedName('重复提交套餐'),
  }
  await budget.beforePageBootstrap()
  await login(page)
  const environment = loadRealBrowserEnvironment()
  await info.attach('product-assignment-fixture-intent', {
    body: JSON.stringify({ scope_id: environment.scopeId, run_id: environment.runId, ...identity }),
    contentType: 'application/json',
  })
  await createTenantWithPlan(page, 'shared-control', identity, budget.beforeProvisioning)
  const tenantPath = `/api/v1/platform/tenants/${identity.tenant}`
  const contextPath = `${tenantPath}/product-context`
  const previewPath = `${tenantPath}/product-change-previews`
  const applyPath = `${tenantPath}/product-changes`
  const success = page.getByText(successText, { exact: true })
  await openTenantDetails(page, identity.tenant)
  const initial = await readProductTab(page, contextPath)
  expect(initial).toMatchObject({
    tenant_id: identity.tenant,
    plan_key: identity.planKey,
    overrides: [],
  })

  let prepared: TenantProductContext | undefined
  const failures: unknown[] = []
  try {
    await budget.beforeProvisioning()
    const setup = await openCurrentAssignment(page, initial)
    const setupCard = noticeOverride(setup)
    await setupCard.locator('.override-toggle .el-switch').click()
    // 保存一个显式禁用的覆盖，避免启用额外业务能力。
    const enabled = setupCard.locator('.override-config .el-switch')
    await expect(enabled).toBeVisible()
    if (await enabled.evaluate((element) => element.classList.contains('is-checked'))) {
      await enabled.click()
    }
    await previewAssignment(page, setup, previewPath)
    const [contextResponse, appliedResponse] = await Promise.allSettled([
      waitForApiResponse(page, 'GET', contextPath),
      applyAssignment(page, setup, applyPath),
    ])
    if (appliedResponse.status === 'rejected') throw appliedResponse.reason
    prepared = await readData<TenantProductContext>(appliedResponse.value)
    if (contextResponse.status === 'rejected') throw contextResponse.reason
    const current = await readData<TenantProductContext>(contextResponse.value)
    expect(current).toEqual(prepared)
    expect(current.plan_version_id).toBe(initial.plan_version_id)
    expect(BigInt(current.runtime_epoch)).toBeGreaterThan(BigInt(initial.runtime_epoch))
    expect(current.overrides).toMatchObject([{ capability_code: noticeCapability, enabled: false }])
    const overrides = current.overrides.map(
      ({ capability_code, enabled, variant_code, schema_version, config }) => ({
        capability_code,
        enabled,
        variant_code,
        schema_version,
        config,
      }),
    )
    await expect(setup).not.toBeVisible()
    await expect(success).toBeVisible()
    await expect(success).not.toBeVisible()

    await budget.beforeProvisioning()
    const repeat = await openCurrentAssignment(page, current)
    await expect(noticeOverride(repeat).locator('.override-config')).toBeVisible()
    const reads: string[] = []
    const observeRead = (request: Request) => {
      const path = new URL(request.url()).pathname
      if (request.method() === 'GET' && (path === contextPath || path === '/api/v1/auth/context')) {
        reads.push(path)
      }
    }
    page.on('request', observeRead)
    try {
      const previewResponse = await previewAssignment(page, repeat, previewPath)
      const selection = { plan_version_id: current.plan_version_id, overrides }
      expect(previewResponse.request().postDataJSON()).toEqual(selection)
      const preview = await readData<ProductChangePreview>(previewResponse)
      expect(preview).toMatchObject({
        tenant_id: identity.tenant,
        runtime_epoch: current.runtime_epoch,
        current: { plan_version_id: current.plan_version_id },
        target: { plan_version_id: current.plan_version_id },
        capability_additions: [],
        capability_changes: [],
        capability_removals: [],
        menu_additions: [],
        menu_removals: [],
        permission_additions: [],
        permission_removals: [],
      })
      expect(preview.plan_hash).toBeTruthy()
      await expect(repeat.getByRole('heading', { name: '变更预览', exact: true })).toBeVisible()
      const response = await applyAssignment(page, repeat, applyPath)
      expect(response.request().postDataJSON()).toEqual({
        ...selection,
        plan_hash: preview.plan_hash,
        preview_runtime_epoch: preview.runtime_epoch,
      })
      expect(await readData<TenantProductContext>(response)).toEqual(current)
      await expect(success).toBeVisible()
      await expect(repeat).not.toBeVisible()
      // 将观察窗口延长到本次成功提示消失，覆盖保存后的异步刷新。
      await expect(success).not.toBeVisible()
      expect(reads).toEqual([])
    } finally {
      page.off('request', observeRead)
    }
  } catch (failure) {
    failures.push(failure)
  } finally {
    if (prepared) {
      try {
        await restoreFixtureOverride(page, budget, initial, prepared, {
          context: contextPath,
          preview: previewPath,
          apply: applyPath,
        })
      } catch (failure) {
        failures.push(failure)
      }
    }
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1) throw new AggregateError(failures, '套餐验收和覆盖清理均失败')
  await expectCleanDiagnostics(page, diagnostics)
})
