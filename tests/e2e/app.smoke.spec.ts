import { expect, test, type Page, type Route } from '@playwright/test'

const apiBasePath = '/api/v1'

interface ApiMockState {
  unexpectedRequests: string[]
  generationRequests: unknown[]
  avatarDownloads: Array<{
    path: string | null
    bucket: string | null
    authorization: string | undefined
    tenantId: string | undefined
  }>
}

const avatarPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

function protectedAvatarUrl(filename: string): string {
  return `${apiBasePath}/common/file/download?bucket=avatar&path=system/2026/07/17/${filename}`
}

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  })
}

async function installApiMocks(page: Page): Promise<ApiMockState> {
  const unexpectedRequests: string[] = []
  const generationRequests: unknown[] = []
  const avatarDownloads: ApiMockState['avatarDownloads'] = []
  let avatarUrl = protectedAvatarUrl('old-avatar.png')

  await page.route(`**${apiBasePath}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const key = `${request.method()} ${url.pathname}`

    switch (key) {
      case `GET ${apiBasePath}/auth/captcha/config`:
        await json(route, { code: 200, msg: 'ok', data: { captcha_enabled: false } })
        return
      case `POST ${apiBasePath}/auth/login`: {
        const body = request.postDataJSON() as Record<string, unknown>
        const valid = request.headers()['x-tenant-id'] === 'system'
          && body.username === 'operator'
          && body.password === 'Strong@123'
        if (!valid) {
          await json(route, { code: 401, msg: 'invalid test credentials' }, 401)
          return
        }
        await json(route, {
          code: 200,
          msg: 'ok',
          data: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            user_info: {
              id: '1001',
              tenant_id: 'system',
              tenant_name: '系统租户',
              username: 'operator',
              nickname: '测试用户',
              email: 'operator@example.com',
              phone: '13800000000',
              avatar: null,
              roles: ['operator'],
              perms: ['system:dict:list', 'monitor:runtime:list', 'tools:gen:list', 'tools:gen:add'],
            },
          },
        })
        return
      }
      case `POST ${apiBasePath}/auth/logout`:
        await json(route, { code: 200, msg: 'ok' })
        return
      case `GET ${apiBasePath}/auth/me`:
        await json(route, {
          code: 200,
          msg: 'ok',
          data: {
            id: '1001',
            tenant_id: 'system',
            tenant_name: '系统租户',
            dept_name: '测试部门',
            username: 'operator',
            nickname: '测试用户',
            email: 'operator@example.com',
            phone: '13800000000',
            avatar: null,
            roles: ['operator'],
            perms: ['system:dict:list', 'monitor:runtime:list', 'tools:gen:list', 'tools:gen:add'],
          },
        })
        return
      case `GET ${apiBasePath}/auth/profile`:
        await json(route, {
          code: 200,
          msg: 'ok',
          data: {
            user_id: '1001',
            username: 'operator',
            nickname: '测试用户',
            email: 'operator@example.com',
            phone: '13800000000',
            avatar: avatarUrl,
            dept_name: '测试部门',
            roles: ['operator'],
            permissions: ['system:dict:list'],
            status: '1',
            created_at: '2026-07-17T00:00:00Z',
          },
        })
        return
      case `PUT ${apiBasePath}/auth/profile/avatar`:
        avatarUrl = protectedAvatarUrl('new-avatar.png')
        await json(route, {
          code: 200,
          msg: 'ok',
          data: { avatar_url: avatarUrl },
        })
        return
      case `GET ${apiBasePath}/common/file/download`: {
        const headers = request.headers()
        avatarDownloads.push({
          path: url.searchParams.get('path'),
          bucket: url.searchParams.get('bucket'),
          authorization: headers.authorization,
          tenantId: headers['x-tenant-id'],
        })
        if (headers.authorization !== 'Bearer access-token' || headers['x-tenant-id'] !== 'system') {
          await json(route, { code: 401, msg: 'missing authentication' }, 401)
          return
        }
        await route.fulfill({ status: 200, contentType: 'image/png', body: avatarPng })
        return
      }
      case `GET ${apiBasePath}/system/menus/current`:
        await json(route, {
          code: 200,
          msg: 'ok',
          data: [
            {
              id: '2000',
              name: '系统管理',
              route_key: 'system',
              menu_type: 'M',
              icon: 'Setting',
              sort: 1,
              status: '1',
              visible: true,
              children: [
                {
                  id: '2001',
                  name: '字典管理',
                  route_key: 'system.dict',
                  menu_type: 'C',
                  perm_code: 'system:dict:list',
                  icon: 'Collection',
                  sort: 1,
                  status: '1',
                  visible: true,
                  children: [],
                },
              ],
            },
            {
              id: '2100',
              name: '系统监控',
              route_key: 'monitor',
              menu_type: 'M',
              icon: 'Monitor',
              sort: 2,
              status: '1',
              visible: true,
              children: [
                {
                  id: '2101',
                  name: '运行时状态',
                  route_key: 'monitor.runtime',
                  menu_type: 'C',
                  perm_code: 'monitor:runtime:list',
                  icon: 'DataLine',
                  sort: 1,
                  status: '1',
                  visible: true,
                  children: [],
                },
              ],
            },
            {
              id: '2200',
              name: '系统工具',
              route_key: 'tools',
              menu_type: 'M',
              icon: 'Tools',
              sort: 3,
              status: '1',
              visible: true,
              children: [
                {
                  id: '2201',
                  name: '代码生成',
                  route_key: 'tools.gen',
                  menu_type: 'C',
                  perm_code: 'tools:gen:list',
                  icon: 'MagicStick',
                  sort: 1,
                  status: '1',
                  visible: true,
                  children: [],
                },
              ],
            },
          ],
        })
        return
      case `GET ${apiBasePath}/monitor/runtime`:
        await json(route, {
          code: 200,
          msg: 'ok',
          data: {
            database: {
              connected: true,
              driver: 'mysql',
              primary_connected: true,
              replica_count: 0,
              replicas: [],
              source_count: 1,
              sources: [{ name: 'ryframe_device', connected: true }],
              read_policy: 'primary',
            },
            redis: { configured: true, connected: true },
            object_storage: {
              backend: 'rustfs',
              connected: true,
              endpoint: 'http://127.0.0.1:9000',
            },
            upload_circuit_breaker: { state: 'Closed' },
          },
        })
        return
      case `GET ${apiBasePath}/system/dict/types`:
        await json(route, {
          code: 200,
          msg: 'ok',
          rows: [
            { id: '3001', name: '登录状态', code: 'sys_common_status', status: '1' },
          ],
          total: 1,
        })
        return
      case `GET ${apiBasePath}/system/dict/data`:
        await json(route, {
          code: 200,
          msg: 'ok',
          data: [
            {
              id: '4001',
              type_code: 'sys_common_status',
              label: '成功',
              value: '1',
              sort: 1,
              status: '1',
            },
          ],
        })
        return
      case `GET ${apiBasePath}/system/configs/key/sys.index.sideTheme`:
        await json(route, { code: 200, msg: 'ok', data: 'theme-light' })
        return
      case `GET ${apiBasePath}/system/configs/key/sys.index.skinName`:
        await json(route, { code: 200, msg: 'ok', data: 'blue' })
        return
      case `GET ${apiBasePath}/tools/gen/tables`:
        await json(route, {
          code: 200,
          msg: 'ok',
          rows: [{ table_name: 'sys_device', comment: '设备', columns: [{ name: 'id' }] }],
          total: 1,
        })
        return
      case `POST ${apiBasePath}/tools/gen/generate`:
        generationRequests.push(request.postDataJSON())
        await json(route, {
          code: 200,
          msg: 'ok',
          data: { written: ['src/entities/device.rs'], skipped: [] },
        })
        return
      default:
        unexpectedRequests.push(key)
        await json(route, { code: 500, msg: `unexpected request: ${key}` }, 500)
    }
  })

  return { unexpectedRequests, generationRequests, avatarDownloads }
}

function collectRuntimeIssues(page: Page): string[] {
  const issues: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      issues.push(`console.${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`))
  return issues
}

async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByPlaceholder('租户标识').fill('system')
  await page.getByPlaceholder('用户名').fill('operator')
  await page.getByPlaceholder('密码').fill('Strong@123')
  await Promise.all([
    page.waitForURL('**/index'),
    page.getByRole('button', { name: '登录', exact: true }).click(),
  ])
  await expect(page.getByRole('heading', { name: '你好，测试用户' })).toBeVisible()
}

test('login, dynamic menu, permission denial and logout stay warning-free', async ({ page }) => {
  const { unexpectedRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.getByRole('button', { name: '字典管理', exact: true }).click()
  await expect(page).toHaveURL(/\/system\/dict$/)
  await expect(page.getByText('登录状态', { exact: true })).toBeVisible()

  await page.getByText('登录状态', { exact: true }).click()
  await expect(page.getByText('字典数据 — 登录状态', { exact: true })).toBeVisible()
  await expect(page.getByText('成功', { exact: true })).toBeVisible()

  await page.goto('/platform/tenants')
  await expect(page).toHaveURL(/\/403$/)
  await expect(page.getByRole('heading', { name: '403' })).toBeVisible()

  await page.goto('/index')
  await page.getByText('测试用户', { exact: true }).click()
  await page.getByText('退出登录', { exact: true }).click()
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)

  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('code generation requires an external output path before submitting', async ({ page }) => {
  const { unexpectedRequests, generationRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.goto('/tools/gen')
  await expect(page.getByText('sys_device', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '生成', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '生成代码' })
  await expect(dialog).toBeVisible()
  expect(generationRequests).toEqual([])

  await dialog.getByRole('button', { name: '生成', exact: true }).click()
  await expect(dialog.getByText('请输入服务端输出目录', { exact: true })).toBeVisible()
  expect(generationRequests).toEqual([])

  const outputDir = String.raw`D:\generated\ryframe-device`
  await dialog.getByPlaceholder('请输入绝对路径').fill(outputDir)
  await dialog.getByRole('button', { name: '生成', exact: true }).click()

  await expect(page.getByText('已写入 1 个文件', { exact: true })).toBeVisible()
  await expect(dialog).toBeHidden()
  expect(generationRequests).toEqual([
    {
      output_dir: outputDir,
      options: { tables: ['sys_device'] },
    },
  ])
  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('avatar upload refreshes every private image through authenticated downloads', async ({ page }) => {
  const { avatarDownloads, unexpectedRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.goto('/profile')

  const profileAvatar = page.locator('.avatar-preview img')
  const navbarAvatar = page.locator('.navbar .el-avatar img')
  await expect(profileAvatar).toHaveAttribute('src', /^blob:/)
  await expect(navbarAvatar).toHaveAttribute('src', /^blob:/)
  const oldProfileSrc = await profileAvatar.getAttribute('src')
  const downloadsBeforeUpload = avatarDownloads.length

  await page.locator('.avatar-uploader input[type="file"]').setInputFiles({
    name: 'new-avatar.png',
    mimeType: 'image/png',
    buffer: avatarPng,
  })

  await expect(page.getByText('头像更新成功', { exact: true })).toBeVisible()
  await expect.poll(() => profileAvatar.getAttribute('src')).not.toBe(oldProfileSrc)
  await expect(profileAvatar).toHaveAttribute('src', /^blob:/)
  await expect(navbarAvatar).toHaveAttribute('src', /^blob:/)
  await expect.poll(
    () => avatarDownloads.slice(downloadsBeforeUpload)
      .filter(download => download.path?.endsWith('/new-avatar.png')).length,
  ).toBeGreaterThanOrEqual(2)

  expect(avatarDownloads).not.toHaveLength(0)
  expect(avatarDownloads.every(download => (
    download.bucket === 'avatar'
    && download.authorization === 'Bearer access-token'
    && download.tenantId === 'system'
  ))).toBe(true)
  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('profile and dictionary layouts stack without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { unexpectedRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.goto('/profile')
  await expect(page.getByText('基本信息', { exact: true })).toBeVisible()

  const profileLayout = await page.evaluate(() => {
    const root = document.documentElement
    const layout = document.querySelector('.profile-layout')
    const first = layout?.children.item(0)?.getBoundingClientRect()
    const second = layout?.children.item(1)?.getBoundingClientRect()
    return {
      horizontalOverflow: root.scrollWidth > innerWidth + 1,
      stacked: Boolean(first && second && second.top >= first.bottom),
    }
  })
  expect(profileLayout).toEqual({ horizontalOverflow: false, stacked: true })

  await page.goto('/system/dict')
  await expect(page.getByText('登录状态', { exact: true })).toBeVisible()
  const dictionaryLayout = await page.evaluate(() => {
    const root = document.documentElement
    const layout = document.querySelector('.dict-layout')
    const first = layout?.children.item(0)?.getBoundingClientRect()
    const second = layout?.children.item(1)?.getBoundingClientRect()
    return {
      horizontalOverflow: root.scrollWidth > innerWidth + 1,
      stacked: Boolean(first && second && second.top >= first.bottom),
    }
  })
  expect(dictionaryLayout).toEqual({ horizontalOverflow: false, stacked: true })

  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})

test('runtime topology exposes ryframe_device and RustFS without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { unexpectedRequests } = await installApiMocks(page)
  const runtimeIssues = collectRuntimeIssues(page)

  await login(page)
  await page.goto('/monitor/runtime')

  await expect(page.getByRole('heading', { name: '数据库拓扑' })).toBeVisible()
  await expect(page.getByText('主库读取', { exact: true })).toBeVisible()
  await expect(page.getByText('ryframe_device', { exact: true })).toBeVisible()
  await expect(page.getByText('业务数据源', { exact: true })).toBeVisible()
  await expect(page.getByText('RUSTFS', { exact: true })).toBeVisible()
  await expect(page.getByText('http://127.0.0.1:9000', { exact: true })).toBeVisible()

  const layout = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    nodeRows: document.querySelectorAll('.topology-section .el-table__row').length,
  }))
  expect(layout).toEqual({ horizontalOverflow: false, nodeRows: 2 })
  expect(unexpectedRequests).toEqual([])
  expect(runtimeIssues).toEqual([])
})
