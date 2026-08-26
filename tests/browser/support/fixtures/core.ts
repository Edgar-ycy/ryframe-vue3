import { expect } from '@playwright/test'
import type { ApiFixtureOptions } from '../types'
import { fulfillJson, type FixtureHandler } from '../http'
import { createSessionContext } from '../sessionFixture'

export function createCoreHandler(options: ApiFixtureOptions): FixtureHandler {
  const sessionContext = createSessionContext(options)

  return async ({ key, path, request, route, url }) => {
    if (key === 'GET /version') {
      await fulfillJson(route, {
        api_prefix: '/api/v1',
        endpoints: {
          openapi: '/api/v1/openapi.json',
          swagger: '/api/v1/swagger-ui',
          system: '/api/v1/system',
        },
        multi_tenancy_enabled: options.multiTenancyEnabled ?? false,
        name: 'RyFrame API',
        source_commit: 'browser-smoke',
        version: '0.10.0',
      })
      return true
    }
    if (key === 'GET /auth/csrf') {
      await fulfillJson(route, { csrf_token: 'csrf-smoke', expires_in: 300 })
      return true
    }
    if (key === 'POST /auth/refresh') {
      await fulfillJson(route, undefined, 401)
      return true
    }
    if (key === 'GET /auth/captcha/config') {
      await fulfillJson(route, { captcha_enabled: false })
      return true
    }
    if (key === 'POST /auth/login') {
      const body = request.postDataJSON() as Record<string, unknown>
      expect(body).toMatchObject({ password: 'browser-secret', username: 'tester' })
      expect(request.headers()['x-csrf-token']).toBe('csrf-smoke')
      await fulfillJson(route, {
        access_token: 'access-token-smoke',
        expires_in: 900,
        session_context: sessionContext,
      })
      return true
    }
    if (key === 'GET /auth/context') {
      await fulfillJson(route, sessionContext)
      return true
    }
    if (key === 'GET /system/depts/tree') {
      await fulfillJson(route, [])
      return true
    }
    if (key === 'GET /system/users') {
      await fulfillJson(route, {
        items: [
          {
            created_at: '2026-08-21T00:00:00Z',
            dept_id: null,
            dept_name: '研发部',
            email: 'alice@example.com',
            id: '1001',
            nickname: 'Alice',
            phone: '13800000001',
            remark: null,
            status: '1',
            username: 'alice',
          },
        ],
        max_page_size: 100,
        page: Number(url.searchParams.get('page') ?? 1),
        page_size: Number(url.searchParams.get('page_size') ?? 10),
        total: 21,
        total_pages: 3,
      })
      return true
    }
    if (key === 'GET /common/jobs/notifications/unread-count') {
      await fulfillJson(route, 0)
      return true
    }
    if (key === 'POST /common/jobs/notifications/read') {
      await fulfillJson(route, 0)
      return true
    }
    if (key === 'GET /system/messages') {
      await fulfillJson(route, { next_cursor: null, records: [] })
      return true
    }
    if (key === 'GET /system/messages/unread-count') {
      await fulfillJson(route, 0)
      return true
    }
    if (key === 'POST /auth/ws-ticket') {
      await fulfillJson(route, { ticket: 'socket-ticket' })
      return true
    }
    if (key.startsWith('GET /system/configs/key/')) {
      await fulfillJson(route, path.endsWith('sideTheme') ? 'light' : 'default')
      return true
    }
    return false
  }
}
