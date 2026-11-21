import { expect, type Locator, type Page, type Response } from '@playwright/test'
import type { NoticeRecord } from '@/generated/resources/notice/api'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { observeRequestBudget } from './request-budget'
import { test } from './session-fixture'
import { createOrdinaryUser, createWriterRole } from './session-identities'
import { observeSession } from './session-observation'
import {
  act,
  credentials,
  expectSuccessfulResponse,
  isolatedName,
  login,
  waitForApiResponse,
} from './support'

const noticesPath = '/api/v1/system/notices'
const noticePermissions = ['system:notice:list', 'system:notice:edit']

test.describe.configure({ retries: 0 })

async function readNotice(response: Response): Promise<NoticeRecord> {
  const body: { data: NoticeRecord } = await response.json()
  return body.data
}

async function openNoticeList(page: Page, budget: ReturnType<typeof observeRequestBudget>) {
  await budget.beforePageBootstrap()
  await act(page, 'GET', noticesPath, () => page.goto('/system/notice'))
  await page.waitForLoadState('networkidle')
}

async function findNoticeRow(page: Page, id: string, title: string) {
  const search = page.locator('.search-card')
  await search.getByPlaceholder('请输入标题').fill(title)
  const [listed] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        response.request().method() === 'GET' &&
        url.pathname === noticesPath &&
        url.searchParams.get('title') === title
      )
    }),
    search.getByRole('button', { name: '搜索', exact: true }).click(),
  ])
  await expectSuccessfulResponse(listed)
  const body: { data: { total: number; items: NoticeRecord[] } } = await listed.json()
  expect(body.data.total).toBe(1)
  expect(body.data.items.map((notice) => notice.id)).toEqual([id])
  const row = page.locator('.el-table__body tr').filter({ hasText: title })
  await expect(row).toHaveCount(1)
  return row
}

async function openEditor(page: Page, row: Locator, path: string) {
  const response = await act(page, 'GET', path, () =>
    row.getByRole('button', { name: '编辑', exact: true }).click(),
  )
  const dialog = page.getByRole('dialog', { name: '编辑公告', exact: true })
  await expect(dialog).toBeVisible()
  return { detail: await readNotice(response), dialog }
}

async function deleteCreatedNotice(
  page: Page,
  budget: ReturnType<typeof observeRequestBudget>,
  id: string,
  title: string,
  staleTitle: string,
) {
  await openNoticeList(page, budget)
  await budget.beforeCleanup()
  const row = await findNoticeRow(page, id, title)
  const path = `${noticesPath}/${id}`
  const { detail, dialog } = await openEditor(page, row, path)
  expect(detail.id).toBe(id)
  expect([title, staleTitle]).toContain(detail.title)
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await row.getByRole('button', { name: '删除', exact: true }).click()
  await act(page, 'DELETE', path, () =>
    page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
  )
  await expect(row).toHaveCount(0)
}

test('真实公告双编辑：过期保存返回冲突并保留表单', async ({
  page: admin,
  clientAddress,
  sessionResources,
}, info) => {
  test.setTimeout(300_000)
  const { budget, newContext, resources } = sessionResources
  const adminSetup = observeSession(admin)
  await budget.beforeProvisioning()
  await login(admin)
  await budget.beforeAuthorizationChange()
  const role = await createWriterRole(admin, adminSetup, resources, noticePermissions)
  const context = await newContext(clientAddress.replace('198.18.', '198.19.'))
  const editor = await context.newPage()
  const editorBudget = observeRequestBudget(editor)
  await budget.beforeProvisioning()
  const identity = await createOrdinaryUser(
    admin,
    context,
    role,
    resources,
    adminSetup,
    editorBudget,
  )
  expect(identity.username).not.toBe(credentials.username)
  await adminSetup.verify()

  const adminDiagnostics = observeDiagnostics(admin)
  const editorDiagnostics = observeDiagnostics(editor)
  await editorBudget.beforePageBootstrap()
  const loggedIn = waitForApiResponse(editor, 'POST', '/api/v1/auth/login')
  await login(editor, identity)
  const session = (await (await loggedIn).json()).data.session_context
  expect(session.is_super_admin).toBe(false)
  expect(session.user).toMatchObject({
    username: identity.username,
    tenant_id: credentials.tenantId,
  })
  expect(session.permissions).toEqual(expect.arrayContaining(noticePermissions))

  const title = isolatedName('真实公告双编辑')
  const originalBody = '两位编辑者打开时的正文'
  const winningBody = '管理员成功保存的正文'
  const staleTitle = `${title} 过期输入`
  const staleBody = '普通编辑者尚未保存的正文'
  let createdId: string | undefined
  const failures: unknown[] = []
  try {
    await openNoticeList(admin, budget)
    await admin.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
    const createDialog = admin.getByRole('dialog', { name: '新增公告', exact: true })
    await createDialog.getByPlaceholder('请输入公告标题').fill(title)
    await createDialog.locator('textarea').fill(originalBody)
    await info.attach('notice-create-intent', {
      body: JSON.stringify({ method: 'POST', path: noticesPath, title }),
      contentType: 'application/json',
    })
    const created = await readNotice(
      await act(admin, 'POST', noticesPath, () =>
        createDialog.getByRole('button', { name: '确定', exact: true }).click(),
      ),
    )
    expect(created.id).toMatch(/^[1-9]\d*$/u)
    expect(created.title).toBe(title)
    createdId = created.id
    const path = `${noticesPath}/${createdId}`
    await info.attach('notice-created', {
      body: JSON.stringify({ id: createdId, title }),
      contentType: 'application/json',
    })
    await expect(createDialog).not.toBeVisible()
    await openNoticeList(editor, editorBudget)
    const adminRow = await findNoticeRow(admin, createdId, title)
    const editorRow = await findNoticeRow(editor, createdId, title)
    const winner = await openEditor(admin, adminRow, path)
    const loser = await openEditor(editor, editorRow, path)
    const { revision, notice_type: noticeType, status } = winner.detail
    expect(revision).toMatch(/^[1-9]\d*$/u)
    expect(status).toBe('1')
    expect(winner.detail).toMatchObject({ id: createdId, title, content_markdown: originalBody })
    expect(loser.detail).toEqual(winner.detail)
    await expect(loser.dialog.locator('textarea')).toHaveValue(originalBody)
    await expect(loser.dialog.getByRole('radio', { name: '已发布', exact: true })).toBeChecked()
    await loser.dialog.getByPlaceholder('请输入公告标题').fill(staleTitle)
    await loser.dialog.locator('textarea').fill(staleBody)
    await loser.dialog.getByText('已关闭', { exact: true }).click()

    await expect(winner.dialog.locator('textarea')).toHaveValue(originalBody)
    await winner.dialog.locator('textarea').fill(winningBody)
    const saved = await act(admin, 'PUT', path, () =>
      winner.dialog.getByRole('button', { name: '确定', exact: true }).click(),
    )
    expect(saved.request().postDataJSON()).toEqual({
      title,
      notice_type: noticeType,
      status,
      content_markdown: winningBody,
      expected_revision: revision,
    })
    const nextRevision = (BigInt(revision) + 1n).toString()
    await expect(winner.dialog).not.toBeVisible()
    const [conflict] = await Promise.all([
      waitForApiResponse(editor, 'PUT', path),
      loser.dialog.getByRole('button', { name: '确定', exact: true }).click(),
    ])
    expect(conflict.status()).toBe(409)
    expect(await conflict.json()).toMatchObject({ error_key: 'conflict' })
    expect(conflict.request().postDataJSON()).toEqual({
      title: staleTitle,
      notice_type: noticeType,
      status: '2',
      content_markdown: staleBody,
      expected_revision: revision,
    })
    await expect(
      editor.getByText('公告已被修改。当前输入已保留，请留存后重新打开公告查看最新内容'),
    ).toBeVisible()
    await expect(loser.dialog).toBeVisible()
    await expect(loser.dialog.getByPlaceholder('请输入公告标题')).toHaveValue(staleTitle)
    await expect(loser.dialog.locator('textarea')).toHaveValue(staleBody)
    await expect(loser.dialog.getByRole('radio', { name: '已关闭', exact: true })).toBeChecked()

    const final = await openEditor(admin, adminRow, path)
    expect(final.detail).toMatchObject({
      id: createdId,
      title,
      notice_type: noticeType,
      status,
      content_markdown: winningBody,
      revision: nextRevision,
    })
    expect(editorDiagnostics.httpErrors.splice(0)).toEqual([`409 ${path}`])
    await expectCleanDiagnostics(editor, editorDiagnostics)
    await info.attach('notice-concurrency', {
      body: JSON.stringify({
        id: createdId,
        expected_revision: revision,
        saved_revision: final.detail.revision,
        conflict: { status: 409, error_key: 'conflict', path },
      }),
      contentType: 'application/json',
    })
  } catch (error) {
    failures.push(error)
  } finally {
    if (createdId) {
      try {
        await deleteCreatedNotice(admin, budget, createdId, title, staleTitle)
      } catch (error) {
        failures.push(error)
      }
    }
  }
  if (failures.length) throw new AggregateError(failures, '公告双编辑验收或精确清理失败')
  await expectCleanDiagnostics(admin, adminDiagnostics)
})
