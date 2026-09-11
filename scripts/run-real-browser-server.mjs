import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isResourceScopeId } from './resource-scope.mjs'

export class BrowserServerUsageError extends Error {}

function responseAudit(mode, environment) {
  const output = environment.RYFRAME_E2E_PREVIEW_RESPONSE_AUDIT
  const formal =
    mode === 'preview' &&
    environment.RYFRAME_E2E_FIXTURE === 'device' &&
    typeof environment.RYFRAME_E2E_RUN_ID === 'string'
  if (!formal) {
    if (output !== undefined) {
      throw new BrowserServerUsageError('静态响应审计只允许用于正式 Device preview')
    }
    return undefined
  }
  const runId = environment.RYFRAME_E2E_RUN_ID
  const scopeId = environment.RYFRAME_E2E_SCOPE_ID || environment.APP_SCOPE_ID
  if (
    !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(runId) ||
    !isResourceScopeId(scopeId) ||
    typeof output !== 'string' ||
    output !== output.trim() ||
    /[\r\n\0]/u.test(output) ||
    !isAbsolute(output)
  ) {
    throw new BrowserServerUsageError('正式 Device preview 缺少有效的静态响应审计绑定')
  }
  return Object.freeze({ output: resolve(output), runId, scopeId })
}

export function parseBrowserServerArguments(argv, environment = process.env) {
  if (
    !Array.isArray(argv) ||
    argv.length !== 2 ||
    argv.some((value) => typeof value !== 'string')
  ) {
    throw new BrowserServerUsageError('真实浏览器服务需要模式和端口')
  }
  const [mode, rawPort] = argv
  if (!['dev', 'preview'].includes(mode)) {
    throw new BrowserServerUsageError('真实浏览器服务模式必须为 dev 或 preview')
  }
  if (!/^[1-9][0-9]{0,4}$/u.test(rawPort)) {
    throw new BrowserServerUsageError('真实浏览器服务端口必须是 1 到 65535 的整数')
  }
  const port = Number(rawPort)
  if (port > 65535) throw new BrowserServerUsageError('真实浏览器服务端口超出范围')
  const endpoint = environment.RYFRAME_E2E_GATE_ENDPOINT
  if (
    !endpoint ||
    endpoint !== endpoint.trim() ||
    endpoint.includes('\0') ||
    endpoint.includes('\n') ||
    endpoint.length > 240 ||
    !isAbsolute(endpoint)
  ) {
    throw new BrowserServerUsageError('真实浏览器服务需要独立的绝对 IPC 地址')
  }
  return Object.freeze({ mode, port, endpoint, responseAudit: responseAudit(mode, environment) })
}

async function closeVite(server, mode) {
  if (!server) return
  if (mode === 'dev') {
    await server.close()
    return
  }
  if (!server.httpServer.listening) return
  await new Promise((resolveClose, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolveClose()))
  })
}

export async function startRealBrowserServer(options, dependencies = {}) {
  const viteApi = dependencies.viteApi ?? (await import('vite'))
  const startProxy =
    dependencies.startProxy ?? (await import('./browser-delay-proxy.mjs')).startDelayProxy
  const createAudit = dependencies.createAudit
  const listen = { host: '127.0.0.1', port: 0, strictPort: true }
  let vite
  let proxy
  let audit
  try {
    if (options.responseAudit) {
      const create =
        createAudit ??
        (await import('./browser-static-response-audit.mjs')).createStaticResponseAudit
      audit = await create(options.responseAudit)
    }
    vite =
      options.mode === 'preview'
        ? await viteApi.preview({ preview: listen })
        : await viteApi.createServer({ server: listen })
    if (options.mode === 'dev') await vite.listen()
    const address = vite.httpServer.address()
    if (!address || typeof address === 'string') {
      throw new Error('Vite 没有取得真实浏览器内部监听地址')
    }
    proxy = await startProxy({
      target: `http://127.0.0.1:${address.port}`,
      port: options.port,
      endpoint: options.endpoint,
      ...(audit ? { audit } : {}),
    })
  } catch (error) {
    await proxy?.close().catch(() => undefined)
    await closeVite(vite, options.mode).catch(() => undefined)
    throw error
  }
  let closing
  return {
    origin: proxy.origin,
    close() {
      closing ??= (async () => {
        await proxy.close()
        await closeVite(vite, options.mode)
        await audit?.publish()
      })()
      return closing
    },
  }
}

async function run() {
  const options = parseBrowserServerArguments(process.argv.slice(2))
  const server = await startRealBrowserServer(options)
  console.log(`真实浏览器代理已就绪：${server.origin}`)
  let stopping
  for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ]) {
    process.once(signal, () => {
      stopping ??= server.close().then(
        () => {
          process.exitCode = code
        },
        (error) => {
          console.error(error instanceof Error ? error.message : '真实浏览器服务关闭失败')
          process.exitCode = 1
        },
      )
    })
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : '真实浏览器服务启动失败')
    process.exitCode = error instanceof BrowserServerUsageError ? 2 : 1
  })
}
