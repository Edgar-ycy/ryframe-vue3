import { expect, type Page, type Request } from '@playwright/test'
import type { BrowserDiagnostics } from './types'

export function observeDiagnostics(
  page: Page,
  expectedCancellation?: (request: Request) => boolean,
): BrowserDiagnostics {
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
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText === 'net::ERR_ABORTED' && expectedCancellation?.(request))
      return
    diagnostics.requestFailures.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText}`,
    )
  })
  return diagnostics
}

export async function expectCleanDiagnostics(
  page: Page,
  diagnostics: BrowserDiagnostics,
): Promise<void> {
  await page.waitForTimeout(200)
  expect(diagnostics.unhandledApi).toEqual([])
  expect(diagnostics.httpErrors).toEqual([])
  expect(diagnostics.pageErrors).toEqual([])
  expect(diagnostics.requestFailures).toEqual([])
  expect(diagnostics.console).toEqual([])
}
