import http from 'node:http'
import { pathToFileURL } from 'node:url'

const maximum = 4096

function endpoint(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('浏览器凭据代理地址无效')
  }
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    url.pathname !== '/v1/credentials' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('浏览器凭据代理地址无效')
  return url
}

export function requestCredentials(value, request = http.get) {
  const url = endpoint(value)
  return new Promise((resolve, reject) => {
    const call = request(url, { headers: { accept: 'application/json' } }, (response) => {
      let bytes = 0
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        bytes += Buffer.byteLength(chunk)
        if (bytes > maximum) response.destroy(new Error('浏览器凭据响应超过 4 KiB'))
        else body += chunk
      })
      response.on('error', reject)
      response.on('end', () => {
        if (response.statusCode !== 200) return reject(new Error('浏览器凭据代理拒绝请求'))
        let result
        try {
          result = JSON.parse(body)
        } catch {
          return reject(new Error('浏览器凭据代理响应不是 JSON'))
        }
        if (
          !result ||
          typeof result !== 'object' ||
          Array.isArray(result) ||
          Object.keys(result).join(',') !== 'password' ||
          typeof result.password !== 'string' ||
          !result.password
        )
          return reject(new Error('浏览器凭据代理响应无效'))
        resolve(result)
      })
    })
    call.setTimeout(5000, () => call.destroy(new Error('浏览器凭据代理请求超时')))
    call.on('error', reject)
  })
}

async function main() {
  if (process.argv.length !== 3) throw new Error('浏览器凭据客户端只接受一个代理地址')
  process.stdout.write(JSON.stringify(await requestCredentials(process.argv[2])))
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(() => {
    console.error('浏览器凭据读取失败')
    process.exitCode = 1
  })
}
