import { expect, test, type Page, type Route } from '@playwright/test'

const apiBasePath = '/api/v1'

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  })
}

async function installApiMocks(page: Page): Promise<string[]> {
  const unexpectedRequests: string[] = []

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
              perms: ['system:dict:list', 'monitor:runtime:list'],
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
            perms: ['system:dict:list', 'monitor:runtime:list'],
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
            avatar: null,
            dept_name: '测试部门',
            roles: ['operator'],
            permissions: ['system:dict:list'],
            status: '1',
            created_at: '2026-07-17T00:00:00Z',
          },
        })
        return
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
      default:
        unexpectedRequests.push(key)
        await json(route, { code: 500, msg: `unexpected request: ${key}` }, 500)
    }
  })

  return unexpectedRequests
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
  const unexpectedRequests = await installApiMocks(page)
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

test('profile and dictionary layouts stack without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const unexpectedRequests = await installApiMocks(page)
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
  const unexpectedRequests = await installApiMocks(page)
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
