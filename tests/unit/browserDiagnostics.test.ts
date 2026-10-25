import { EventEmitter } from 'node:events'
import type { Page } from '@playwright/test'
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
  events.emit('pageerror', new Error('failed https://PRIVATE-USER:PRIVATE-PASSWORD@host/api#PRIVATE'))
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
