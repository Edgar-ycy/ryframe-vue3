import { connect } from 'node:net'
import { randomUUID } from 'node:crypto'
import { expect, type Page, type Request, type TestInfo } from '@playwright/test'
import { markNextResponse } from './network'

interface GateProof {
  id: string
  state: string
  status?: number
  bytes?: number
  sha256?: string
  cookieCount?: number
  clientClosedAt?: number
}

async function command(message: object): Promise<GateProof> {
  const endpoint = process.env.RYFRAME_E2E_GATE_ENDPOINT
  if (!endpoint) throw new Error('会话竞争验收必须连接真实浏览器透明代理的 IPC')
  return new Promise((resolve, reject) => {
    const socket = connect(endpoint)
    let data = ''
    socket.setTimeout(5000, () => socket.destroy(new Error('响应门 IPC 超时')))
    socket.on('connect', () => socket.write(`${JSON.stringify(message)}\n`))
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8')
    })
    socket.on('error', reject)
    socket.on('end', () => {
      try {
        const result: { data?: GateProof; error?: string } = JSON.parse(data)
        if (!result.data || result.error) throw new Error(result.error || '响应门返回无效证据')
        resolve(result.data)
      } catch (error) {
        reject(error)
      }
    })
  })
}

export async function holdResponse(page: Page, method: string, path: string, address: string) {
  const id = randomUUID()
  await command({ action: 'arm', id, match: { method, path, clientAddress: address } })
  const unmark = markNextResponse(page, id, method, path)
  let captured: Request | undefined
  const observe = (request: Request) => {
    if (!captured && request.method() === method && new URL(request.url()).pathname === path) {
      captured = request
    }
  }
  page.on('request', observe)
  return {
    async held() {
      await expect.poll(async () => (await command({ action: 'status', id })).state).toBe('held')
      const proof = await command({ action: 'status', id })
      expect(proof.status).toBe(200)
      expect(proof.sha256).toMatch(/^[0-9a-f]{64}$/u)
      expect(captured, '浏览器必须实际发出被延迟的请求').toBeDefined()
      return proof
    },
    request: () => captured,
    release: () => command({ action: 'release', id }),
    async finish(info: TestInfo) {
      unmark()
      page.off('request', observe)
      const proof = await command({ action: 'status', id })
      await info.attach(`response-gate-${id}.json`, {
        body: JSON.stringify(proof, null, 2),
        contentType: 'application/json',
      })
      await command({ action: 'discard', id })
    },
  }
}
