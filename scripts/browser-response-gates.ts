import { createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

type GateState =
  | 'armed'
  | 'captured'
  | 'held'
  | 'expired'
  | 'discarded'
  | 'oversized'
  | 'upstream-failed'
  | 'client-closed'
  | 'released'

interface Gate {
  id: unknown
  method: string
  path: unknown
  clientAddress: unknown
  state: GateState
  createdAt: number
  capturedAt?: number
  clientClosedAt?: number
  upstreamAt?: number
  status?: number
  bytes?: number
  sha256?: string
  cookieCount?: number
  releasedAt?: number
  timer?: ReturnType<typeof setTimeout>
  release?: () => void
  cancel?: () => void
}

interface GateCommand {
  action?: unknown
  id?: unknown
  match?: { method?: unknown; path?: unknown; clientAddress?: unknown } | null
}

interface GateOptions {
  maximumBytes?: number
  now?: () => number
}

const activeStates = new Set<GateState>(['armed', 'captured', 'held'])
const proofKeys = [
  'id',
  'method',
  'path',
  'state',
  'createdAt',
  'capturedAt',
  'clientClosedAt',
  'upstreamAt',
  'status',
  'bytes',
  'sha256',
  'cookieCount',
  'releasedAt',
] as const
type GateProof = Pick<Gate, (typeof proofKeys)[number]>

function validClientAddress(value: unknown): boolean {
  const match = /^198\.(18|19)\.(\d{1,3})\.(\d{1,3})$/u.exec((value || '') as string)
  return Boolean(match && Number(match[2]) <= 255 && Number(match[3]) <= 255)
}

function proof(gate: Gate): GateProof {
  return Object.fromEntries(
    Object.entries(gate).filter(([key]) => proofKeys.some((field) => field === key)),
  ) as GateProof
}

/** 只控制测试代理的传输时序，不修改产品响应，也不记录请求或响应正文。 */
export function createResponseGates({
  maximumBytes = 2 * 1024 * 1024,
  now = Date.now,
}: GateOptions = {}) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error('响应门缓存上限必须是正整数')
  }
  const gates = new Map<unknown, Gate>()

  function command(input: unknown): GateProof {
    const message = input as GateCommand | null | undefined
    const { action, id } = message ?? {}
    // 保留原控制协议由正则执行的字符串转换，匹配时仍核对原值。
    if (!/^[a-z0-9-]{8,80}$/u.test((id || '') as string)) throw new Error('无效的响应门标识')
    if (action === 'arm') {
      const { method, path, clientAddress } = message?.match ?? {}
      if (
        typeof method !== 'string' ||
        !['GET', 'POST', 'PUT', 'DELETE'].includes(method) ||
        !/^\/api\/v1\/[a-z0-9/-]+$/u.test((path || '') as string) ||
        !validClientAddress(clientAddress)
      ) {
        throw new Error('响应门必须绑定精确业务路径与隔离客户地址')
      }
      if (gates.has(id) || [...gates.values()].some((gate) => activeStates.has(gate.state))) {
        throw new Error('响应门已经存在或另一个响应门尚未结束')
      }
      gates.set(id, {
        id,
        method,
        path,
        clientAddress,
        state: 'armed',
        createdAt: now(),
      })
    }
    const gate = gates.get(id)
    if (!gate) throw new Error('响应门不存在')
    if (action === 'release') {
      if (!gate.release) throw new Error('真实上游响应尚未完整到达')
      gate.release()
    } else if (action === 'discard') {
      gate.cancel?.()
      gates.delete(id)
    } else if (action !== 'arm' && action !== 'status') {
      throw new Error('未知响应门操作')
    }
    return proof(gate)
  }

  function claim(request: Pick<IncomingMessage, 'url' | 'method' | 'headers'>): Gate | undefined {
    const path = new URL(String(request.url), 'http://127.0.0.1').pathname
    const gate = [...gates.values()].find(
      (entry) =>
        entry.state === 'armed' &&
        entry.method === request.method &&
        entry.path === path &&
        entry.id === request.headers['x-ryframe-test-gate'] &&
        entry.clientAddress === request.headers['x-forwarded-for'],
    )
    if (gate) {
      gate.state = 'captured'
      gate.capturedAt = now()
    }
    return gate
  }

  function hold(
    gate: Gate,
    upstream: IncomingMessage & { statusCode: number },
    response: ServerResponse,
  ): void {
    const chunks: Buffer[] = []
    let size = 0
    const terminate = (state: GateState) => {
      if (!activeStates.has(gate.state)) return
      gate.state = state
      clearTimeout(gate.timer)
      upstream.destroy()
      response.destroy()
    }
    gate.timer = setTimeout(() => terminate('expired'), 60_000)
    gate.timer.unref()
    gate.cancel = () => terminate('discarded')
    response.on('close', () => {
      if (!response.writableEnded) gate.clientClosedAt = now()
    })
    upstream.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maximumBytes) terminate('oversized')
      else chunks.push(chunk)
    })
    upstream.on('aborted', () => terminate('upstream-failed'))
    upstream.on('error', () => terminate('upstream-failed'))
    upstream.on('end', () => {
      if (gate.state !== 'captured') return
      const body = Buffer.concat(chunks)
      gate.state = 'held'
      gate.upstreamAt = now()
      gate.status = upstream.statusCode
      gate.bytes = body.length
      gate.sha256 = createHash('sha256').update(body).digest('hex')
      gate.cookieCount = upstream.headers['set-cookie']?.length || 0
      gate.release = () => {
        if (gate.state !== 'held') throw new Error('响应门不能重复释放')
        clearTimeout(gate.timer)
        gate.releasedAt = now()
        gate.state = response.destroyed ? 'client-closed' : 'released'
        if (!response.destroyed) {
          response.writeHead(upstream.statusCode, upstream.rawHeaders)
          response.end(body)
        }
      }
    })
  }

  return {
    command,
    claim,
    hold,
    close: () => {
      for (const gate of gates.values()) gate.cancel?.()
    },
  }
}
