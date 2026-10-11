import { expect, type Page, type Response } from '@playwright/test'
import { test } from './fixture'
import { act, credentials, isolatedName, login } from './support'
import { createTenantWithPlan, openTenantDetails } from './tenant-support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

type TenantPlan = Awaited<ReturnType<typeof createTenantWithPlan>>

async function changeCapabilities(
  admin: Page,
  plan: TenantPlan,
  notice: boolean,
  message: boolean,
) {
  await admin.getByRole('button', { name: '变更套餐与能力', exact: true }).click()
  const dialog = admin.getByRole('dialog', { name: '变更套餐与能力', exact: true })
  await dialog.getByRole('combobox', { name: '套餐', exact: true }).click()
  await admin
    .getByRole('option', { name: `${plan.planName} (${plan.planKey})`, exact: true })
    .click()
  // 空选项的下拉框输入被占位节点覆盖，必须点击选择器容器触发下拉。
  await dialog
    .locator('.el-select')
    .filter({ has: admin.getByRole('combobox', { name: '目标套餐版本', exact: true }) })
    .click()
  await admin.getByRole('option', { name: '版本号 1', exact: true }).click()
  for (const [code, enabled] of [
    ['system.notice', notice],
    ['system.message', message],
  ] as const) {
    const card = dialog.locator('.override-card').filter({ hasText: code })
    // Element Plus 开关的真实输入不可见，必须点击开关容器并按状态幂等切换。
    const override = card.locator('.el-switch').first()
    if (!(await override.evaluate((element) => element.classList.contains('is-checked')))) {
      await override.click()
    }
    const configSwitch = card.locator('.override-config .el-switch')
    const configChecked = await configSwitch.evaluate((element) =>
      element.classList.contains('is-checked'),
    )
    if (configChecked !== enabled) await configSwitch.click()
  }
  await act(admin, 'POST', `/api/v1/platform/tenants/${plan.tenant}/product-change-previews`, () =>
    dialog.getByRole('button', { name: '生成预览', exact: true }).click(),
  )
  const applied = await act(
    admin,
    'POST',
    `/api/v1/platform/tenants/${plan.tenant}/product-changes`,
    () => dialog.getByRole('button', { name: '应用变更', exact: true }).click(),
  )
  const body: { data: { runtime_epoch: string } } = await applied.json()
  await expect(dialog).not.toBeVisible()
  return BigInt(body.data.runtime_epoch)
}

async function deniedRequest(owner: Page, current: Response, path: string, body?: string | null) {
  const headers = await current.request().allHeaders()
  return owner.evaluate(
    async ({ path, body, authorization, tenant }) => {
      const response = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Authorization: authorization,
          'X-Tenant-Id': tenant,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        ...(body === undefined || body === null ? {} : { body }),
      })
      return response.status
    },
    {
      path,
      body,
      authorization: headers.authorization ?? '',
      tenant: headers['x-tenant-id'] ?? '',
    },
  )
}

test('公告与主动消息启停保留历史数据、已接受消息和基础管理', async ({
  page: admin,
  newClientContext,
  clientAddress,
}, info) => {
  test.setTimeout(8 * 60_000)
  const adminDiagnostics = observeDiagnostics(admin)
  await login(admin)
  const plan = await createTenantWithPlan(admin)
  await openTenantDetails(admin, plan.tenant)
  await act(admin, 'GET', `/api/v1/platform/tenants/${plan.tenant}/product-context`, () =>
    admin.getByRole('tab', { name: '套餐与能力', exact: true }).click(),
  )
  const enabledEpoch = await changeCapabilities(admin, plan, true, true)
  const context = await newClientContext(clientAddress.replace('198.18.', '198.19.'))
  try {
    const owner = await context.newPage()
    const diagnostics = observeDiagnostics(
      owner,
      // 能力变更提升运行时纪元后，作用域刷新会按设计取消在途的公告列表查询。
      (request) =>
        request.method() === 'GET' && new URL(request.url()).pathname === '/api/v1/system/notices',
    )
    await login(owner, {
      ...credentials,
      tenantId: plan.tenant,
      username: 'owner',
      password: 'Valid!Owner123',
    })
    await act(owner, 'GET', '/api/v1/system/notices', () => owner.goto('/system/notice'))
    const title = isolatedName('能力验收')
    await owner.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
    const editor = owner.getByRole('dialog')
    await editor.locator('input').first().fill(title)
    await editor.locator('textarea').fill(`# ${title}\n\n启停后仍需保留`)
    const created = await act(owner, 'POST', '/api/v1/system/notices', () =>
      editor.getByRole('button', { name: '确定', exact: true }).click(),
    )
    const notice: { data: { id: string } } = await created.json()
    const row = owner.locator('.el-table__body tr').filter({ hasText: title })
    await expect(row).toHaveCount(1)
    const publishPath = `/api/v1/system/notices/${notice.data.id}/publish-message`
    await row.getByRole('button', { name: '发布到消息中心', exact: true }).click()
    const accepted = await act(owner, 'POST', publishPath, () =>
      owner.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
    )
    expect(accepted.request().method()).toBe('POST')
    await owner.locator('.message-center-trigger button').click()
    const inbox = owner.getByRole('dialog', { name: '消息中心', exact: true })
    await expect(inbox.getByText(title, { exact: true })).toBeVisible({ timeout: 90_000 })
    await inbox.getByRole('button', { name: /close|关闭/iu }).click()

    const messageOffEpoch = await changeCapabilities(admin, plan, true, false)
    expect(messageOffEpoch).toBeGreaterThan(enabledEpoch)
    const retained = await act(owner, 'GET', '/api/v1/system/notices', () => owner.reload())
    await expect(row).toHaveCount(1)
    await expect(row.getByRole('button', { name: '发布到消息中心', exact: true })).toHaveCount(0)
    expect(await deniedRequest(owner, retained, publishPath, null)).toBe(403)
    expect(diagnostics.httpErrors).toEqual([`403 ${publishPath}`])
    diagnostics.httpErrors.length = 0
    await owner.locator('.message-center-trigger button').click()
    await expect(inbox.getByText(title, { exact: true })).toBeVisible()
    await inbox.getByRole('button', { name: /close|关闭/iu }).click()

    const noticeOffEpoch = await changeCapabilities(admin, plan, false, false)
    expect(noticeOffEpoch).toBeGreaterThan(messageOffEpoch)
    const basic = await act(owner, 'GET', '/api/v1/system/posts', () => owner.goto('/system/post'))
    expect(await deniedRequest(owner, basic, '/api/v1/system/notices')).toBe(403)
    expect(diagnostics.httpErrors).toEqual(['403 /api/v1/system/notices'])
    diagnostics.httpErrors.length = 0
    await expect(owner.locator('.el-table')).toBeVisible()

    expect(await changeCapabilities(admin, plan, true, true)).toBeGreaterThan(noticeOffEpoch)
    await act(owner, 'GET', '/api/v1/system/notices', () => owner.goto('/system/notice'))
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('启停后仍需保留')
    await expect(row.getByRole('button', { name: '发布到消息中心', exact: true })).toBeVisible()
    await expectCleanDiagnostics(owner, diagnostics)
  } finally {
    await context.close()
  }
  await expectCleanDiagnostics(admin, adminDiagnostics)
  info.annotations.push({ type: 'restore-scenario', description: 'tenant' })
})
