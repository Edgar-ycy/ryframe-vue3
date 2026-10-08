import http from 'node:http'
import net from 'node:net'
import { createResponseGates } from './browser-response-gates.mjs'

export function localTarget(value) {
  const url = new URL(value)
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', '[::1]'].includes(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('测试代理只能转发到带明确端口的本机 HTTP 原点')
  }
  return url
}

function listen(instance, address) {
  return new Promise((resolve, reject) => {
    const failed = (error) => reject(error)
    instance.once('error', failed)
    instance.listen(address, () => {
      instance.off('error', failed)
      resolve()
    })
  })
}

function closeServer(instance) {
  if (!instance?.listening) return Promise.resolve()
  return new Promise((resolve, reject) => {
    instance.close((error) => (error ? reject(error) : resolve()))
  })
}

function forwardedHeaders(request, upstream, audited = false) {
  const headers = { ...request.headers, host: upstream.host }
  delete headers['x-ryframe-test-gate']
  if (audited) {
    headers['accept-encoding'] = 'identity'
    for (const name of ['range', 'if-range', 'if-match', 'if-none-match', 'if-modified-since']) {
      delete headers[name]
    }
  }
  return headers
}

export async function startDelayProxy({ target, port = 0, endpoint, audit }) {
  const upstream = localTarget(target)
  const gates = createResponseGates()
  const sockets = new Set()
  const remember = (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  }
  const server = http.createServer((request, response) => {
    if (!request.url?.startsWith('/') || request.url.startsWith('//')) {
      response.writeHead(400).end()
      return
    }
    let audited
    try {
      audited = audit?.classify(request)
    } catch {
      response.writeHead(400).end()
      return
    }
    const gate = gates.claim(request)
    const forwarded = http.request(
      upstream,
      {
        method: request.method,
        path: request.url,
        headers: forwardedHeaders(request, upstream, Boolean(audited)),
      },
      (result) => {
        if (gate) gates.hold(gate, result, response)
        else {
          if (audited) audit.track(audited, result, response)
          response.writeHead(result.statusCode, result.rawHeaders)
          result.pipe(response)
        }
      },
    )
    forwarded.on('error', () => {
      if (gate) gate.state = 'upstream-failed'
      if (audited) audit.fail(new Error('静态响应上游请求失败'))
      response.destroy()
    })
    request.on('aborted', () => forwarded.destroy())
    request.pipe(forwarded)
  })
  server.on('connection', remember)
  server.on('upgrade', (request, socket, head) => {
    const forwarded = http.request(upstream, {
      method: request.method,
      path: request.url,
      headers: forwardedHeaders(request, upstream),
    })
    forwarded.on('upgrade', (response, peer, peerHead) => {
      const headers = response.rawHeaders.reduce(
        (lines, value, index, values) =>
          index % 2 === 0 ? `${lines}${value}: ${values[index + 1]}\r\n` : lines,
        '',
      )
      socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n${headers}\r\n`)
      if (head.length) peer.write(head)
      if (peerHead.length) socket.write(peerHead)
      socket.pipe(peer).pipe(socket)
      socket.on('error', () => peer.destroy())
      socket.on('close', () => peer.destroy())
      peer.on('error', () => socket.destroy())
    })
    forwarded.on('error', () => socket.destroy())
    forwarded.on('response', () => socket.destroy())
    forwarded.end()
  })

  const control = endpoint
    ? net.createServer((socket) => {
        remember(socket)
        let text = ''
        let answered = false
        socket.setTimeout(5000, () => socket.destroy())
        socket.on('data', (data) => {
          if (answered) return
          text += data.toString('utf8')
          if (text.length > 4096) return socket.destroy()
          const newline = text.indexOf('\n')
          if (newline < 0) return
          answered = true
          try {
            if (text.slice(newline + 1).trim()) throw new Error('响应门每次只接受一个命令')
            const result = gates.command(JSON.parse(text.slice(0, newline)))
            socket.end(`${JSON.stringify({ data: result })}\n`)
          } catch {
            socket.end(`${JSON.stringify({ error: '测试响应门命令无效或状态不匹配' })}\n`)
          }
        })
      })
    : undefined

  if (control) await listen(control, endpoint)
  try {
    await listen(server, { host: '127.0.0.1', port })
  } catch (error) {
    await closeServer(control)
    throw error
  }
  const address = server.address()
  if (!address || typeof address === 'string') {
    await Promise.all([closeServer(server), closeServer(control)])
    throw new Error('真实浏览器代理没有取得 TCP 监听地址')
  }
  let closing
  return {
    origin: `http://127.0.0.1:${address.port}`,
    command: gates.command,
    close() {
      closing ??= (async () => {
        gates.close()
        for (const socket of sockets) socket.destroy()
        await Promise.all([closeServer(server), closeServer(control)])
      })()
      return closing
    },
  }
}
