import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { guardNetwork, isolatedOrigin, isIsolatedRequest } from '../browser-real/network'

test('真实验收拒绝远端、错误端口、凭据和非 HTTP 代理地址', () => {
  for (const value of [undefined, 'https://example.org', 'file:///tmp/x', 'http://u:p@localhost']) {
    expect(() => isolatedOrigin(value)).toThrow()
  }
  for (const origin of ['http://127.0.0.1:4174', 'http://localhost:4174', 'http://[::1]:4174']) {
    expect(isolatedOrigin(origin)).toBe(origin)
    expect(isIsolatedRequest(`${origin}/api/v1/auth/context`, origin)).toBe(true)
    expect(isIsolatedRequest(`${origin.replace('http:', 'ws:')}/api/ws`, origin)).toBe(true)
    for (const request of [
      'http://127.0.0.1:8080/api/v1/auth/login',
      'https://example.org/api/v1/auth/login',
      'http://user:secret@localhost:4174/',
      'data:text/html,hello',
    ]) {
      expect(isIsolatedRequest(request, origin)).toBe(false)
    }
  }
})

test('越界 HTTP 与 WebSocket 在抵达目标前被阻止并留下失败证据', async ({ context, baseURL }) => {
  let received = 0
  const server = createServer((_request, response) => {
    received += 1
    response.end('不应收到请求')
  })
  server.on('upgrade', (_request, socket) => {
    received += 1
    socket.destroy()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('隔离监听地址无效')
    const target = `http://127.0.0.1:${address.port}`
    const verify = await guardNetwork(context, baseURL)
    const page = await context.newPage()
    await page.setContent('<main>隔离网络检查</main>')
    expect(
      await page.evaluate(
        (url) =>
          fetch(url).then(
            () => 'connected',
            () => 'blocked',
          ),
        target,
      ),
    ).toBe('blocked')
    const closed = await page.evaluate(
      (url) =>
        new Promise<number>((resolve) => {
          const socket = new WebSocket(url.replace('http:', 'ws:'))
          socket.onclose = (event) => resolve(event.code)
        }),
      target,
    )
    expect(closed).toBe(1008)
    expect(received).toBe(0)
    expect(verify).toThrow('浏览器试图访问隔离范围之外的服务')
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
