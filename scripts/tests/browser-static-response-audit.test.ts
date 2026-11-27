import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdir, readFile, rm } from 'node:fs/promises'
import http from 'node:http'
import { resolve } from 'node:path'
import { test } from 'node:test'
import {
  classifyStaticRequest,
  createStaticResponseAudit,
} from '../browser-static-response-audit.ts'
import { startDelayProxy } from '../browser-delay-proxy.ts'

function request(url: string, destination: string): Promise<Buffer> {
  return new Promise((resolveRequest, reject) => {
    const pending = http.get(url, { headers: { 'sec-fetch-dest': destination } }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => resolveRequest(Buffer.concat(chunks)))
    })
    pending.on('error', reject)
  })
}

test('preview 代理只记录浏览器实际收到的 identity 静态响应', async (t) => {
  const root = resolve('.local-tests', `static-response-audit-${randomUUID()}`)
  await mkdir(root, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  const loginBody = Buffer.from('index')
  const bodies: Readonly<Record<string, Buffer | undefined>> = {
    '/login': loginBody,
    '/assets/app.js': Buffer.from('script'),
  }
  const upstream = http.createServer((incoming, response) => {
    const body = incoming.url === undefined ? undefined : bodies[incoming.url]
    if (body) {
      assert.equal(incoming.headers['accept-encoding'], 'identity')
      assert.equal(incoming.headers.range, undefined)
      response.writeHead(200, { 'content-type': 'application/octet-stream' })
      response.end(body)
      return
    }
    response.writeHead(200).end('excluded')
  })
  upstream.listen(0, '127.0.0.1')
  await once(upstream, 'listening')
  const address = upstream.address()
  assert.ok(address && typeof address !== 'string')
  const output = resolve(root, 'responses.json')
  const audit = await createStaticResponseAudit({
    output,
    runId: 'r24-business-preview',
    scopeId: 'fixture-source',
  })
  const proxy = await startDelayProxy({
    target: `http://127.0.0.1:${address.port}`,
    audit,
  })
  t.after(async () => {
    await proxy.close()
    upstream.closeAllConnections()
    upstream.close()
  })
  await request(`${proxy.origin}/login`, 'document')
  await request(`${proxy.origin}/assets/app.js`, 'script')
  await request(`${proxy.origin}/assets/app.js`, 'script')
  await request(`${proxy.origin}/api/v1/version`, 'empty')
  await request(`${proxy.origin}/xhr`, 'empty')
  await proxy.close()
  const receipt = await audit.publish()
  assert.equal(receipt.total_entries, 3)
  assert.deepEqual(
    receipt.entries.map(({ sequence, path, destination }) => ({ sequence, path, destination })),
    [
      { sequence: 1, path: '/login', destination: 'document' },
      { sequence: 2, path: '/assets/app.js', destination: 'script' },
      { sequence: 3, path: '/assets/app.js', destination: 'script' },
    ],
  )
  assert.equal(receipt.entries[0].sha256, createHash('sha256').update(loginBody).digest('hex'))
  const persisted: unknown = JSON.parse(await readFile(output, 'utf8'))
  assert.deepEqual(persisted, receipt)
  await assert.rejects(audit.publish(), /已存在/u)
})

test('查询、片段和非规范化静态 URL 失败，API/XHR/WebSocket 不进入审计', async (t) => {
  const root = resolve('.local-tests', `static-response-audit-${randomUUID()}`)
  await mkdir(root, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  const audit = await createStaticResponseAudit({
    output: resolve(root, 'responses.json'),
    runId: 'r24-business-preview',
    scopeId: 'fixture-source',
  })
  assert.equal(
    classifyStaticRequest({
      method: 'GET',
      url: '/api/v1/version',
      headers: { 'sec-fetch-dest': 'script' },
    }),
    undefined,
  )
  assert.equal(
    classifyStaticRequest({ method: 'GET', url: '/data', headers: { 'sec-fetch-dest': 'empty' } }),
    undefined,
  )
  assert.equal(
    classifyStaticRequest({
      method: 'GET',
      url: '/socket',
      headers: { 'sec-fetch-dest': 'websocket' },
    }),
    undefined,
  )
  assert.throws(
    () =>
      audit.classify({
        method: 'GET',
        url: '/assets/app.js?v=1',
        headers: { 'sec-fetch-dest': 'script' },
      }),
    /查询或片段/u,
  )
  await assert.rejects(audit.publish(), /查询或片段/u)
})

test('编码或未完整传送的响应不能发布成功收据', async (t) => {
  const root = resolve('.local-tests', `static-response-audit-${randomUUID()}`)
  await mkdir(root, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  const upstream = http.createServer((_incoming, response) => {
    response.writeHead(200, { 'content-encoding': 'gzip' }).end('encoded')
  })
  upstream.listen(0, '127.0.0.1')
  await once(upstream, 'listening')
  const address = upstream.address()
  assert.ok(address && typeof address !== 'string')
  const output = resolve(root, 'responses.json')
  const audit = await createStaticResponseAudit({
    output,
    runId: 'r24-business-preview',
    scopeId: 'fixture-source',
  })
  const proxy = await startDelayProxy({
    target: `http://127.0.0.1:${address.port}`,
    audit,
  })
  t.after(async () => {
    await proxy.close()
    upstream.closeAllConnections()
    upstream.close()
  })
  await request(`${proxy.origin}/assets/app.js`, 'script')
  await proxy.close()
  await assert.rejects(audit.publish(), /Content-Encoding/u)
  await assert.rejects(
    readFile(output),
    (error: unknown) =>
      typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT',
  )
})
