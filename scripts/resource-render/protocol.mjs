import { renderResourceAssets } from './index.mjs'
import { parseJson } from './json.mjs'

export const maxInputBytes = 16 * 1024 * 1024
export const maxOutputBytes = 64 * 1024 * 1024

export function renderRequest(source) {
  if (Buffer.byteLength(source, 'utf8') > maxInputBytes) throw new Error('输入超过 16 MiB')
  const request = parseJson(source)
  const keys = ['format_version', 'generator_version', 'aggregate', 'resources']
  if (
    !request ||
    Array.isArray(request) ||
    typeof request !== 'object' ||
    Object.keys(request).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(request, key))
  )
    throw new Error('请求字段不完整或包含未知字段')
  if (request.format_version !== 1) throw new Error('不支持的资源渲染协议版本；请同步前后端工具')
  if (!Array.isArray(request.resources)) throw new Error('resources 必须是资源数组')
  for (const resource of request.resources) {
    if (resource?.schema_version !== 1 || resource.profile !== 'flat_crud') {
      throw new Error('仅支持 schema_version=1 的 flat_crud 资源；请先完成后端资源校验')
    }
  }
  const assets = renderResourceAssets(request.resources, request.generator_version, {
    aggregate: request.aggregate,
  })
  const output =
    JSON.stringify({ format_version: 1, generator_version: request.generator_version, assets }) +
    '\n'
  if (Buffer.byteLength(output, 'utf8') > maxOutputBytes)
    throw new Error('生成结果超过 64 MiB；请拆分业务批次')
  return output
}

export async function readRequest(stream) {
  const chunks = []
  let bytes = 0
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > maxInputBytes) throw new Error('输入超过 16 MiB；未写入任何资产')
    chunks.push(buffer)
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
  } catch {
    throw new Error('输入不是有效 UTF-8；请通过标准输入传递资源 JSON')
  }
}
