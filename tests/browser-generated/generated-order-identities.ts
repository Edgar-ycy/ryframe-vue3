import { expect, type BrowserContext, type Page } from '@playwright/test'
import type { SessionResources } from '../../scripts/browser-session-resources.mjs'
import { act, credentials, login } from '../browser-real/support'
import {
  createOrdinaryUser,
  createWriterRole,
  openIdentityPage,
  setRolePermissions,
} from '../browser-real/session-identities'
import { observeSession } from '../browser-real/session-observation'
import { observeRequestBudget } from '../browser-real/request-budget'
import { orderPermissions } from './generated-order-page'

async function restrictToOwner(
  admin: Page,
  role: string,
  diagnostics: ReturnType<typeof observeSession>,
) {
  await openIdentityPage(admin, 'role')
  const row = admin.locator('.el-table__body tr').filter({ hasText: role })
  await act(admin, 'GET', /\/system\/roles\/\d+$/u, () =>
    row.getByRole('button', { name: '数据权限', exact: true }).click(),
  )
  const dialog = admin.getByRole('dialog', { name: '设置数据权限', exact: true })
  await dialog.getByRole('combobox').click()
  await admin.getByRole('option', { name: '仅本人数据', exact: true }).click()
  const refreshed = admin.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/v1/auth/context',
  )
  const response = await act(admin, 'PUT', /\/system\/roles\/\d+\/data-scope$/u, () =>
    dialog.getByRole('button', { name: '确定', exact: true }).click(),
  )
  expect(response.request().postDataJSON()).toMatchObject({ data_scope: '5' })
  expect((await refreshed).status()).toBe(200)
  await expect(dialog).not.toBeVisible()
  await admin.waitForLoadState('networkidle')
  await diagnostics.verify()
}

export async function prepareOrderUsers(
  admin: Page,
  newContext: (address: string) => Promise<BrowserContext>,
  address: string,
  resources: SessionResources,
  budget: ReturnType<typeof observeRequestBudget>,
) {
  const diagnostics = observeSession(admin)
  await budget.beforePageBootstrap()
  await login(admin)
  await budget.beforeProvisioning()
  const role = await createWriterRole(admin, diagnostics, resources)
  await budget.beforeProvisioning()
  await setRolePermissions(admin, role, orderPermissions, diagnostics)
  await restrictToOwner(admin, role, diagnostics)
  const activation = await newContext(address)
  const identities = []
  for (let index = 0; index < 2; index++) {
    await budget.beforeProvisioning()
    identities.push(await createOrdinaryUser(admin, activation, role, resources, budget))
  }
  const actors = []
  for (const identity of identities) {
    const context = await newContext(address)
    const page = await context.newPage()
    budget.observePage(page)
    const diagnostics = observeSession(page)
    await budget.beforePageBootstrap()
    const loggedIn = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/v1/auth/login',
    )
    await login(page, identity)
    const initial = (await (await loggedIn).json()).data.session_context
    expect(initial).toMatchObject({
      is_super_admin: false,
      password_change_required: false,
      user: { username: identity.username, tenant_id: credentials.tenantId },
    })
    expect(initial.permissions).toEqual(expect.arrayContaining(orderPermissions))
    expect(initial.user.id).toMatch(/^[1-9][0-9]*$/u)
    actors.push({ context, page, diagnostics, identity, initial })
  }
  expect(actors).toHaveLength(2)
  expect(actors[0]!.initial.user.id).not.toBe(actors[1]!.initial.user.id)
  return { role, actors, diagnostics }
}
