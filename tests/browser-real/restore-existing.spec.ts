import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { expect } from '@playwright/test'
import { test } from './fixture'
import { act, credentials, login } from './support'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import {
  datasetDigest,
  restoredDataset,
  restoredExistingVerification,
} from '../../scripts/restore-dataset.mjs'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`恢复旧数据验收缺少 ${name}`)
  return value
}

test('恢复前已有岗位与文件在全部参考租户中仍可读取', async ({ newClientContext }, info) => {
  test.setTimeout(20 * 60_000)
  const datasetFile = required('RYFRAME_RESTORE_DATASET_RECEIPT')
  const planFile = required('RYFRAME_RESTORE_REFERENCE_PLAN')
  const bindingFile = required('RYFRAME_RESTORE_BINDINGS')
  const backend = required('RYFRAME_RESTORE_BACKEND_DIR')
  const paths = [datasetFile, planFile, bindingFile]
  const original = await Promise.all(paths.map((file) => readFile(file)))
  const dataset = restoredDataset(original[0], original[1], original[2])
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
  const verified = await promisify(execFile)(
    process.execPath,
    [
      resolve(backend, 'scripts/restore_reference_dataset.mjs'),
      '--plan',
      planFile,
      '--backend-dir',
      backend,
      '--verify-existing',
      datasetFile,
      '--side',
      'target',
      '--write',
    ],
    { windowsHide: true, timeout: 15 * 60_000, maxBuffer: 1024 * 1024 },
  )
  const result: unknown = JSON.parse(verified.stdout)
  restoredExistingVerification(result, original[0], original[1], original[2])
  await info.attach('restored-existing-data', {
    body: verified.stdout,
    contentType: 'application/json',
  })
  const final = await Promise.all(paths.map((file) => readFile(file)))
  expect(final.map(datasetDigest)).toEqual(original.map(datasetDigest))
  info.annotations.push({ type: 'restore-scenario', description: 'restored-data' })
})
