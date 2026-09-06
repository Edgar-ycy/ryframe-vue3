import { request } from 'node:http'
import { deflateSync } from 'node:zlib'

const CHUNK_BYTES = 64 * 1024
const MULTIPART_BOUNDARY = 'ryframe-upload-limit-boundary'

function checksum(buffer: Buffer): number {
  let value = 0xffffffff
  for (const byte of buffer) {
    value ^= byte
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  }
  return (value ^ 0xffffffff) >>> 0
}

function chunk(name: string, body: Buffer): Buffer {
  const type = Buffer.from(name)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(body.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(checksum(Buffer.concat([type, body])))
  return Buffer.concat([length, type, body, crc])
}

/** 有效的 1024×1024 RGB PNG；可用安全的私有 ancillary chunk 补齐精确文件字节数。 */
export function largeUploadPng(exactBytes?: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1024, 0)
  header.writeUInt32BE(1024, 4)
  header[8] = 8
  header[9] = 2
  const pixels = Buffer.alloc((1 + 1024 * 3) * 1024)
  const prefix = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 0 })),
  ])
  const end = chunk('IEND', Buffer.alloc(0))
  if (exactBytes === undefined) return Buffer.concat([prefix, end])
  const paddingBytes = exactBytes - prefix.length - end.length - 12
  if (!Number.isSafeInteger(exactBytes) || paddingBytes < 0 || paddingBytes > 0xffffffff) {
    throw new Error('PNG 精确字节数无法由测试 fixture 安全表示')
  }
  return Buffer.concat([prefix, chunk('ryFa', Buffer.alloc(paddingBytes)), end], exactBytes)
}

export interface MultipartFileUploadOptions {
  fileBytes: number
  fileName: string
  mimeType: string
}

export interface MultipartFileUploadResult {
  status: number
  sentFileBytes: number
}

function assertLocalUpload(url: URL, options: MultipartFileUploadOptions): void {
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error('上传边界测试只能访问显式本机代理')
  }
  if (!Number.isSafeInteger(options.fileBytes) || options.fileBytes <= 0) {
    throw new Error('上传边界测试文件大小必须是正整数')
  }
  if (!/^[A-Za-z0-9._-]+$/u.test(options.fileName)) {
    throw new Error('上传边界测试文件名只能包含安全字符')
  }
  if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/iu.test(options.mimeType)) {
    throw new Error('上传边界测试媒体类型无效')
  }
}

/** 发送合法的分块 multipart 文件；收到服务端拒绝便停止，不重试或复用连接。 */
export function multipartFileUpload(
  url: URL,
  method: 'POST' | 'PUT',
  headers: Record<string, string>,
  options: MultipartFileUploadOptions,
): Promise<MultipartFileUploadResult> {
  assertLocalUpload(url, options)
  if (
    Object.keys(headers).some((name) =>
      ['content-length', 'content-type', 'transfer-encoding'].includes(name.toLowerCase()),
    )
  ) {
    throw new Error('上传边界测试自行控制 multipart 与分块传输头')
  }

  const prefix = Buffer.from(
    `--${MULTIPART_BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${options.fileName}"\r\n` +
      `Content-Type: ${options.mimeType}\r\n\r\n`,
  )
  const suffix = Buffer.from(`\r\n--${MULTIPART_BOUNDARY}--\r\n`)

  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let prefixOffset = 0
    let sentFileBytes = 0
    let suffixOffset = 0
    let responding = false
    let settled = false

    const client = request(
      url,
      {
        method,
        headers: {
          ...headers,
          'Content-Type': `multipart/form-data; boundary=${MULTIPART_BOUNDARY}`,
        },
        agent: false,
      },
      (response) => {
        responding = true
        clearTimeout(timer)
        client.end()
        response.resume()
        response.once('aborted', () => fail('上传拒绝响应被提前中断'))
        response.once('error', () => fail('上传拒绝响应未完整接收'))
        response.once('end', () => {
          if (settled) return
          settled = true
          resolve({ status: response.statusCode ?? 0, sentFileBytes })
        })
      },
    )

    const fail = (message: string) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      client.destroy()
      reject(new Error(message))
    }

    client.setTimeout(15_000, () => fail('上传边界请求超时'))
    client.once('error', () => {
      if (!responding) fail('上传边界请求发生未预期的传输失败')
    })
    client.once('close', () => {
      if (!responding) fail('上传边界连接在收到响应前关闭')
    })

    const nextChunk = (): Buffer | undefined => {
      if (prefixOffset < prefix.length) {
        const output = prefix.subarray(prefixOffset, prefixOffset + CHUNK_BYTES)
        prefixOffset += output.length
        return output
      }
      if (sentFileBytes < options.fileBytes) {
        const length = Math.min(CHUNK_BYTES, options.fileBytes - sentFileBytes)
        sentFileBytes += length
        return Buffer.alloc(length)
      }
      if (suffixOffset < suffix.length) {
        const output = suffix.subarray(suffixOffset, suffixOffset + CHUNK_BYTES)
        suffixOffset += output.length
        return output
      }
      return undefined
    }

    const send = () => {
      if (responding || client.destroyed) return
      const body = nextChunk()
      if (!body) {
        client.end()
        return
      }
      client.write(body)
      timer = setTimeout(send, 1)
    }
    send()
  })
}
