import assert from 'node:assert/strict'
import { once } from 'node:events'
import http from 'node:http'
import net from 'node:net'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { startDelayProxy, localTarget } from '../browser-delay-proxy.mjs'
import { createResponseGates } from '../browser-response-gates.mjs'

async function setup(t, endpoint) {
  const server = http.createServer((request, response) => {
    assert.equal(request.headers['x-ryframe-test-gate'], undefined)
    response.writeHead(200, {
      'Set-Cookie': ['refresh=opaque; HttpOnly', 'csrf=opaque'],
      'Content-Type': 'application/json',
      'X-Proof': 'real-upstream',
    })
    response.end(JSON.stringify({ method: request.method, path: request.url }))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const proxy = await startDelayProxy({
    target: `http://127.0.0.1:${server.address().port}`,
    endpoint,
  })
  t.after(async () => {
    await proxy.close()
    server.closeAllConnections()
    server.close()
  })
  return proxy
}

async function held(proxy, id) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = proxy.command({ action: 'status', id })
    if (value.state === 'held') return value
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('真实响应未到达门限')
}

function control(endpoint, message) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(endpoint)
    let value = ''
    socket.on('connect', () => socket.write(`${JSON.stringify(message)}\n`))
    socket.on('data', (data) => {
      value += data.toString('utf8')
    })
    socket.on('error', reject)
    socket.on('end', () => resolve(JSON.parse(value)))
  })
}

test('整个真实响应和多个 Cookie 只在释放后到达客户端', async (t) => {
  const proxy = await setup(t)
  const id = 'cookie-delay-0001'
  proxy.command({
    action: 'arm',
    id,
    match: { method: 'POST', path: '/api/v1/auth/refresh', clientAddress: '198.18.1.2' },
  })
  let receivedHeaders = false
  const result = new Promise((resolve, reject) => {
    const request = http.request(
      `${proxy.origin}/api/v1/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'X-Forwarded-For': '198.18.1.2',
          'X-Ryframe-Test-Gate': id,
          Cookie: 'secret-input',
        },
      },
      (response) => {
        receivedHeaders = true
        let body = ''
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => resolve({ headers: response.headers, body }))
      },
    )
    request.on('error', reject)
    request.end()
  })
  const gate = await held(proxy, id)
  assert.equal(receivedHeaders, false)
  assert.equal(gate.cookieCount, 2)
  assert.equal(gate.status, 200)
  assert.match(gate.sha256, /^[0-9a-f]{64}$/u)
  assert.ok(!JSON.stringify(gate).includes('opaque'))
  assert.ok(!JSON.stringify(gate).includes('secret-input'))
  proxy.command({ action: 'release', id })
  const received = await result
  assert.deepEqual(received.headers['set-cookie'], ['refresh=opaque; HttpOnly', 'csrf=opaque'])
  assert.equal(received.headers['x-proof'], 'real-upstream')
  assert.deepEqual(JSON.parse(received.body), { method: 'POST', path: '/api/v1/auth/refresh' })
  assert.throws(() => proxy.command({ action: 'release', id }))
})

test('客户端已取消时不重新发送 Cookie，其他客户请求不受响应门影响', async (t) => {
  const proxy = await setup(t)
  const id = 'cancel-delay-0001'
  proxy.command({
    action: 'arm',
    id,
    match: { method: 'GET', path: '/api/v1/system/posts', clientAddress: '198.18.3.4' },
  })
  assert.equal((await fetch(`${proxy.origin}/api/v1/system/posts`)).status, 200)
  assert.equal(proxy.command({ action: 'status', id }).state, 'armed')
  const request = http.get(`${proxy.origin}/api/v1/system/posts`, {
    headers: { 'X-Forwarded-For': '198.18.3.4', 'X-Ryframe-Test-Gate': id },
  })
  request.on('error', () => undefined)
  await held(proxy, id)
  request.destroy()
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (proxy.command({ action: 'status', id }).clientClosedAt) break
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  assert.ok(proxy.command({ action: 'status', id }).clientClosedAt)
  assert.equal(proxy.command({ action: 'release', id }).state, 'client-closed')
})

test('独立 IPC 只返回脱敏证明，未知或多个命令失败关闭', async (t) => {
  const endpoint =
    process.platform === 'win32'
      ? `\\\\.\\pipe\\ryframe-gate-${randomUUID()}`
      : `/tmp/ryframe-gate-${randomUUID()}.sock`
  await setup(t, endpoint)
  const match = { method: 'GET', path: '/api/v1/system/posts', clientAddress: '198.19.1.2' }
  const armed = await control(endpoint, { action: 'arm', id: 'ipc-gate-0001', match })
  assert.equal(armed.data.state, 'armed')
  assert.equal(armed.data.clientAddress, undefined)
  const invalid = await control(endpoint, { action: 'status', id: 'missing-gate' })
  assert.equal(typeof invalid.error, 'string')
})

test('拒绝非本机原点、隐式端口与任意上游 URL', () => {
  assert.equal(localTarget('http://127.0.0.1:4174').port, '4174')
  for (const value of [
    'https://127.0.0.1:4174',
    'http://example.com:4174',
    'http://user@127.0.0.1:4174',
    'http://127.0.0.1/path',
    'http://127.0.0.1?target=elsewhere',
    'http://127.0.0.1',
  ]) {
    assert.throws(() => localTarget(value))
  }
})

test('响应门由标签、客户地址、方法和路径共同命中一次', () => {
  const gates = createResponseGates()
  const id = 'exact-match-0001'
  const match = { method: 'GET', path: '/api/v1/system/posts', clientAddress: '198.18.1.2' }
  assert.throws(() => gates.command({ action: 'arm', id, match: { ...match, path: '**/*' } }))
  assert.throws(() =>
    gates.command({ action: 'arm', id, match: { ...match, clientAddress: '198.18.999.1' } }),
  )
  gates.command({ action: 'arm', id, match })
  assert.throws(() => gates.command({ action: 'arm', id, match }))
  const request = {
    method: 'GET',
    url: match.path,
    headers: { 'x-forwarded-for': match.clientAddress, 'x-ryframe-test-gate': id },
  }
  assert.equal(
    gates.claim({ ...request, headers: { 'x-forwarded-for': match.clientAddress } }),
    undefined,
  )
  assert.equal(gates.claim({ ...request, method: 'POST' }), undefined)
  assert.equal(gates.claim({ ...request, url: '/api/v1/auth/context' }), undefined)
  assert.equal(gates.claim(request).id, id)
  assert.equal(gates.claim(request), undefined)
  assert.throws(() => gates.command({ action: 'release', id }))
  assert.equal(gates.command({ action: 'status', id }).clientAddress, undefined)
  gates.command({ action: 'discard', id })
  assert.throws(() => gates.command({ action: 'status', id }))
})
