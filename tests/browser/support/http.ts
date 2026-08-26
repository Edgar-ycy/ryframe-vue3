import type { Request, Route } from '@playwright/test'

export interface FixtureRequest {
  key: string
  method: string
  path: string
  request: Request
  route: Route
  url: URL
}

export type FixtureHandler = (context: FixtureRequest) => Promise<boolean>

export function fixtureRequest(route: Route): FixtureRequest {
  const request = route.request()
  const url = new URL(request.url())
  const method = request.method()
  const path = url.pathname.replace('/api/v1', '')
  return { key: `${method} ${path}`, method, path, request, route, url }
}

export function envelope(data: unknown, code = 200) {
  return {
    code,
    data,
    error_key: null,
    message: code < 400 ? 'ok' : '未登录',
    request_id: 'browser-smoke',
  }
}

export async function fulfillJson(route: Route, data: unknown, status = 200): Promise<void> {
  await route.fulfill({
    body: JSON.stringify(envelope(data, status)),
    contentType: 'application/json',
    status,
  })
}
