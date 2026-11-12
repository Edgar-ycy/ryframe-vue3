import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import type { Page } from '@playwright/test'
import { createRequestBudget } from '../../scripts/browser-request-budget.mjs'

export function observeRequestBudget(page: Page) {
  const capacity = Number(loadRealBrowserEnvironment().requestCapacity)
  const windowMs = Number(loadRealBrowserEnvironment().requestWindowSeconds) * 1000
  const budget = createRequestBudget({
    capacity,
    windowMs,
    sleep: (delay) => page.waitForTimeout(delay),
  })
  const tracked = new WeakSet<Page>()
  function observePage(target: Page): void {
    if (tracked.has(target)) return
    tracked.add(target)
    target.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/v1/')) budget.record()
    })
    target.on('websocket', (socket) => {
      if (new URL(socket.url()).pathname.startsWith('/api/v1/')) budget.record()
    })
  }
  observePage(page)
  return {
    observePage,
    // APIRequestContext 不触发 Page 的请求事件，发送前显式等待并计入同一客户预算。
    beforeApiRequest: async () => {
      await budget.waitForAvailable(1)
      budget.record()
    },
    // 授权变化会让多个已挂载页面同时重载上下文与后台数据。
    beforeAuthorizationChange: () => budget.waitForAvailable(Math.ceil(capacity * 0.85)),
    // 完整页面启动还会请求刷新、菜单、消息和连接，不能只预留删除请求。
    beforePageBootstrap: () => budget.waitForAvailable(Math.ceil(capacity * 0.6)),
    beforeProvisioning: () => budget.waitForAvailable(Math.ceil(capacity * 0.6)),
    // 租户表单发出五个查询，提交后刷新列表，另外预留首次列表和消息请求。
    beforeTenantCreation: () => budget.waitForAvailable(Math.min(capacity, 10)),
    beforeCleanup: () => budget.waitForAvailable(Math.ceil(capacity * 0.2)),
  }
}
