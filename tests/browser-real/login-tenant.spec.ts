import { test } from './fixture'
import { expect, type BrowserContext, type Response } from '@playwright/test'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { OperationData, OperationJsonResponse } from '@/api/contract'
import { act, credentials, isolatedName, login, submitLogin } from './support'
import { createPublishedPlan, createTenantFromPlan, readTenantSearchPage } from './tenant-support'
import { observeRequestBudget } from './request-budget'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

test.describe('真实租户名称查询与第二页登录', () => {
  // 创建结果未知时保留现场，不能通过重新运行整场景重放写入。
  test.describe.configure({ retries: 0 })

  test('名称搜索返回完整两页并以第二页租户的初始账号登录', async ({
    page,
    newClientContext,
    clientAddress,
  }, info) => {
    const adminDiagnostics = observeDiagnostics(page)
    const adminBudget = observeRequestBudget(page)
    const search = isolatedName('tenant-search')
    const plan = { planName: isolatedName('套餐'), planKey: isolatedName('plan') }
    const receipt = {
      search,
      plan,
      planned_ids: Array.from(
        { length: 21 },
        (_, index) => `${search}-${String(index + 1).padStart(2, '0')}`,
      ),
      created_ids: [] as string[],
      pages: [] as Awaited<ReturnType<typeof readTenantSearchPage>>[],
      selected: null as string | null,
      result: null as {
        status: number
        tenant_id: string
        username: string
        password_change_required: boolean
        path: string
      } | null,
      phase: 'creating',
    }
    const receiptPath = info.outputPath('tenant-search.json')
    await mkdir(path.dirname(receiptPath), { recursive: true })
    const failures: unknown[] = []
    const pending: Promise<void>[] = []
    let ownerContext: BrowserContext | undefined
    let ownerDiagnostics: typeof adminDiagnostics | undefined
    let saving = Promise.resolve()
    const save = () => {
      saving = saving.then(async () => {
        await writeFile(
          `${receiptPath}.tmp`,
          JSON.stringify(
            { ...receipt, diagnostics: { admin: adminDiagnostics, owner: ownerDiagnostics } },
            null,
            2,
          ) + '\n',
        )
        await rename(`${receiptPath}.tmp`, receiptPath)
      })
      return saving
    }
    const capture = (response: Response) => {
      if (
        response.request().method() !== 'POST' ||
        new URL(response.url()).pathname !== '/api/v1/platform/tenants'
      )
        return
      pending.push(
        (async () => {
          const body: OperationJsonResponse<'post_platform_tenants'> = await response.json()
          if (body.data) receipt.created_ids.push(body.data.tenant_id)
          await save()
        })().catch((error) => {
          failures.push(error)
        }),
      )
    }
    page.on('response', capture)
    try {
      // 写入前登记全部独占标识；下一次写入先等实际创建响应落盘并预留同一客户预算。
      await save()
      await adminBudget.beforePageBootstrap()
      await login(page)
      const beforeWrite = async () => {
        await Promise.all(pending)
        if (failures.length) throw new AggregateError(failures, '创建收据未保存，禁止继续写入')
        await adminBudget.beforeProvisioning()
      }
      const published = await createPublishedPlan(page, plan, beforeWrite)
      for (const tenant of receipt.planned_ids) {
        await createTenantFromPlan(page, tenant, published, 'shared-control', beforeWrite)
      }
      await Promise.all(pending)
      expect([...receipt.created_ids].sort()).toEqual([...receipt.planned_ids].sort())
      receipt.phase = 'searching'
      await save()

      ownerContext = await newClientContext(clientAddress.replace('198.18.', '198.19.'))
      const owner = await ownerContext.newPage()
      ownerDiagnostics = observeDiagnostics(owner)
      const ownerBudget = observeRequestBudget(owner)
      await ownerBudget.beforePageBootstrap()
      await owner.goto('/login')
      const select = owner.getByRole('combobox', { name: '请选择租户名称' })
      await expect(select).toBeVisible()
      await owner.waitForLoadState('networkidle')
      await select.click()
      await owner.waitForLoadState('networkidle')
      const first = await readTenantSearchPage(
        await act(owner, 'GET', '/api/v1/auth/tenants', () => select.fill(search)),
        search,
        1,
      )
      receipt.pages.push(first)
      await save()
      expect(first.items).toHaveLength(20)
      expect(first.has_more).toBe(true)
      const more = owner.getByRole('button', { name: '加载更多租户', exact: true })
      const second = await readTenantSearchPage(
        await act(owner, 'GET', '/api/v1/auth/tenants', () => more.click()),
        search,
        2,
      )
      receipt.pages.push(second)
      await save()
      expect(second.items).toHaveLength(1)
      expect(second.has_more).toBe(false)
      const items: OperationData<'get_auth_tenants'>['items'] = [...first.items, ...second.items]
      expect(items.map((item) => item.tenant_id).sort()).toEqual([...receipt.created_ids].sort())
      expect(items.map((item) => item.name).sort()).toEqual([...receipt.planned_ids].sort())
      await expect(more).not.toBeVisible()
      const selected = second.items[0]!.tenant_id
      receipt.selected = selected
      await save()
      await owner.getByTestId(`login-tenant-${selected}`).click()
      await owner.waitForLoadState('networkidle')
      await owner.getByPlaceholder('用户名').fill('owner')
      await owner.getByPlaceholder('密码').fill('Valid!Owner123')
      const captcha = owner.getByPlaceholder('验证码')
      if (await captcha.isVisible()) {
        expect(credentials.captchaCode, '验证码启用时必须提供真实验证码').toBeTruthy()
        await captcha.fill(credentials.captchaCode ?? '')
      }
      const response = await submitLogin(owner, {
        ...credentials,
        tenantId: selected,
        username: 'owner',
        password: 'Valid!Owner123',
      })
      const body: OperationJsonResponse<'post_auth_login'> = await response.json()
      const session = body.data?.session_context
      expect(session).toMatchObject({
        user: { tenant_id: selected, username: 'owner' },
        password_change_required: true,
      })
      await expect(owner).toHaveURL(/\/change-password$/u)
      await expect(owner.getByRole('heading', { name: '修改初始密码', exact: true })).toBeVisible()
      await expect(owner.locator('main.workspace')).toHaveCount(0)
      if (!session) throw new Error('初始账号登录未返回会话上下文')
      receipt.result = {
        status: response.status(),
        tenant_id: session.user.tenant_id,
        username: session.user.username,
        password_change_required: session.password_change_required,
        path: new URL(owner.url()).pathname,
      }
      await expectCleanDiagnostics(page, adminDiagnostics)
      await expectCleanDiagnostics(owner, ownerDiagnostics)
      receipt.phase = 'verified'
    } catch (error) {
      failures.push(error)
    } finally {
      page.off('response', capture)
      await Promise.all(pending)
      if (receipt.phase !== 'verified' || failures.length) receipt.phase = 'needs-reconciliation'
      try {
        await save()
        await info.attach('tenant-search', { path: receiptPath, contentType: 'application/json' })
      } catch (error) {
        failures.push(error)
      }
      try {
        await ownerContext?.close()
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length)
      throw new AggregateError(failures, '真实租户搜索或首次登录失败，保留现场且不重放写入')
  })
})
