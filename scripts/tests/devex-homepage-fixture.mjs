import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { captureSourceInventory } from '../build-source-inventory.mjs'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const identity = {
  tenant_id: 'system',
  username: 'homepage-visitor',
  password: 'private-fixture-password',
  client_address: '198.18.0.1',
}
const asset = '/assets/vite-cache.js'

export function fixture(t, frontendUrl = 'http://127.0.0.1:4678') {
  const parent = path.join(root, '.local-tests')
  fs.mkdirSync(parent, { recursive: true })
  const artifacts = fs.mkdtempSync(path.join(parent, 'homepage-unit-'))
  t.after(() => fs.rmSync(artifacts, { recursive: true, force: true }))
  const selection = {
    format_version: 1,
    suite: 'homepage',
    selections: [
      {
        workflow: 'homepage',
        identity_pool: 'homepage',
        roles_sha256: '1'.repeat(64),
        permissions_sha256: '2'.repeat(64),
        tenant_distribution: { system: 1 },
        count: 1,
        slots: [
          { tenant_slot: 'system', user_slot: 'visitor', client_address: identity.client_address },
        ],
      },
    ],
  }
  fs.writeFileSync(path.join(artifacts, 'identity-selection.json'), JSON.stringify(selection))
  return {
    format_version: 1,
    kind: 'ryframe-devex-homepage',
    cache: 'cold',
    frontend_url: frontendUrl,
    timeout_ms: 3000,
    visitor_interval_ms: 0,
    identities: [identity],
    artifacts,
    runner_frontend_fingerprint: captureSourceInventory(root).source.worktree_fingerprint,
  }
}

export async function serverFixture(t, options = {}) {
  const seen = { static: 0, login: 0, index: 0, addresses: new Set() }
  const session = {
    user: {
      tenant_id: 'system',
      username: options.wrongIdentity ? 'other' : identity.username,
      id: '101',
    },
    password_change_required: false,
  }
  const server = createServer((request, response) => {
    seen.addresses.add(request.headers['x-forwarded-for'])
    if (request.url === '/index' && ++seen.index === options.hangIndex) return
    if (request.url === asset) {
      seen.static += 1
      response.writeHead(200, {
        'Content-Type': 'text/javascript',
        'Cache-Control': options.disableStaticCache
          ? 'no-store'
          : 'public, max-age=31536000, immutable',
      })
      response.end('globalThis.fixtureAssetLoaded = true')
    } else if (request.url === '/api/v1/auth/login' || request.url === '/api/v1/auth/refresh') {
      seen.login += 1
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(
        JSON.stringify({
          code: 200,
          data: {
            session_context: request.url.endsWith('/refresh')
              ? { ...session, user: { ...session.user, tenant_id: 'unexpected-tenant' } }
              : session,
          },
        }),
      )
    } else {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      response.end(`<!doctype html><html lang="zh-CN"><head><script src="${asset}"></script></head><body>
        ${
          request.url === '/login'
            ? `<h1>RyFrame</h1><input placeholder="用户名"><input placeholder="密码" type="password"><button>登录</button>
        <script>document.querySelector('button').onclick = async () => {
          const response = await fetch('/api/v1/auth/login', {method:'POST'});
          await response.json(); history.pushState({}, '', '/index');
          document.body.innerHTML = '<main class="workspace"><h1>已登录首页</h1><section class="account-summary"><dl><dd>${identity.username}</dd></dl></section></main>';
        }</script>`
            : `<main class="workspace"><h1 style="font-size:48px">真实首页测量夹具</h1><section class="account-summary"><dl><dd>${identity.username}</dd></dl></section></main>
        ${options.pageError ? '<script>throw new Error("private-fixture-password")</script>' : ''}
        ${options.refreshWrong ? '<script>fetch("/api/v1/auth/refresh", {method:"POST"}).then(response => response.json())</script>' : ''}
        ${options.outside ? `<img src="${options.outside}">` : ''}`
        }
      </body></html>`)
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections()
        server.close(resolve)
      }),
  )
  return { url: `http://127.0.0.1:${server.address().port}`, seen }
}

export async function runCli(input) {
  const child = spawn(process.execPath, ['scripts/devex-homepage.mjs'], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (chunk) => {
    stdout += chunk
  })
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    stderr += chunk
  })
  const closed = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr))))
  })
  child.stdin.end(JSON.stringify(input))
  await closed
  assert.equal(stderr, '')
  return JSON.parse(stdout)
}
