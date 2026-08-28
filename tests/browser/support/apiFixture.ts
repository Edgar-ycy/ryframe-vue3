import type { Page } from '@playwright/test'
import { fixtureRequest, type FixtureHandler } from './http'
import { createCoreHandler } from './fixtures/core'
import { createExportJobHandler } from './fixtures/exportJobs'
import { createPostHandler } from './fixtures/posts'
import { createTenantHandler } from './fixtures/tenants'
import type { ApiFixtureOptions, ApiFixtureState, BrowserDiagnostics } from './types'

function createState(): ApiFixtureState {
  return {
    deletionBodies: [],
    exportBodies: [],
    messageSockets: [],
    postCreateBodies: [],
    postDeleteIds: [],
    postExportBodies: [],
    postRequestContexts: [],
    postUpdateBodies: [],
    tenantRequestContexts: [],
  }
}

export async function installApiFixture(
  page: Page,
  diagnostics: BrowserDiagnostics,
  options: ApiFixtureOptions = {},
): Promise<ApiFixtureState> {
  const state = createState()
  const handlers: FixtureHandler[] = [
    createCoreHandler(options),
    createPostHandler(state),
    createExportJobHandler(state),
    createTenantHandler(state),
  ]

  await page.routeWebSocket(/\/api\/v1\/ws(?:\?|$)/u, (socket) => {
    state.messageSockets.push(socket)
    socket.onMessage((message) => {
      if (String(message).includes('"type":"ping"')) {
        socket.send(JSON.stringify({ type: 'pong', v: 1 }))
      }
    })
  })

  await page.route('**/api/v1/**', async (route) => {
    const context = fixtureRequest(route)
    for (const handler of handlers) {
      if (await handler(context)) return
    }

    diagnostics.unhandledApi.push(`${context.key}${context.url.search}`)
    await context.route.fulfill({
      body: JSON.stringify({
        code: 500,
        data: undefined,
        error_key: 'browser_fixture_unhandled',
        message: '浏览器测试未处理接口',
        request_id: 'browser-smoke',
      }),
      contentType: 'application/json',
      status: 500,
    })
  })

  return state
}
