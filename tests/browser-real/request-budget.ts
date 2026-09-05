import type { Page } from '@playwright/test'
import { createRequestBudget } from '../../scripts/browser-request-budget.mjs'

export function observeRequestBudget(page: Page) {
  const capacity = Number(process.env.RYFRAME_E2E_RATE_LIMIT_CAPACITY)
  const windowMs = Number(process.env.RYFRAME_E2E_RATE_LIMIT_WINDOW_SECS) * 1000
  const budget = createRequestBudget({
    capacity,
    windowMs,
    sleep: (delay) => page.waitForTimeout(delay),
  })
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/')) budget.record()
  })
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname.startsWith('/api/v1/')) budget.record()
  })
  return {
    // 完整页面启动还会请求刷新、菜单、消息和连接，不能只预留删除请求。
    beforePageBootstrap: () => budget.waitForAvailable(Math.ceil(capacity * 0.6)),
    beforeProvisioning: () => budget.waitForAvailable(Math.ceil(capacity * 0.6)),
    beforeCleanup: () => budget.waitForAvailable(Math.ceil(capacity * 0.2)),
  }
}
