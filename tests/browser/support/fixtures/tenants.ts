import { fulfillJson, type FixtureHandler } from '../http'
import type { ApiFixtureState } from '../types'
import { NOW } from '../types'

function quota(used: number, limit: number) {
  return {
    limit,
    percentage_basis_points: Math.round((used / limit) * 10_000),
    status: 'normal',
    used,
  }
}

function tenantCapacity() {
  return {
    capacity_status: 'normal',
    domain: 'default.example.test',
    expiration_status: 'never',
    expire_at: null,
    max_requests_per_min: 600,
    max_roles: 100,
    max_storage_mb: 1024,
    max_users: 1000,
    name: '默认租户',
    status: 'enabled',
    tenant_id: 'default',
    usage: {
      auxiliary: {
        active_user_imports: 0,
        cron_enabled: true,
        dead_jobs: 0,
        enabled_schedules: 2,
        pending_jobs: 0,
      },
      calculated_at: NOW,
      request_window: {
        current: 12,
        limit: 600,
        percentage_basis_points: 200,
        remaining_secs: 30,
        status: 'normal',
      },
      roles: quota(8, 100),
      storage: quota(128, 1024),
      tenant_id: 'default',
      users: quota(21, 1000),
    },
  }
}

export function createTenantHandler(state: ApiFixtureState): FixtureHandler {
  const tenant = tenantCapacity()
  return async ({ key, method, path, request, route, url }) => {
    if (path === '/platform/tenants/page' || path.startsWith('/platform/tenants/')) {
      state.tenantRequestContexts.push({
        authorization: request.headers().authorization,
        tenantId: request.headers()['x-tenant-id'],
      })
    }
    if (key === 'GET /platform/tenants/page') {
      await fulfillJson(route, {
        items: [tenant],
        max_page_size: 100,
        page: Number(url.searchParams.get('page') ?? 1),
        page_size: Number(url.searchParams.get('page_size') ?? 20),
        total: 1,
        total_pages: 1,
      })
      return true
    }
    const detailMatch = /^\/platform\/tenants\/([^/]+)$/u.exec(path)
    if (method === 'GET' && detailMatch) {
      await fulfillJson(route, tenant)
      return true
    }
    return false
  }
}
