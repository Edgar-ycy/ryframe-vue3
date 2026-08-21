import { expect, test, type Page, type Route } from '@playwright/test'

const NOW = '2026-08-21T00:00:00Z'
const EXPIRES_AT = '2099-08-21T00:00:00Z'

interface ExportJobFixture {
  completed_at?: string | null
  content_type?: string | null
  created_at: string
  error_message?: string | null
  expires_at?: string | null
  file_size?: number | null
  id: string
  matched_rows: number
  notification_read_at?: string | null
  resource: string
  result_file_name?: string | null
  snapshot_at: string
  status: string
  updated_at: string
}

interface BrowserDiagnostics {
  console: string[]
  httpErrors: string[]
  pageErrors: string[]
  requestFailures: string[]
  unhandledApi: string[]
}

function envelope(data: unknown, code = 200) {
  return {
    code,
    data,
    error_key: null,
    message: code < 400 ? 'ok' : '未登录',
    request_id: 'browser-smoke',
  }
}

async function fulfillJson(route: Route, data: unknown, status = 200): Promise<void> {
  await route.fulfill({
    body: JSON.stringify(envelope(data, status)),
    contentType: 'application/json',
    status,
  })
}

function createJob(
  id: string,
  resultFileName: string,
  status: string,
  errorMessage: string | null = null,
): ExportJobFixture {
  return {
    completed_at: NOW,
    content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    created_at: NOW,
    error_message: errorMessage,
    expires_at: EXPIRES_AT,
    file_size: 4,
    id,
    matched_rows: 21,
    notification_read_at: NOW,
    resource: 'users',
    result_file_name: resultFileName,
    snapshot_at: NOW,
    status,
    updated_at: NOW,
  }
}

async function installApiFixture(page: Page, diagnostics: BrowserDiagnostics) {
  const exportBodies: unknown[] = []
  const deletionBodies: unknown[] = []
  const jobs = [
    createJob('job-1', 'users.xlsx', 'succeeded'),
    createJob('job-2', 'roles.xlsx', 'failed', '生成失败'),
    createJob('job-3', 'posts.xlsx', 'cancelled'),
  ]
  const sessionContext = {
    authorization_epoch: '11',
    business_data: { placement_generation: '3', state: 'active' },
    capabilities: [],
    is_super_admin: false,
    menus: [
      {
        children: [
          {
            children: [],
            id: '101',
            menu_type: 'C',
            name: 'system.user',
            parent_id: '100',
            perm_code: 'system:user:list',
            route_key: 'system.user',
            sort: 1,
            status: '1',
            visible: true,
          },
        ],
        id: '100',
        menu_type: 'M',
        name: 'system',
        route_key: 'system',
        sort: 1,
        status: '1',
        visible: true,
      },
    ],
    permissions: ['system:user:list', 'system:user:export'],
    roles: ['tester'],
    runtime_epoch: '7',
    user: {
      email: 'tester@example.com',
      id: '42',
      nickname: '测试用户',
      phone: '13800000000',
      tenant_id: 'default',
      tenant_name: '默认租户',
      username: 'tester',
    },
  }

  await page.routeWebSocket(/\/api\/v1\/ws(?:\?|$)/u, (socket) => {
    socket.onMessage((message) => {
      if (String(message).includes('"type":"ping"')) {
        socket.send(JSON.stringify({ type: 'pong', v: 1 }))
      }
    })
  })

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname.replace('/api/v1', '')
    const key = `${method} ${path}`

    if (key === 'GET /version') {
      await fulfillJson(route, {
        api_prefix: '/api/v1',
        endpoints: { openapi: '/api/v1/openapi.json', swagger: '/api/v1/swagger-ui', system: '/api/v1/system' },
        multi_tenancy_enabled: false,
        name: 'RyFrame API',
        source_commit: 'browser-smoke',
        version: '0.10.0',
      })
      return
    }
    if (key === 'GET /auth/csrf') {
      await fulfillJson(route, { csrf_token: 'csrf-smoke', expires_in: 300 })
      return
    }
    if (key === 'POST /auth/refresh') {
      await fulfillJson(route, undefined, 401)
      return
    }
    if (key === 'GET /auth/captcha/config') {
      await fulfillJson(route, { captcha_enabled: false })
      return
    }
    if (key === 'POST /auth/login') {
      const body = request.postDataJSON() as Record<string, unknown>
      expect(body).toMatchObject({ password: 'browser-secret', username: 'tester' })
      expect(request.headers()['x-csrf-token']).toBe('csrf-smoke')
      await fulfillJson(route, {
        access_token: 'access-token-smoke',
        expires_in: 900,
        session_context: sessionContext,
      })
      return
    }
    if (key === 'GET /system/depts/tree') {
      await fulfillJson(route, [])
      return
    }
    if (key === 'GET /system/users') {
      await fulfillJson(route, {
        items: [{
          created_at: NOW,
          dept_id: null,
          dept_name: '研发部',
          email: 'alice@example.com',
          id: '1001',
          nickname: 'Alice',
          phone: '13800000001',
          remark: null,
          status: '1',
          username: 'alice',
        }],
        max_page_size: 100,
        page: Number(url.searchParams.get('page') ?? 1),
        page_size: Number(url.searchParams.get('page_size') ?? 10),
        total: 21,
        total_pages: 3,
      })
      return
    }
    if (key === 'POST /system/users/exports') {
      exportBodies.push(request.postDataJSON())
      await fulfillJson(route, createJob('job-filtered', 'filtered-users.xlsx', 'queued'))
      return
    }
    if (key === 'GET /common/jobs') {
      await fulfillJson(route, jobs)
      return
    }
    if (key === 'GET /common/jobs/notifications/unread-count') {
      await fulfillJson(route, 0)
      return
    }
    if (key === 'POST /common/jobs/notifications/read') {
      await fulfillJson(route, 0)
      return
    }
    if (key === 'GET /system/messages') {
      await fulfillJson(route, { next_cursor: null, records: [] })
      return
    }
    if (key === 'GET /system/messages/unread-count') {
      await fulfillJson(route, 0)
      return
    }
    if (key === 'POST /auth/ws-ticket') {
      await fulfillJson(route, { ticket: 'socket-ticket' })
      return
    }
    if (key.startsWith('GET /system/configs/key/')) {
      await fulfillJson(route, path.endsWith('sideTheme') ? 'light' : 'default')
      return
    }
    if (method === 'GET' && /^\/common\/jobs\/[^/]+\/download$/u.test(path)) {
      await route.fulfill({
        body: 'xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers: { 'Content-Disposition': 'attachment; filename="users.xlsx"' },
        status: 200,
      })
      return
    }
    if (key === 'POST /common/jobs/deletions') {
      const body = request.postDataJSON() as { ids: string[] }
      const ids = [...new Set(body.ids)].sort()
      expect(ids.length).toBeGreaterThan(0)
      expect(request.headers()['idempotency-key']).toBeTruthy()
      deletionBodies.push({ ids })
      for (const id of ids) {
        const index = jobs.findIndex(job => job.id === id)
        if (index >= 0) jobs.splice(index, 1)
      }
      await fulfillJson(route, {
        accepted_count: ids.length,
        accepted_ids: ids,
        removed_unread_count: 0,
      }, 202)
      return
    }

    diagnostics.unhandledApi.push(`${key}${url.search}`)
    await fulfillJson(route, undefined, 500)
  })

  return { deletionBodies, exportBodies }
}

function observeDiagnostics(page: Page): BrowserDiagnostics {
  const diagnostics: BrowserDiagnostics = {
    console: [],
    httpErrors: [],
    pageErrors: [],
    requestFailures: [],
    unhandledApi: [],
  }
  page.on('console', (message) => {
    if (message.text().startsWith('Failed to load resource:')) return
    if (message.type() === 'error' || message.type() === 'warning') {
      diagnostics.console.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    const url = new URL(response.url())
    if (response.status() === 401 && url.pathname === '/api/v1/auth/refresh') return
    diagnostics.httpErrors.push(`${response.status()} ${url.pathname}`)
  })
  page.on('pageerror', error => diagnostics.pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    diagnostics.requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`)
  })
  return diagnostics
}

test('筛选后跨页导出并管理终态记录', async ({ page }) => {
  const diagnostics = observeDiagnostics(page)
  const { deletionBodies, exportBodies } = await installApiFixture(page, diagnostics)

  await page.goto('/login')
  await page.getByPlaceholder('用户名').fill('tester')
  await page.getByPlaceholder('密码').fill('browser-secret')
  await page.getByRole('button', { name: '登录', exact: true }).click()

  await expect(page).toHaveURL(/\/index$/u)
  await page.locator('.sidebar-container').getByText('系统管理', { exact: true }).click()
  await page.locator('.sidebar-container').getByText('用户管理', { exact: true }).click()
  await expect(page).toHaveURL(/\/system\/user$/u)
  await expect(page.getByText('alice', { exact: true })).toBeVisible()

  const filteredResponse = page.waitForResponse((response) => {
    const request = response.request()
    const url = new URL(response.url())
    return request.method() === 'GET'
      && url.pathname === '/api/v1/system/users'
      && url.searchParams.get('username')?.trim() === 'alice'
  })
  await page.getByPlaceholder('请输入用户名').fill('  alice  ')
  await page.locator('.search-card').getByRole('button', { name: '搜索', exact: true }).click()
  await filteredResponse
  await expect(page.getByText('共 21 条')).toBeVisible()

  const exportButton = page.locator('.card-header').getByRole('button', { name: '导出', exact: true })
  await expect(exportButton).toBeEnabled()
  const exportRequest = page.waitForRequest(request => (
    request.method() === 'POST'
    && new URL(request.url()).pathname === '/api/v1/system/users/exports'
  ))
  await exportButton.click()
  await exportRequest
  expect(exportBodies).toEqual([{ confirm_all: false, filter: { username: 'alice' } }])

  await page.getByRole('button', { name: '测试用户', exact: true }).click()
  await page.getByRole('menuitem', { name: '我的导出', exact: true }).click()
  await expect(page).toHaveURL(/\/profile\/exports$/u)
  const table = page.locator('.exports-desktop')
  const completedRow = table.getByRole('row').filter({ hasText: 'users.xlsx' })
  await expect(completedRow).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await completedRow.getByRole('button', { name: '下载', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('users.xlsx')

  await completedRow.getByRole('button', { name: '删除', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect(table.getByText('users.xlsx', { exact: true })).toHaveCount(0)
  expect(deletionBodies[0]).toEqual({ ids: ['job-1'] })

  await table.getByLabel('选择导出记录“roles.xlsx”').click()
  await table.getByLabel('选择导出记录“posts.xlsx”').click()
  await page.getByRole('button', { name: '删除所选（2）', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除', exact: true }).click()
  await expect(table.getByText('roles.xlsx', { exact: true })).toHaveCount(0)
  await expect(table.getByText('posts.xlsx', { exact: true })).toHaveCount(0)
  expect(deletionBodies[1]).toEqual({ ids: ['job-2', 'job-3'] })

  await page.waitForTimeout(200)
  expect(diagnostics.unhandledApi).toEqual([])
  expect(diagnostics.httpErrors).toEqual([])
  expect(diagnostics.pageErrors).toEqual([])
  expect(diagnostics.requestFailures).toEqual([])
  expect(diagnostics.console).toEqual([])
})
