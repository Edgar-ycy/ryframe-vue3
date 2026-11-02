import { EventEmitter } from 'node:events'
import type { Page, Request } from '@playwright/test'
import { expect, it, vi } from 'vitest'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'

it('诊断脱敏 URL 凭据但保留 warning 类别、路径、条数与失败状态', async () => {
  const events = Object.assign(new EventEmitter(), {
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
  })
  const page = events as unknown as Page
  const diagnostics = observeDiagnostics(page)
  const warning =
    "WebSocket connection to 'ws://localhost/api/v1/ws?ticket=PRIVATE-TICKET&token=PRIVATE-TOKEN' " +
    'failed: WebSocket is closed before the connection is established.'
  events.emit('console', { type: () => 'warning', text: () => warning })
  events.emit(
    'pageerror',
    new Error('failed https://PRIVATE-USER:PRIVATE-PASSWORD@host/api#PRIVATE'),
  )
  events.emit('requestfailed', {
    method: () => 'GET',
    url: () => 'https://host/api/session?password=PRIVATE-PASSWORD',
    failure: () => ({ errorText: 'net::ERR_FAILED' }),
  })
  expect(diagnostics.console).toEqual([
    "warning: WebSocket connection to 'ws://localhost/api/v1/ws?[REDACTED]' " +
      'failed: WebSocket is closed before the connection is established.',
  ])
  expect(diagnostics.pageErrors).toEqual(['failed https://[REDACTED]@host/api?[REDACTED]'])
  expect(diagnostics.requestFailures).toEqual([
    'GET https://host/api/session?[REDACTED]: net::ERR_FAILED',
  ])
  expect(JSON.stringify(diagnostics)).not.toContain('PRIVATE')
  await expect(expectCleanDiagnostics(page, diagnostics)).rejects.toThrow()
})

it('取消白名单仅豁免具体请求的 ERR_ABORTED，其他网络与 HTTP 失败仍保留', () => {
  const events = new EventEmitter()
  const registeredAbort = {
    method: () => 'GET',
    url: () => 'https://host/api/v1/system/messages',
    failure: () => ({ errorText: 'net::ERR_ABORTED' }),
  }
  const unregisteredAbort = { ...registeredAbort }
  const registeredFailure = {
    ...registeredAbort,
    failure: () => ({ errorText: 'net::ERR_FAILED' }),
  }
  const registered = new Set<Request>([
    registeredAbort as unknown as Request,
    registeredFailure as unknown as Request,
  ])
  const diagnostics = observeDiagnostics(events as unknown as Page, (request) =>
    registered.has(request),
  )
  events.emit('requestfailed', registeredAbort)
  events.emit('requestfailed', unregisteredAbort)
  events.emit('requestfailed', registeredFailure)
  for (const status of [429, 500]) {
    events.emit('response', {
      status: () => status,
      url: registeredAbort.url,
      request: () => registeredAbort,
    })
  }
  expect(diagnostics.requestFailures).toEqual([
    'GET https://host/api/v1/system/messages: net::ERR_ABORTED',
    'GET https://host/api/v1/system/messages: net::ERR_FAILED',
  ])
  expect(diagnostics.httpErrors).toEqual([
    '429 /api/v1/system/messages',
    '500 /api/v1/system/messages',
  ])
})
