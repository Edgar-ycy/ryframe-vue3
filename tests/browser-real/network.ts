import { expect, type BrowserContext, type Page } from '@playwright/test'

const pendingGates = new WeakMap<Page, { id: string; method: string; path: string }>()

/** 门标记只由同源 guard 注入，代理移除后再转发；产品 API 不识别测试字段。 */
export function markNextResponse(page: Page, id: string, method: string, path: string) {
  if (pendingGates.has(page)) throw new Error('当前标签已经存在等待捕获的请求')
  const gate = { id, method, path }
  pendingGates.set(page, gate)
  return () => {
    if (pendingGates.get(page) === gate) pendingGates.delete(page)
  }
}

export function isolatedOrigin(baseURL: string | undefined): string {
  const url = new URL(baseURL || 'about:blank')
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error('真实浏览器验收要求显式启动本机 Vite 代理')
  }
  return url.origin
}

export function isIsolatedRequest(value: string, origin: string): boolean {
  const url = new URL(value)
  if (url.username || url.password) return false
  if (url.protocol === 'ws:') url.protocol = 'http:'
  return url.origin === origin
}

export async function guardNetwork(
  context: BrowserContext,
  baseURL: string | undefined,
): Promise<() => void> {
  const origin = isolatedOrigin(baseURL)
  const blocked: string[] = []
  await context.route('**/*', async (route) => {
    if (isIsolatedRequest(route.request().url(), origin)) {
      const request = route.request()
      const gate = new URL(request.url()).pathname.startsWith('/api/v1/')
        ? pendingGates.get(request.frame().page())
        : undefined
      if (
        gate &&
        gate.method === request.method() &&
        gate.path === new URL(request.url()).pathname
      ) {
        pendingGates.delete(request.frame().page())
        await route.continue({
          headers: { ...(await request.allHeaders()), 'x-ryframe-test-gate': gate.id },
        })
      } else await route.continue()
    } else {
      blocked.push(new URL(route.request().url()).origin)
      await route.abort('blockedbyclient')
    }
  })
  await context.routeWebSocket('**/*', async (socket) => {
    if (isIsolatedRequest(socket.url(), origin)) {
      socket.connectToServer()
    } else {
      blocked.push(new URL(socket.url()).origin)
      await socket.close({ code: 1008, reason: '验收仅允许隔离服务' })
    }
  })
  return () => expect(blocked, '浏览器试图访问隔离范围之外的服务').toEqual([])
}
