import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { checkApplicationPath } from './application-config-paths.mjs'
import { parseJson } from './resource-render/json.ts'

export const fileHash = (bytes) => createHash('sha256').update(bytes).digest('hex')

export function configurationSourcePath(root, file) {
  const relative = path.relative(path.resolve(root), path.resolve(file))
  if (!relative) return '.'
  const inside =
    relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
  return (inside ? relative : path.resolve(file)).replaceAll('\\', '/')
}

/** IO 错误只保留系统 code，原始消息与 cause 不进入受管配置诊断。 */
function ioFailure(label, error) {
  const code = error.code ?? 'UNKNOWN'
  const repair = code === 'ENOENT' ? '请核对文件是否存在及访问权限' : '请修正文件及访问权限'
  return new Error(`${label}读取失败：IO ${code}；${repair}`)
}

/** 可缺省的受管路径仅检查已存在的祖先；不忽略权限、坏文件或链接。 */
export function optionalManagedFile(root, relative, label) {
  checkApplicationPath(root, { directory: true, label })
  let cursor = root
  const parts = relative.split('/')
  for (const [index, part] of parts.entries()) {
    cursor += path.sep + part
    try {
      fs.lstatSync(cursor)
    } catch (error) {
      if (error.code === 'ENOENT') return undefined
      throw ioFailure(label, error)
    }
    checkApplicationPath(cursor, { directory: index !== parts.length - 1, label })
  }
  return path.resolve(cursor)
}

export function readManagedJson(root, relative, label) {
  const file = optionalManagedFile(root, relative, label)
  if (!file) return null
  let bytes
  try {
    bytes = fs.readFileSync(file)
  } catch (error) {
    throw ioFailure(label, error)
  }
  let source
  try {
    source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } catch {
    throw new Error(`${label}解码失败：必须是合法 UTF-8 JSON；请修正文件编码`)
  }
  let value
  try {
    value = parseJson(source)
  } catch {
    throw new Error(`${label}解析失败：必须是合法 UTF-8 JSON，禁止重复字段；请修正文件`)
  }
  return { value, bytes, source: { path: relative, sha256: fileHash(bytes) } }
}

export function unchangedManagedJson(root, relative, before, label) {
  const after = readManagedJson(root, relative, label)
  if ((before === null) !== (after === null) || (before && !before.bytes.equals(after.bytes))) {
    throw new Error(`${label}读取期间文件或所选文件集合漂移；请稳定配置后重试`)
  }
}
