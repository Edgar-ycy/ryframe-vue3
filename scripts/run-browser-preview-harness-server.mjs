import http from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export class PreviewHarnessServerUsageError extends Error {}

export function parsePreviewHarnessServerArguments(argv) {
  if (!Array.isArray(argv) || argv.length !== 1 || typeof argv[0] !== 'string') {
    throw new PreviewHarnessServerUsageError('生产预览测试服务需要端口')
  }
  if (!/^[1-9][0-9]{0,4}$/u.test(argv[0])) {
    throw new PreviewHarnessServerUsageError('生产预览测试服务端口必须是 1 到 65535 的整数')
  }
  const port = Number(argv[0])
  if (port > 65535) throw new PreviewHarnessServerUsageError('生产预览测试服务端口超出范围')
  return Object.freeze({ port })
}

function origin(server, label) {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error(label + '没有取得本机监听地址')
  return 'http://127.0.0.1:' + address.port
}

export function isPreviewHarnessModulePath(pathname) {
  return (
    pathname.startsWith('/tests/browser/support/') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/@fs/') ||
    pathname.startsWith('/@id/') ||
    pathname.startsWith('/@vite/') ||
    pathname.startsWith('/node_modules/.pnpm/') ||
    pathname.startsWith('/node_modules/.vite/')
  )
}

function closeVite(server, mode) {
  if (!server) return Promise.resolve()
  if (mode === 'dev') return server.close()
  if (!server.httpServer.listening) return Promise.resolve()
  return new Promise((resolveClose, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolveClose()))
  })
}

function closeBridge(server) {
  if (!server?.listening) return Promise.resolve()
  return new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()))
  })
}

function forward(request, response, target) {
  const targetUrl = new URL(request.url || '/', target)
  const upstream = http.request(
    {
      headers: { ...request.headers, host: targetUrl.host },
      hostname: targetUrl.hostname,
      method: request.method,
      path: targetUrl.pathname + targetUrl.search,
      port: targetUrl.port,
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers)
      upstreamResponse.pipe(response)
    },
  )
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502)
    response.end()
  })
  request.pipe(upstream)
}

/**
 * 应用资源由 preview 提供；仅明确的浏览器夹具模块由隔离 Vite 实例转换。
 * 该程序只供 Playwright 使用，不是用户开发或产品服务入口。
 */
export async function startPreviewHarnessServer(options, dependencies = {}) {
  const viteApi = dependencies.viteApi ?? (await import('vite'))
  const createServer = dependencies.createServer ?? http.createServer
  const listen = { host: '127.0.0.1', port: 0, strictPort: true }
  let development
  let preview
  let bridge
  try {
    development = await viteApi.createServer({ server: listen })
    await development.listen()
    preview = await viteApi.preview({ preview: listen })
    const developmentOrigin = origin(development.httpServer, '测试模块服务')
    const previewOrigin = origin(preview.httpServer, '生产预览服务')
    bridge = createServer((request, response) => {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
      forward(
        request,
        response,
        isPreviewHarnessModulePath(pathname) ? developmentOrigin : previewOrigin,
      )
    })
    await new Promise((resolveListen, reject) => {
      bridge.once('error', reject)
      bridge.listen(options.port, '127.0.0.1', () => {
        bridge.off('error', reject)
        resolveListen()
      })
    })
  } catch (error) {
    await closeBridge(bridge).catch(() => undefined)
    await closeVite(preview, 'preview').catch(() => undefined)
    await closeVite(development, 'dev').catch(() => undefined)
    throw error
  }
  let closing
  return {
    origin: origin(bridge, '生产预览测试桥接'),
    close() {
      closing ??= (async () => {
        await closeBridge(bridge)
        await closeVite(preview, 'preview')
        await closeVite(development, 'dev')
      })()
      return closing
    },
  }
}

async function run() {
  const server = await startPreviewHarnessServer(parsePreviewHarnessServerArguments(process.argv.slice(2)))
  console.log('生产预览测试桥接已就绪：' + server.origin)
  let stopping
  for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    process.once(signal, () => {
      stopping ??= server.close().then(
        () => {
          process.exitCode = code
        },
        () => {
          process.exitCode = 1
        },
      )
    })
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : '生产预览测试桥接启动失败')
    process.exitCode = error instanceof PreviewHarnessServerUsageError ? 2 : 1
  })
}
