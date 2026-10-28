import {
  expect,
  type BrowserContext,
  type Page,
  type Request,
  type Response,
} from '@playwright/test'
import { createTenantWithPlan } from '../browser-real/tenant-support'
import { credentials, isolatedName, login } from '../browser-real/support'
import { changeInitialPassword } from '../browser-real/password-lifecycle-support'
import { observeSession } from '../browser-real/session-observation'
import type { observeRequestBudget } from '../browser-real/request-budget'
import { migrateOrders } from '../browser-business/migration-support'

export type Budget = ReturnType<typeof observeRequestBudget>
export type TenantReceipt = {
  tenant: string
  planKey: string
  planName: string
  target: string
  phase: string
  owner_id?: string
  writes: {
    path: string
    status: number
    id?: string
    tenant_id?: string
    plan_id?: string
    version?: number
  }[]
}

export async function provisionTenant(
  admin: Page,
  target: string,
  receipts: TenantReceipt[],
  save: () => Promise<void>,
  budget: Budget,
) {
  const receipt: TenantReceipt = {
    tenant: isolatedName('tenant'),
    planKey: isolatedName('plan'),
    planName: isolatedName('迁移套餐'),
    target,
    phase: 'creating',
    writes: [],
  }
  receipts.push(receipt)
  // 在任何套餐、版本或租户写入之前登记完整标识；失败不重新生成并重试。
  await save()
  const pending: Promise<void>[] = []
  const failures: unknown[] = []
  const capture = (response: Response) => {
    const path = new URL(response.url()).pathname
    if (
      response.request().method() !== 'POST' ||
      !/^\/api\/v1\/platform\/(product-plans(?:\/.*)?|tenants)$/u.test(path)
    )
      return
    pending.push(
      (async () => {
        const body = await response.json()
        const data = body.data
        receipt.writes.push({
          path,
          status: response.status(),
          ...(typeof data?.id === 'string' ? { id: data.id } : {}),
          ...(typeof data?.tenant_id === 'string' ? { tenant_id: data.tenant_id } : {}),
          ...(typeof data?.plan_id === 'string' ? { plan_id: data.plan_id } : {}),
          ...(typeof data?.version === 'number' ? { version: data.version } : {}),
        })
        await save()
      })().catch((error) => {
        failures.push(error)
      }),
    )
  }
  admin.on('response', capture)
  try {
    await budget.beforeProvisioning()
    await createTenantWithPlan(admin, target, receipt, async () => {
      // 先等前一步实际响应落盘，不能让尚在解析的收据越过下一次写入。
      await Promise.all(pending)
      if (failures.length) throw new AggregateError(failures, '前一步收据未持久化，禁止继续写入')
      await save()
    })
    receipt.phase = 'created'
  } catch (error) {
    failures.push(error)
  } finally {
    admin.off('response', capture)
    await Promise.all(pending)
    if (receipt.phase !== 'created' || failures.length) receipt.phase = 'needs-reconciliation'
    await save()
  }
  if (failures.length) throw new AggregateError(failures, '租户准备失败，不重放写入')
  return receipt
}

export async function activateOwner(
  context: BrowserContext,
  receipt: TenantReceipt,
  save: () => Promise<void>,
  budget: Budget,
) {
  const page = await context.newPage()
  budget.observePage(page)
  const diagnostics = observeSession(page)
  const traffic = observeOwnerTraffic(page)
  const identity = {
    ...credentials,
    tenantId: receipt.tenant,
    username: 'owner',
    password: 'Valid!OwnerChanged123',
  }
  receipt.phase = 'activating-owner'
  await save()
  await changeInitialPassword(context, identity, budget, 'Valid!Owner123')
  await budget.beforePageBootstrap()
  const signedIn = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/login',
  )
  await login(page, identity)
  const session = (await (await signedIn).json()).data.session_context
  expect(session).toMatchObject({
    password_change_required: false,
    user: { tenant_id: receipt.tenant, username: 'owner' },
  })
  expect(session.user.id).toMatch(/^[1-9][0-9]*$/u)
  receipt.owner_id = session.user.id
  receipt.phase = 'owner-active'
  await save()
  return { page, diagnostics, traffic }
}

export async function migrateRecorded(
  admin: Page,
  tenant: string,
  source: string,
  target: string,
  evidence: { intent?: unknown; created?: unknown; completed?: unknown },
  save: () => Promise<void>,
) {
  evidence.intent = { tenant, source, target, operation: 'migrate', phase: 'pending' }
  await save()
  const pending: Promise<void>[] = []
  const failures: unknown[] = []
  const capture = (response: Response) => {
    if (
      response.request().method() !== 'POST' ||
      new URL(response.url()).pathname !== `/api/v1/platform/tenants/${tenant}/data-migrations`
    )
      return
    pending.push(
      (async () => {
        // 保存实际响应而非猜测任务 ID；未知结果保留 intent，不重发创建。
        evidence.created = { status: response.status(), data: (await response.json()).data }
        await save()
      })().catch((error) => {
        failures.push(error)
      }),
    )
  }
  admin.on('response', capture)
  let completed: Awaited<ReturnType<typeof migrateOrders>> | undefined
  try {
    const migration = await migrateOrders(admin, tenant, source, target)
    evidence.completed = migration
    await save()
    completed = migration
  } catch (error) {
    failures.push(error)
  } finally {
    admin.off('response', capture)
    await Promise.all(pending)
    await save()
  }
  if (failures.length)
    throw new AggregateError(failures, '迁移失败，保留 intent 与实际响应，不重放')
  if (!completed) throw new Error('迁移未取得完成收据')
  return completed
}

/** 被动记录真实上下文和列表请求，不保存认证正文或请求头凭据。 */
function observeOwnerTraffic(page: Page) {
  type Context = {
    business_data: { state: string; placement_generation: string }
    runtime_epoch: string
    authorization_epoch: string
  }
  type Entry = {
    kind: string
    started_ms: number
    received_ms?: number
    network_started_ms?: number
    status?: number
    request_id?: string
    context?: Context
    observed_context?: Context
  }
  const entries: Entry[] = []
  const requests = new WeakMap<Request, Entry>()
  const pending: Promise<void>[] = []
  const failures: string[] = []
  let latest: Context | undefined
  let overflow = false
  const request = (value: Request) => {
    const path = new URL(value.url()).pathname
    if (
      value.method() !== 'GET' ||
      !['/api/v1/auth/context', '/api/v1/business/order/order'].includes(path)
    )
      return
    if (entries.length >= 192) {
      overflow = true
      return
    }
    const entry = {
      kind: path.endsWith('/auth/context') ? 'auth-context' : 'order-get',
      started_ms: Date.now(),
      observed_context: latest,
    }
    entries.push(entry)
    requests.set(value, entry)
  }
  const response = (value: Response) => {
    const entry = requests.get(value.request())
    if (!entry) return
    entry.received_ms = Date.now()
    entry.network_started_ms = value.request().timing().startTime
    entry.status = value.status()
    pending.push(
      (async () => {
        entry.request_id = (await value.headerValue('x-request-id')) ?? undefined
        if (entry.kind === 'order-get' && !entry.request_id)
          entry.request_id = (await value.json()).request_id
        if (entry.kind === 'order-get' && !entry.request_id) throw new Error('响应缺少 request_id')
        if (entry.kind === 'auth-context' && value.status() === 200) {
          const context = (await value.json()).data
          latest = {
            business_data: context.business_data,
            runtime_epoch: context.runtime_epoch,
            authorization_epoch: context.authorization_epoch,
          }
          entry.context = latest
        }
      })().catch(() => {
        if (failures.length < 16) failures.push('无法读取实际上下文或请求标识')
      }),
    )
  }
  page.on('request', request)
  page.on('response', response)
  return {
    latest: () => latest,
    snapshot: () => ({ clock: 'Date.now 毫秒', entries, overflow, failures }),
    flush: async () => {
      await Promise.all(pending)
    },
    stop: () => {
      page.off('request', request)
      page.off('response', response)
    },
  }
}
