import { test } from './fixture'
import { expect } from '@playwright/test'
import { act, credentials, isolatedName, login } from './support'
import { createTenantWithPlan, openTenantDetails, verifyDataTargets } from './tenant-support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

test('真实租户迁移完成目标切换且控制面资源保持可读写', async ({
  page,
  newClientContext,
  clientAddress,
}) => {
  test.setTimeout(240_000)
  const diagnostics = observeDiagnostics(page)
  await login(page)
  await verifyDataTargets(page, ['shared', 'dedicated-a', 'dedicated-b'])
  const { tenant } = await createTenantWithPlan(page)
  const owner = await newClientContext(clientAddress.replace('198.18.', '198.19.'))
  try {
    const business = await owner.newPage()
    const businessDiagnostics = observeDiagnostics(business)
    await login(business, {
      ...credentials,
      tenantId: tenant,
      username: 'owner',
      password: 'Valid!Owner123',
    })
    const name = isolatedName('迁移岗位')
    const code = isolatedName('migrate')
    await act(business, 'GET', '/api/v1/system/posts', () => business.goto('/system/post'))
    await business
      .locator('.card-header')
      .getByRole('button', { name: '新增', exact: true })
      .click()
    const add = business.getByRole('dialog', { name: '新增岗位', exact: true })
    await add.getByPlaceholder('请输入岗位名称').fill(name)
    await add.getByPlaceholder('请输入岗位编码').fill(code)
    await act(business, 'POST', '/api/v1/system/posts', () =>
      add.getByRole('button', { name: '确定', exact: true }).click(),
    )
    await expect(business.locator('.el-table__body tr').filter({ hasText: code })).toHaveCount(1)
    await expectCleanDiagnostics(business, businessDiagnostics)
    // 关闭业务页后再进入维护窗口，验证后重新建立会话与目标连接。
    await business.close()

    await openTenantDetails(page, tenant)
    await page.getByRole('tab', { name: '数据放置与迁移', exact: true }).click()
    await page.getByRole('button', { name: '发起迁移', exact: true }).click()
    const wizard = page.getByRole('dialog', { name: '迁移租户数据', exact: true })
    await wizard.getByRole('combobox').click()
    await page
      .getByRole('option')
      .filter({ hasText: /\bshared\b/u })
      .filter({ hasNotText: 'shared-control' })
      .click()
    const preview = await act(
      page,
      'POST',
      `/api/v1/platform/tenants/${tenant}/data-migration-previews`,
      () => wizard.getByRole('button', { name: '生成预览', exact: true }).click(),
    )
    expect((await preview.json()).data).toMatchObject({
      source_target_key: 'shared-control',
      target_target_key: 'shared',
    })
    await wizard.getByRole('textbox', { name: '再次输入租户 ID', exact: true }).fill(tenant)
    const created = await act(
      page,
      'POST',
      `/api/v1/platform/tenants/${tenant}/data-migrations`,
      () => wizard.getByRole('button', { name: '创建迁移', exact: true }).click(),
    )
    const migrationId: string = (await created.json()).data.id
    const detail = page.getByRole('dialog', { name: '迁移任务详情', exact: true })
    await expect(detail).toBeVisible()
    await expect(detail.locator('.detail-heading')).toContainText('保留期', { timeout: 90_000 })
    // Post 属于控制库；此场景验证目标切换和控制面可用性，不充当业务表复制证明。
    await detail.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(
      page.locator('.tenant-data-panel .el-descriptions').getByText('shared', { exact: true }),
    ).toBeVisible()
    await expect(
      page.locator('.migration-table tr').filter({ hasText: migrationId }),
    ).toContainText('保留期')

    const restored = await owner.newPage()
    const restoredDiagnostics = observeDiagnostics(restored)
    await act(restored, 'GET', '/api/v1/system/posts', () => restored.goto('/system/post'))
    const row = restored.locator('.el-table__body tr').filter({ hasText: code })
    await expect(row).toContainText(name)
    await row.getByRole('button', { name: '删除', exact: true }).click()
    await act(restored, 'DELETE', /\/system\/posts\/\d+$/u, () =>
      restored
        .locator('.el-message-box')
        .getByRole('button', { name: '确定', exact: true })
        .click(),
    )
    await expect(row).toHaveCount(0)
    await expectCleanDiagnostics(restored, restoredDiagnostics)
    await expectCleanDiagnostics(page, diagnostics)
  } finally {
    await owner.close()
  }
})
