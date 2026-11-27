import { createHash, randomUUID } from 'node:crypto'
import { link, lstat, open, readFile, unlink, type FileHandle } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, isAbsolute, resolve } from 'node:path'

type StaticRequest = Pick<IncomingMessage, 'method' | 'headers' | 'url'>

interface StaticSelection {
  method: 'GET'
  path: string
  destination: string
}

interface StaticEntry extends StaticSelection {
  sequence: number
  status: number | undefined
  bytes: number
  sha256: string
  representation: 'identity'
}

interface AuditOptions {
  output: unknown
  runId: unknown
  scopeId: unknown
}

const MAX_ENTRIES = 10_000
const MAX_BYTES = 8 * 1024 * 1024 * 1024
const DESTINATIONS = new Set([
  'audio',
  'document',
  'embed',
  'font',
  'frame',
  'iframe',
  'image',
  'manifest',
  'object',
  'script',
  'sharedworker',
  'style',
  'track',
  'video',
  'worker',
])

function validText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value || value !== value.trim() || /[\r\n\0]/u.test(value)) {
    throw new Error(`${label}无效`)
  }
  return value
}

function outputPath(value: unknown): string {
  const path = validText(value, '静态响应审计输出路径')
  if (!isAbsolute(path)) throw new Error('静态响应审计输出必须是绝对路径')
  return resolve(path)
}

export function classifyStaticRequest(
  request: StaticRequest,
): Readonly<StaticSelection> | undefined {
  if (request.method !== 'GET') return undefined
  const destination = request.headers['sec-fetch-dest']
  if (typeof destination !== 'string' || !DESTINATIONS.has(destination)) return undefined
  const raw = request.url
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) {
    throw new Error('静态响应请求 URL 必须是规范化同源绝对路径')
  }
  const url = new URL(raw, 'http://127.0.0.1')
  if (`${url.pathname}${url.search}${url.hash}` !== raw || url.search || url.hash) {
    throw new Error('静态响应请求不得包含非规范化路径、查询或片段')
  }
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return undefined
  return Object.freeze({ method: 'GET', path: url.pathname, destination })
}

function isFileError(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

async function publishCreateOnly(path: string, value: unknown): Promise<void> {
  const body = Buffer.from(`${JSON.stringify(value)}\n`, 'utf8')
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`
  let handle: FileHandle | undefined
  try {
    handle = await open(temporary, 'wx', 0o600)
    await handle.writeFile(body)
    await handle.sync()
    await handle.close()
    handle = undefined
    try {
      await link(temporary, path)
    } catch (error) {
      if (isFileError(error, 'EEXIST')) {
        throw new Error('静态响应审计输出已存在，拒绝覆盖或重放', { cause: error })
      }
      throw error
    }
    if (!(await readFile(path)).equals(body)) {
      throw new Error('静态响应审计收据写后规范化复核失败')
    }
    if (process.platform !== 'win32') {
      const directory = await open(dirname(path), 'r')
      try {
        await directory.sync()
      } finally {
        await directory.close()
      }
    }
  } finally {
    await handle?.close().catch(() => undefined)
    await unlink(temporary).catch(() => undefined)
  }
}

export async function createStaticResponseAudit({
  output,
  runId: requestedRunId,
  scopeId: requestedScopeId,
}: AuditOptions) {
  const path = outputPath(output)
  const runId = validText(requestedRunId, '静态响应审计 run id')
  const scopeId = validText(requestedScopeId, '静态响应审计 scope')
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(runId)) {
    throw new Error('静态响应审计 run id 格式无效')
  }
  const parent = await lstat(dirname(path))
  if (!parent.isDirectory() || parent.isSymbolicLink()) {
    throw new Error('静态响应审计输出父目录必须是普通目录')
  }
  await lstat(path).then(
    () => {
      throw new Error('静态响应审计输出已存在，拒绝覆盖或重放')
    },
    (error: unknown) => {
      if (!isFileError(error, 'ENOENT')) throw error
    },
  )
  const entries: StaticEntry[] = []
  let active = 0
  let totalBytes = 0
  let failure: Error | undefined

  function fail(error: unknown): void {
    failure ??= error instanceof Error ? error : new Error('静态响应审计失败')
  }

  return Object.freeze({
    classify(request: StaticRequest) {
      try {
        return classifyStaticRequest(request)
      } catch (error) {
        fail(error)
        throw error
      }
    },
    track(
      selection: Readonly<StaticSelection>,
      upstream: IncomingMessage,
      response: ServerResponse,
    ): void {
      const sequence = entries.length + active + 1
      const digest = createHash('sha256')
      let bytes = 0
      let upstreamEnded = false
      let settled = false
      active += 1
      const encoding = upstream.headers['content-encoding']
      if (encoding !== undefined && String(encoding).toLowerCase() !== 'identity') {
        fail(new Error('静态响应审计只接受 identity Content-Encoding'))
      }
      upstream.on('data', (chunk: Buffer) => {
        bytes += chunk.length
        totalBytes += chunk.length
        digest.update(chunk)
        if (bytes > MAX_BYTES || totalBytes > MAX_BYTES) {
          fail(new Error('静态响应审计超过字节上限'))
        }
      })
      upstream.once('end', () => {
        upstreamEnded = true
      })
      const finish = () => {
        if (settled) return
        settled = true
        active -= 1
        if (!upstreamEnded || !response.writableFinished) {
          fail(new Error('静态响应没有完整传送到浏览器'))
          return
        }
        if (entries.length >= MAX_ENTRIES) {
          fail(new Error('静态响应审计超过条目上限'))
          return
        }
        entries.push({
          sequence,
          ...selection,
          status: upstream.statusCode,
          bytes,
          sha256: digest.digest('hex'),
          representation: 'identity',
        })
      }
      response.once('finish', finish)
      response.once('close', finish)
      upstream.once('aborted', () => fail(new Error('静态响应上游提前中断')))
      upstream.once('error', fail)
    },
    fail,
    async publish() {
      if (active !== 0) throw new Error('静态响应审计仍有未结束请求')
      if (failure) throw failure
      entries.sort((left, right) => left.sequence - right.sequence)
      if (!entries.length || entries.some((entry, index) => entry.sequence !== index + 1)) {
        throw new Error('静态响应审计缺少连续的实际响应')
      }
      const receipt = {
        format_version: 1,
        kind: 'business-preview-static-responses',
        status: 'complete',
        run_id: runId,
        scope_id: scopeId,
        limits: { entries: MAX_ENTRIES, bytes: MAX_BYTES },
        total_entries: entries.length,
        total_bytes: totalBytes,
        entries,
      }
      await publishCreateOnly(path, receipt)
      return receipt
    },
  })
}
