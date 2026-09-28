import {
  createServer,
  type IncomingHttpHeaders,
  type RequestListener,
  type Server,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { largeUploadPng, multipartFileUpload } from '../browser-real/upload-fixture'

const servers: Server[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
        }),
    ),
  )
})

async function localServer(onRequest: RequestListener): Promise<{ server: Server; url: URL }> {
  const server = createServer(onRequest)
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address() as AddressInfo
  return { server, url: new URL(`http://127.0.0.1:${address.port}/upload`) }
}

describe('真实上传边界 fixture', () => {
  it('生成超过提取器默认上限且尺寸固定的有效 PNG', () => {
    const image = largeUploadPng()
    expect(image.length).toBeGreaterThan(2 * 1024 * 1024)
    expect(image.length).toBeLessThan(5 * 1024 * 1024)
    expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(image.readUInt32BE(16)).toBe(1024)
    expect(image.readUInt32BE(20)).toBe(1024)
    for (const exactBytes of [5 * 1024 * 1024, 10 * 1024 * 1024]) {
      const exact = largeUploadPng(exactBytes)
      expect(exact.length).toBe(exactBytes)
      expect(exact.subarray(0, 8)).toEqual(image.subarray(0, 8))
      expect(exact.subarray(-12)).toEqual(image.subarray(-12))
      expect(exact.includes(Buffer.from('ryFa'))).toBe(true)
    }
  })

  it('使用合法 multipart 和 chunked 传输发送精确文件字节数', async () => {
    let observedHeaders: IncomingHttpHeaders | undefined
    let observedBody = Buffer.alloc(0)
    const { url } = await localServer((request, response) => {
      observedHeaders = request.headers
      const chunks: Buffer[] = []
      request.on('data', (value: Buffer) => chunks.push(value))
      request.on('end', () => {
        observedBody = Buffer.concat(chunks)
        response.statusCode = 413
        response.end()
      })
    })
    const result = await multipartFileUpload(
      url,
      'POST',
      { Authorization: 'Bearer test' },
      {
        fileBytes: 70 * 1024,
        fileName: 'oversized.txt',
        mimeType: 'text/plain',
      },
    )

    expect(result).toEqual({ status: 413, sentFileBytes: 70 * 1024 })
    expect(observedHeaders?.['content-length']).toBeUndefined()
    expect(observedHeaders?.['transfer-encoding']).toBe('chunked')
    const contentType = observedHeaders?.['content-type']
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/u)
    const boundary = contentType?.split('boundary=')[1]
    expect(observedBody.subarray(0, boundary!.length + 2).toString()).toBe(`--${boundary}`)
    expect(observedBody.subarray(-(boundary!.length + 8)).toString()).toBe(
      `\r\n--${boundary}--\r\n`,
    )
    expect(observedBody.includes(Buffer.from('filename="oversized.txt"'))).toBe(true)
    expect(observedBody.includes(Buffer.from('Content-Type: text/plain'))).toBe(true)
    const contentStart = observedBody.indexOf(Buffer.from('\r\n\r\n')) + 4
    const contentEnd = observedBody.lastIndexOf(Buffer.from(`\r\n--${boundary}--\r\n`))
    expect(contentStart).toBeGreaterThan(3)
    expect(contentEnd - contentStart).toBe(70 * 1024)
    expect(observedBody.subarray(contentStart, contentEnd).every((byte) => byte === 0)).toBe(true)
  })

  it('在建立连接前拒绝外部地址和冲突的传输头', () => {
    const options = {
      fileBytes: 1,
      fileName: 'oversized.txt',
      mimeType: 'text/plain',
    }
    expect(() =>
      multipartFileUpload(new URL('https://example.com/upload'), 'POST', {}, options),
    ).toThrow('上传边界测试只能访问显式本机代理')
    expect(() =>
      multipartFileUpload(
        new URL('http://127.0.0.1:49152/upload'),
        'POST',
        { 'Content-Length': '1' },
        options,
      ),
    ).toThrow('上传边界测试自行控制 multipart 与分块传输头')
  })
})
