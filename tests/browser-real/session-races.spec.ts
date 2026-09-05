import { expect } from '@playwright/test'
import { test } from './session-fixture'
import { act, credentials, isolatedName } from './support'
import { holdResponse } from './response-gate'
import { setRolePermissions } from './session-identities'
import { watchCancellationToasts, watchStaleProjection } from './session-observation'
import { createTenantWithPlan } from './tenant-support'
import {
  deletePost,
  fillNewPost,
  postPage,
  searchPost,
  switchViaOtherTab,
} from './session-race-support'

test('真实权限降低后，已完成的旧查询不能回写授权与列表', async ({ page: admin, actor }, info) => {
  test.setTimeout(300_000)
  const { page, tab, diagnostics } = actor
  await postPage(page)
  const marker = isolatedName('权限降低旧查询')
  await act(page, 'POST', '/api/v1/system/posts', async () =>
    (await fillNewPost(page, marker)).click(),
  )
  await searchPost(page, marker)
  const gate = await holdResponse(page, 'GET', '/api/v1/system/posts', actor.clientAddress)
  try {
    await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
    await gate.held()
    diagnostics.cancel(gate.request())
    const verifyCancellation = await watchCancellationToasts(page)
    await deletePost(admin, marker)
    await setRolePermissions(admin, actor.role, ['system:post:list'], actor.adminDiagnostics)
    const updated = await act(tab, 'POST', '/api/v1/auth/refresh', () => tab.reload())
    const context = (await updated.json()).data.session_context
    expect(BigInt(context.authorization_epoch)).toBeGreaterThan(
      BigInt(actor.initial.authorization_epoch),
    )
    expect(context.permissions).toContain('system:post:list')
    expect(context.permissions).not.toContain('system:post:add')
    await expect(
      page.locator('.card-header').getByRole('button', { name: '新增', exact: true }),
    ).toHaveCount(0)
    await expect(page.locator('.el-table__body tr').filter({ hasText: marker })).toHaveCount(0)
    const verifyProjection = await watchStaleProjection(page, [marker])
    await gate.release()
    await searchPost(page, marker)
    await verifyProjection()
    await verifyCancellation()
    await diagnostics.verify()
    await actor.tabDiagnostics.verify()
    await actor.adminDiagnostics.verify()
  } finally {
    await gate.finish(info)
  }
})

test('同租户真实 A→B 切换隔离已提交 Mutation 的延迟成功回调', async ({
  page: admin,
  actor,
}, info) => {
  test.setTimeout(300_000)
  const { page, tab, diagnostics } = actor
  await postPage(page)
  const marker = isolatedName('旧身份已提交')
  const submit = await fillNewPost(page, marker)
  const gate = await holdResponse(page, 'POST', '/api/v1/system/posts', actor.clientAddress)
  try {
    await submit.click()
    await gate.held()
    diagnostics.cancel(gate.request())
    const verifyCancellation = await watchCancellationToasts(page)
    await switchViaOtherTab(tab, page, actor.second)
    await expect(page.getByRole('dialog', { name: '新增岗位', exact: true })).toHaveCount(0)
    const verifyProjection = await watchStaleProjection(page, [marker, actor.first.username])
    await gate.release()
    // 后续真实请求形成检查点；不把客户端取消误认为服务器事务回滚。
    await act(page, 'GET', '/api/v1/system/notices', async () => {
      await page.getByRole('menuitem', { name: '系统管理', exact: true }).click()
      await page.getByRole('menuitem', { name: '通知公告', exact: true }).click()
    })
    await verifyProjection()
    await verifyCancellation()
    await deletePost(admin, marker)
    await diagnostics.verify()
    await actor.tabDiagnostics.verify()
    await actor.adminDiagnostics.verify()
  } finally {
    await gate.finish(info)
  }
})

test('跨租户切换清理 KeepAlive 页面中的真实旧数据', async ({ page: admin, actor }) => {
  test.setTimeout(300_000)
  const adminBudget = actor.adminBudget
  const { page, tab, diagnostics } = actor
  await adminBudget.beforeProvisioning()
  const { tenant } = await createTenantWithPlan(admin)
  await postPage(page)
  const marker = isolatedName('旧租户缓存')
  await act(page, 'POST', '/api/v1/system/posts', async () =>
    (await fillNewPost(page, marker)).click(),
  )
  await searchPost(page, marker)
  await act(page, 'GET', '/api/v1/system/notices', () =>
    page.getByRole('menuitem', { name: '通知公告', exact: true }).click(),
  )
  await page.getByRole('menuitem', { name: '岗位管理', exact: true }).click()
  await expect(page.getByPlaceholder('请输入或选择岗位名称')).toHaveValue(marker)
  await page.getByRole('menuitem', { name: '通知公告', exact: true }).click()
  const verifyCancellation = await watchCancellationToasts(page)
  await switchViaOtherTab(tab, page, {
    ...credentials,
    tenantId: tenant,
    username: 'owner',
    password: 'Valid!Owner123',
  })
  const verifyProjection = await watchStaleProjection(page, [marker, actor.first.username])
  const request = page.waitForRequest(
    (value) => value.method() === 'GET' && new URL(value.url()).pathname === '/api/v1/system/posts',
  )
  await postPage(page)
  expect((await request).headers()['x-tenant-id']).toBe(tenant)
  await searchPost(page, marker)
  await expect(page.locator('.el-table__body tr').filter({ hasText: marker })).toHaveCount(0)
  await verifyProjection()
  await verifyCancellation()
  await adminBudget.beforeCleanup()
  await deletePost(admin, marker)
  await diagnostics.verify()
  await actor.tabDiagnostics.verify()
  await actor.adminDiagnostics.verify()
})

test('真实刷新完整响应延迟期间换身份，旧 Cookie 与会话不能覆盖新登录', async ({ actor }, info) => {
  test.setTimeout(300_000)
  const { page, tab, diagnostics } = actor
  const gate = await holdResponse(page, 'POST', '/api/v1/auth/refresh', actor.clientAddress)
  try {
    await page.reload()
    const held = await gate.held()
    expect(held.cookieCount).toBeGreaterThan(0)
    diagnostics.cancel(gate.request())
    const verifyCancellation = await watchCancellationToasts(page)
    await switchViaOtherTab(tab, page, actor.second)
    const verifyProjection = await watchStaleProjection(page, [actor.first.username])
    const proof = await gate.release()
    expect(['client-closed', 'released']).toContain(proof.state)
    await postPage(page)
    await verifyProjection()
    await verifyCancellation()
    const refreshed = await act(page, 'POST', '/api/v1/auth/refresh', () => page.reload())
    expect((await refreshed.json()).data.session_context.user.username).toBe(actor.second.username)
    await expect(page.locator('.navbar .user-info')).toContainText(actor.second.username)
    await diagnostics.verify()
    await actor.tabDiagnostics.verify()
    await actor.adminDiagnostics.verify()
  } finally {
    await gate.finish(info)
  }
})
