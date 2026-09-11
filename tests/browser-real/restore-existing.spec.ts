import { expect } from '@playwright/test'
import { test } from './fixture'
import { act, credentials, login } from './support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import {
  restoreDatasetAuthority,
  restoreDatasetEvidence,
  verifyRestoredDataset,
} from '../../scripts/restore-dataset.mjs'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`恢复旧数据验收缺少 ${name}`)
  return value
}

test('恢复前已有岗位与文件在全部参考租户中仍可读取', async ({ newClientContext }, info) => {
  test.setTimeout(20 * 60_000)
  const verifierRoot = required('RYFRAME_RESTORE_BACKEND_DIR')
  const frontendEndpoint = info.project.use.baseURL
  if (typeof frontendEndpoint !== 'string' || !frontendEndpoint)
    throw new Error('恢复旧数据验收缺少唯一前端地址')
  const expectedAuthority = restoreDatasetAuthority(info.config.metadata.restoreDatasetAuthority)
  const restored = restoreDatasetEvidence(expectedAuthority)
  const dataset = restored.lineage
  const passwords = new Map(
    dataset.tenants.map((tenant) => [tenant.tenant_id, required(tenant.password_env)]),
  )
  for (const [index, tenant] of dataset.tenants.entries()) {
    const password = passwords.get(tenant.tenant_id)
    if (!password) throw new Error(`恢复旧数据验收缺少 ${tenant.password_env}`)
    const context = await newClientContext(`198.19.11.${index + 1}`)
    const page = await context.newPage()
    const diagnostics = observeDiagnostics(page)
    await login(page, {
      ...credentials,
      tenantId: tenant.tenant_id,
      username: tenant.username,
      password,
    })
    await act(page, 'GET', '/api/v1/system/posts', () => page.goto('/system/post'))
    const post = tenant.posts[0]
    await page.getByPlaceholder('请输入或选择岗位名称').fill(post.name)
    await act(page, 'GET', '/api/v1/system/posts', () =>
      page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click(),
    )
    const row = page.locator('.el-table__body-wrapper tr').filter({ hasText: post.code })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(post.name)
    await expectCleanDiagnostics(page, diagnostics)
    await context.close()
  }
  const verified = await verifyRestoredDataset({
    authority: restored,
    verifierRoot,
  })
  await info.attach('restored-existing-data', {
    body: Buffer.from(JSON.stringify(verified, null, 2) + '\n'),
    contentType: 'application/json',
  })
  const rebound = restoreDatasetEvidence(expectedAuthority)
  expect(rebound.authority).toEqual(restored.authority)
  info.annotations.push({ type: 'restore-scenario', description: 'restored-data' })
})
