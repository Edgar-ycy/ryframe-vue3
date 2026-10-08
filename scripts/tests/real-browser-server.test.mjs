import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'
import {
  BrowserServerUsageError,
  parseBrowserServerArguments,
  startRealBrowserServer,
} from '../run-real-browser-server.mjs'

const endpoint =
  process.platform === 'win32'
    ? '\\\\.\\pipe\\含 空格 browser-gate'
    : '/tmp/含 空格 browser-gate.sock'

test('模式、端口和中文空格 IPC 地址按独立参数解析', () => {
  assert.deepEqual(
    parseBrowserServerArguments(['preview', '4174'], { RYFRAME_E2E_GATE_ENDPOINT: endpoint }),
    { mode: 'preview', port: 4174, endpoint, responseAudit: undefined },
  )
  for (const args of [[], ['dev'], ['build', '4174'], ['dev', '0'], ['dev', '65536']]) {
    assert.throws(
      () => parseBrowserServerArguments(args, { RYFRAME_E2E_GATE_ENDPOINT: endpoint }),
      BrowserServerUsageError,
    )
  }
  assert.throws(() => parseBrowserServerArguments(['dev', '4174'], {}), BrowserServerUsageError)
})

test('正式 Device preview 强制绑定响应审计，其他模式拒绝该输出', () => {
  const output = resolve('.local-tests', 'device preview', 'responses.json')
  const environment = {
    RYFRAME_E2E_GATE_ENDPOINT: endpoint,
    RYFRAME_E2E_FIXTURE: 'device',
    RYFRAME_E2E_RUN_ID: 'r24-device-preview',
    RYFRAME_E2E_SCOPE_ID: 'fixture-source',
    RYFRAME_E2E_PREVIEW_RESPONSE_AUDIT: output,
  }
  assert.deepEqual(parseBrowserServerArguments(['preview', '4174'], environment), {
    mode: 'preview',
    port: 4174,
    endpoint,
    responseAudit: { output, runId: 'r24-device-preview', scopeId: 'fixture-source' },
  })
  assert.throws(
    () =>
      parseBrowserServerArguments(['preview', '4174'], {
        ...environment,
        RYFRAME_E2E_PREVIEW_RESPONSE_AUDIT: undefined,
      }),
    BrowserServerUsageError,
  )
  assert.throws(
    () => parseBrowserServerArguments(['dev', '4174'], environment),
    BrowserServerUsageError,
  )
})

test('CLI 参数错误返回 2，且不会加载 Vite 或创建服务', async () => {
  await assert.rejects(
    promisify(execFile)(process.execPath, ['scripts/run-real-browser-server.mjs', 'build', '4174']),
    (error) => error.code === 2 && /模式必须/u.test(error.stderr),
  )
})

function fakeServer(events, mode) {
  const httpServer = {
    listening: true,
    address: () => ({ address: '127.0.0.1', family: 'IPv4', port: 4567 }),
    close(callback) {
      events.push('preview-close')
      this.listening = false
      callback()
    },
  }
  return mode === 'dev'
    ? {
        httpServer,
        async listen() {
          events.push('dev-listen')
        },
        async close() {
          events.push('dev-close')
        },
      }
    : { httpServer }
}

test('preview 直接复用已有 dist，不调用 build；关闭顺序先代理后 Vite', async () => {
  const events = []
  const responseAudit = { output: 'output', runId: 'run', scopeId: 'scope' }
  const audit = { publish: async () => events.push('audit-publish') }
  const server = await startRealBrowserServer(
    { mode: 'preview', port: 4174, endpoint, responseAudit },
    {
      createAudit: async (options) => {
        assert.equal(options, responseAudit)
        return audit
      },
      viteApi: {
        createServer: async () => assert.fail('preview 不得启动开发服务'),
        preview: async (options) => {
          events.push(['preview', options])
          return fakeServer(events, 'preview')
        },
      },
      startProxy: async (options) => {
        events.push(['proxy', options])
        return { origin: 'http://127.0.0.1:4174', close: async () => events.push('proxy-close') }
      },
    },
  )
  assert.deepEqual(events[0], [
    'preview',
    { preview: { host: '127.0.0.1', port: 0, strictPort: true } },
  ])
  assert.deepEqual(events[1], [
    'proxy',
    { target: 'http://127.0.0.1:4567', port: 4174, endpoint, audit },
  ])
  await server.close()
  await server.close()
  assert.deepEqual(events.slice(2), ['proxy-close', 'preview-close', 'audit-publish'])
})

test('代理启动失败会关闭已启动 Vite，任务保持非零失败', async () => {
  const events = []
  await assert.rejects(
    startRealBrowserServer(
      { mode: 'dev', port: 4174, endpoint },
      {
        viteApi: {
          preview: async () => assert.fail('dev 不得启动 preview'),
          createServer: async () => fakeServer(events, 'dev'),
        },
        startProxy: async () => {
          throw new Error('proxy failed')
        },
      },
    ),
    /proxy failed/u,
  )
  assert.deepEqual(events, ['dev-listen', 'dev-close'])
})
