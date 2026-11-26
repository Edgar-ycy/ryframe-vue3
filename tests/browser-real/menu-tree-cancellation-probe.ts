import { expect, type Page, type Request, type Response, type TestInfo } from '@playwright/test'
import { observeDiagnostics } from '../browser/support/diagnostics'
import { holdResponse } from './response-gate'
import { act } from './support'

export const menuTreePath = '/api/v1/system/menus/tree'
const contextPath = '/api/v1/auth/context'

type Scope = { tenantId: string; sessionEpoch: number; signal: AbortSignal }
type ScopeInfo = { tenant?: 'system' | 'other'; epoch?: number }
type AbortCause = ScopeInfo & { kind: 'session-scope' | 'query-cancel' | 'unknown' }
type Entry = ScopeInfo & {
  route: 'menu' | 'context'
  sequence: number
  stage: 'open' | 'abort' | 'response'
  time: number
  cause?: AbortCause
  status?: number
  requestId?: string
  authorizationEpoch?: string
}
type Snapshot = { scope: ScopeInfo; entries: Entry[] }
type Recorder = {
  bind: (readScope: () => Scope | undefined) => void
  snapshot: () => Snapshot
}
type ProbeWindow = Window & { menuTreeCancellationProbe: Recorder }

function installRecorder(paths: { menu: string; context: string }) {
  const xhr = XMLHttpRequest.prototype
  const open = xhr.open
  const abortXhr = xhr.abort
  const abortController = AbortController.prototype.abort
  const entries: Entry[] = []
  const requests = new WeakMap<XMLHttpRequest, Pick<Entry, 'route' | 'sequence'> & ScopeInfo>()
  let sequence = 0
  let readScope: (() => Scope | undefined) | undefined
  let cause: AbortCause | undefined

  function scopeInfo(scope = readScope?.()): ScopeInfo {
    return scope
      ? { tenant: scope.tenantId === 'system' ? 'system' : 'other', epoch: scope.sessionEpoch }
      : {}
  }

  function record(request: XMLHttpRequest, stage: Entry['stage'], extra: Partial<Entry> = {}) {
    const entry = requests.get(request)
    if (entry) entries.push({ ...entry, stage, time: performance.now(), ...extra })
  }

  function authorizationEpoch(request: XMLHttpRequest): string | undefined {
    try {
      const reply =
        request.responseType === 'json' ? request.response : JSON.parse(request.responseText)
      const value: unknown = reply?.data?.authorization_epoch
      return typeof value === 'string' && /^\d+$/u.test(value) ? value : undefined
    } catch {
      return undefined
    }
  }

  xhr.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const result = Reflect.apply(open, this, [method, url, ...rest])
    const target = new URL(url, location.href)
    if (method !== 'GET' || target.origin !== location.origin) return result
    const route =
      target.pathname === paths.menu
        ? 'menu'
        : target.pathname === paths.context
          ? 'context'
          : undefined
    if (!route) return result
    requests.set(this, { route, sequence: ++sequence, ...scopeInfo() })
    record(this, 'open')
    this.addEventListener(
      'load',
      () =>
        record(this, 'response', {
          status: this.status,
          requestId: this.getResponseHeader('x-request-id') ?? undefined,
          authorizationEpoch: route === 'context' ? authorizationEpoch(this) : undefined,
        }),
      { once: true },
    )
    return result
  }

  xhr.abort = function (this: XMLHttpRequest) {
    record(this, 'abort', { cause: cause ?? { kind: 'unknown' } })
    return Reflect.apply(abortXhr, this, [])
  }

  AbortController.prototype.abort = function (this: AbortController, reason?: unknown) {
    const scope = readScope?.()
    const stack = new Error().stack ?? ''
    const previous = cause
    cause = {
      ...scopeInfo(scope),
      kind:
        scope?.signal === this.signal
          ? 'session-scope'
          : /(?:@tanstack|query-core|retryer|queryObserver|queryClient)/u.test(stack)
            ? 'query-cancel'
            : 'unknown',
    }
    try {
      return Reflect.apply(abortController, this, [reason])
    } finally {
      cause = previous
    }
  }

  ;(window as ProbeWindow).menuTreeCancellationProbe = {
    bind: (reader) => {
      readScope = reader
    },
    snapshot: () => ({ scope: scopeInfo(), entries: entries.slice() }),
  }
}

export function isSystemMenuRead(request: Request): boolean {
  return (
    request.method() === 'GET' &&
    new URL(request.url()).pathname === menuTreePath &&
    request.headers()['x-tenant-id'] === 'system'
  )
}

interface MenuWrite {
  method: 'PUT' | 'DELETE'
  path: string
  submit: () => Promise<unknown>
  acceptsReplacement: (response: Response) => Promise<boolean>
}

export async function observeMenuTreeCancellation(
  page: Page,
  clientAddress: string,
  info: TestInfo,
) {
  let active: Awaited<ReturnType<typeof holdResponse>> | undefined
  const diagnostics = observeDiagnostics(
    page,
    (request) => isSystemMenuRead(request) && active?.request() === request,
  )
  await page.addInitScript(installRecorder, { menu: menuTreePath, context: contextPath })
  const snapshot = () =>
    page.evaluate(() => (window as ProbeWindow).menuTreeCancellationProbe.snapshot())

  async function verify(write: MenuWrite, loginAuthorizationEpoch: string): Promise<Response> {
    const before = await snapshot()
    expect(before.scope.tenant).toBe('system')
    expect(before.scope.epoch).toEqual(expect.any(Number))
    const cutoff = Math.max(0, ...before.entries.map((entry) => entry.sequence))
    const priorAuthorization =
      before.entries
        .slice()
        .reverse()
        .find((entry) => entry.authorizationEpoch)?.authorizationEpoch ?? loginAuthorizationEpoch
    const failures: Request[] = []
    const failed = (request: Request) => failures.push(request)
    const gate = await holdResponse(page, 'GET', menuTreePath, clientAddress)
    const network: { gateId?: string; errorText?: string; replacementId?: string } = {}
    active = gate
    page.on('requestfailed', failed)
    try {
      const [response, heldResponse, replacement] = await Promise.all([
        act(page, write.method, write.path, write.submit),
        gate.held(),
        page.waitForResponse(
          (value) =>
            value.request() !== gate.request() &&
            isSystemMenuRead(value.request()) &&
            value.status() === 200 &&
            write.acceptsReplacement(value),
        ),
      ])
      network.gateId = heldResponse.id
      expect(response.request().headers()['x-tenant-id']).toBe('system')
      const held = gate.request()
      expect(held && isSystemMenuRead(held)).toBe(true)
      await expect.poll(() => failures.filter((request) => request === held).length).toBe(1)
      network.errorText = held?.failure()?.errorText
      expect(network.errorText).toBe('net::ERR_ABORTED')

      const replacementId = replacement.headers()['x-request-id']
      network.replacementId = replacementId
      expect(replacementId).toMatch(/^[0-9a-f-]{36}$/u)
      await expect
        .poll(async () =>
          (await snapshot()).entries.some(
            (entry) =>
              entry.route === 'menu' &&
              entry.stage === 'response' &&
              entry.requestId === replacementId,
          ),
        )
        .toBe(true)
      const proof = (await snapshot()).entries.filter((entry) => entry.sequence > cutoff)
      const cancels = proof.filter((entry) => entry.route === 'menu' && entry.stage === 'abort')
      expect(cancels).toHaveLength(1)
      const cancelled = cancels[0]!
      const priorReads = proof.filter(
        (entry) => entry.route === 'menu' && entry.stage === 'open' && entry.time <= cancelled.time,
      )
      expect(priorReads.map((entry) => entry.sequence)).toEqual([cancelled.sequence])
      expect(cancelled).toMatchObject({
        tenant: 'system',
        epoch: expect.any(Number),
        cause: { tenant: 'system', epoch: cancelled.epoch },
      })
      expect(cancelled.epoch!).toBeGreaterThanOrEqual(before.scope.epoch!)
      expect(['session-scope', 'query-cancel']).toContain(cancelled.cause?.kind)
      const completed = proof.find((entry) => entry.requestId === replacementId)
      expect(completed).toMatchObject({
        route: 'menu',
        stage: 'response',
        status: 200,
        tenant: 'system',
      })
      expect(completed!.sequence).toBeGreaterThan(cancelled.sequence)
      expect(completed!.time).toBeGreaterThan(cancelled.time)
      if (cancelled.cause?.kind === 'query-cancel') expect(completed!.epoch).toBe(cancelled.epoch)
      else expect(completed!.epoch!).toBeGreaterThan(cancelled.epoch!)
      await expect
        .poll(async () => {
          const current = await snapshot()
          const context = current.entries.find(
            (entry) =>
              entry.sequence > cutoff &&
              entry.route === 'context' &&
              entry.stage === 'response' &&
              entry.status === 200 &&
              entry.authorizationEpoch &&
              BigInt(entry.authorizationEpoch) > BigInt(priorAuthorization),
          )
          return (
            current.scope.tenant === 'system' &&
            Number(current.scope.epoch) > Number(before.scope.epoch) &&
            Boolean(
              context &&
              current.entries.some(
                (entry) =>
                  entry.route === 'menu' &&
                  entry.stage === 'response' &&
                  entry.status === 200 &&
                  entry.epoch === current.scope.epoch &&
                  entry.time >= context.time,
              ),
            )
          )
        })
        .toBe(true)

      await expect.poll(async () => Boolean((await gate.held()).clientClosedAt)).toBe(true)
      expect((await gate.release()).state).toBe('client-closed')
      return response
    } finally {
      active = undefined
      page.off('requestfailed', failed)
      try {
        const result = await snapshot()
        await info.attach(`menu-tree-${write.method.toLowerCase()}-cancellation`, {
          body: JSON.stringify(
            {
              before: before.scope,
              after: result.scope,
              network,
              entries: result.entries.filter((entry) => entry.sequence > cutoff),
            },
            null,
            2,
          ),
          contentType: 'application/json',
        })
      } finally {
        await gate.finish(info)
      }
    }
  }

  return {
    diagnostics,
    verify,
    async bindScope() {
      await page.evaluate(async () => {
        const modulePath = '/src/shared/query/client.ts'
        const module: { getServerStateScope: () => Scope | undefined } = await import(modulePath)
        ;(window as ProbeWindow).menuTreeCancellationProbe.bind(module.getServerStateScope)
      })
    },
  }
}
