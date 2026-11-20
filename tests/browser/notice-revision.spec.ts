import { expect, test } from '@playwright/test'
import type { NoticeRecord } from '@/generated/resources/notice/api'
import { installApiFixture } from './support/apiFixture'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { envelope, fixtureRequest, fulfillJson } from './support/http'
import { loginWithFixture, openSidebarPage } from './support/navigation'
import { createSessionContext } from './support/sessionFixture'

const noticeId = '4001'
const listPath = '/system/notices'
const detailPath = `${listPath}/${noticeId}`
const firstRevision = '9007199254740993'
const changedRevision = '9007199254740994'
const initialNotice: NoticeRecord = {
  id: noticeId,
  content_markdown: '原公告正文',
  created_at: '2026-11-20T00:00:00Z',
  notice_type: 'announcement',
  revision: firstRevision,
  status: '0',
  title: '并发编辑公告',
}

function sessionWithNotice() {
  const session = createSessionContext()
  const systemMenu = session.menus.find((item) => item.route_key === 'system')
  if (!systemMenu) throw new Error('会话夹具缺少系统菜单')
  systemMenu.children.push({
    children: [],
    id: '103',
    menu_type: 'C',
    name: 'system.notice',
    parent_id: systemMenu.id,
    perm_code: 'system:notice:list',
    route_key: 'system.notice',
    sort: 3,
    status: '1',
    visible: true,
  })
  session.permissions.push('system:notice:list', 'system:notice:edit')
  return session
}

test('公告并发修改保留原输入，重开后用详情新版本保存', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  await installApiFixture(page, diagnostics)
  const session = sessionWithNotice()
  let serverNotice = initialNotice
  let listNotice = { ...initialNotice, revision: '9007199254740992' }
  let detailReads = 0
  const updates: unknown[] = []

  await page.route('**/api/v1/**', async (route) => {
    const { key, request } = fixtureRequest(route)
    if (key === 'POST /auth/login') {
      await fulfillJson(route, {
        access_token: 'access-token-smoke',
        expires_in: 900,
        session_context: session,
      })
      return
    }
    if (key === 'GET /auth/context') {
      await fulfillJson(route, session)
      return
    }
    if (key === `GET ${listPath}`) {
      await fulfillJson(route, {
        items: [listNotice],
        max_page_size: 100,
        page: 1,
        page_size: 10,
        total: 1,
        total_pages: 1,
      })
      return
    }
    if (key === `GET ${detailPath}`) {
      detailReads += 1
      await fulfillJson(route, serverNotice)
      return
    }
    if (key === `PUT ${detailPath}`) {
      const payload: unknown = request.postDataJSON()
      updates.push(payload)
      if (updates.length === 1) {
        serverNotice = {
          ...serverNotice,
          content_markdown: '其他会话修改后的正文',
          revision: changedRevision,
        }
        await route.fulfill({
          body: JSON.stringify({ ...envelope(null, 409), error_key: 'conflict' }),
          contentType: 'application/json',
          status: 409,
        })
        return
      }
      expect(updates).toHaveLength(2)
      serverNotice = {
        ...serverNotice,
        content_markdown: '重新编辑后的正文',
        revision: '9007199254740995',
        status: '1',
      }
      listNotice = serverNotice
      await fulfillJson(route, serverNotice)
      return
    }
    await route.fallback()
  })

  await loginWithFixture(page)
  await openSidebarPage(page, '系统管理', '通知公告')
  await expect(page).toHaveURL(/\/system\/notice$/u)
  const row = page.locator('.el-table__body tr').filter({ hasText: initialNotice.title })
  const editButton = row.getByRole('button', { name: '编辑', exact: true })
  const dialog = page.getByRole('dialog', { name: '编辑公告', exact: true })
  const title = dialog.getByPlaceholder('请输入公告标题')
  const content = dialog.locator('textarea')
  const save = dialog.getByRole('button', { name: '确定', exact: true })

  await editButton.click()
  await expect(content).toHaveValue(initialNotice.content_markdown)
  await title.fill('我的临时标题')
  await content.fill('**我的未保存正文**')
  await dialog.getByText('已关闭', { exact: true }).click()
  await save.click()
  await expect(
    page.getByText('公告已被修改。当前输入已保留，请留存后重新打开公告查看最新内容'),
  ).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(title).toHaveValue('我的临时标题')
  await expect(content).toHaveValue('**我的未保存正文**')
  await expect(dialog.getByRole('radio', { name: '已关闭', exact: true })).toBeChecked()
  expect(updates).toEqual([
    {
      content_markdown: '**我的未保存正文**',
      expected_revision: firstRevision,
      notice_type: 'announcement',
      status: '2',
      title: '我的临时标题',
    },
  ])
  expect(detailReads).toBe(1)

  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await editButton.click()
  await expect(content).toHaveValue('其他会话修改后的正文')
  expect(detailReads).toBe(2)
  await content.fill('重新编辑后的正文')
  await dialog.getByText('已发布', { exact: true }).click()
  await save.click()
  await expect(dialog).not.toBeVisible()
  await expect(row).toContainText('重新编辑后的正文')
  expect(updates).toHaveLength(2)
  expect(updates[1]).toEqual({
    content_markdown: '重新编辑后的正文',
    expected_revision: changedRevision,
    notice_type: 'announcement',
    status: '1',
    title: initialNotice.title,
  })
  expect(diagnostics.httpErrors.splice(0)).toEqual([`409 /api/v1${detailPath}`])
  await expectCleanDiagnostics(page, diagnostics)
})
