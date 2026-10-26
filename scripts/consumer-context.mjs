import fs from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { checkApplicationPath } from './application-config-paths.mjs'
import { fileHash, optionalManagedFile, readManagedJson } from './application-config-files.mjs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'

const configurationPaths = ['config/tools.toml', '.local-tests/tools.toml']
const argumentKeys = [
  '--mode',
  '--openapi',
  '--backend-commit',
  '--backend-repository',
  '--require-pin',
]
const contextKeys = [
  'format_version',
  'arguments',
  'backend_root',
  'frontend_root',
  'origin_tool_binding',
  'tool_configuration',
]

function fail(field, reason) {
  throw new Error(`消费上下文 ${field} 无效：${reason}；请重新生成并稳定受管输入后重试`)
}

function exactKeys(value, keys, field) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort())
  )
    fail(field, '字段集合不匹配')
}

function absolutePath(value, field, { directory = false } = {}) {
  if (
    typeof value !== 'string' ||
    !path.isAbsolute(value) ||
    path.normalize(path.parse(value).root) !== path.parse(path.resolve(value)).root ||
    [...value].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    value.split(/[\\/]/u).includes('..')
  )
    fail(field, '必须为不含 ParentDir 的绝对路径')
  return checkApplicationPath(value, { directory, label: `消费上下文 ${field}` })
}

function samePath(left, right) {
  const normalize = (value) =>
    process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value)
  return normalize(left) === normalize(right)
}

function digest(value, field) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) {
    fail(field, 'sha256 必须为 64 位小写十六进制')
  }
}

function fileFact(file, field) {
  absolutePath(file, field)
  let bytes
  try {
    bytes = fs.readFileSync(file)
  } catch {
    fail(field, '无法读取必需的普通文件')
  }
  absolutePath(file, field)
  return { bytes: bytes.length, sha256: fileHash(bytes) }
}

function consumerArguments(values) {
  if (!Array.isArray(values) || values.length !== argumentKeys.length * 2) {
    fail('arguments', '必须恰好包含五对参数')
  }
  const result = new Map()
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]
    const value = values[index + 1]
    if (
      !argumentKeys.includes(key) ||
      result.has(key) ||
      typeof value !== 'string' ||
      !value ||
      /[\0\r\n]/u.test(value)
    )
      fail('arguments', '参数键、值或唯一性不匹配')
    result.set(key, value)
  }
  if (!['formal', 'candidate'].includes(result.get('--mode'))) fail('arguments.mode', '模式无效')
  if (!/^[0-9a-f]{40}$/iu.test(result.get('--backend-commit'))) {
    fail('arguments.backend-commit', '必须为完整 Git SHA')
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(result.get('--backend-repository'))) {
    fail('arguments.backend-repository', '必须为 owner/repository')
  }
  if (!['true', 'false'].includes(result.get('--require-pin'))) {
    fail('arguments.require-pin', '必须为 true 或 false 字符串')
  }
  absolutePath(result.get('--openapi'), 'arguments.openapi')
  return result
}

function executableSnapshot(file, expected) {
  absolutePath(file, 'origin.executable.path')
  const identity = (stat) =>
    ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].map((field) => String(stat[field]))
  let descriptor
  try {
    const before = identity(fs.statSync(file, { bigint: true }))
    descriptor = fs.openSync(file, 'r')
    const hash = createHash('sha256')
    const buffer = Buffer.alloc(64 * 1024)
    let count
    while ((count = fs.readSync(descriptor, buffer)) !== 0) hash.update(buffer.subarray(0, count))
    if (!isDeepStrictEqual(before, identity(fs.fstatSync(descriptor, { bigint: true })))) {
      fail('origin.executable', '读取期间身份漂移')
    }
    absolutePath(file, 'origin.executable.path')
    if (
      hash.digest('hex') !== expected ||
      !isDeepStrictEqual(before, identity(fs.statSync(file, { bigint: true })))
    ) {
      fail('origin.executable', '身份或摘要漂移')
    }
    return before
  } catch {
    fail('origin.executable', '无法确认普通程序文件的身份与摘要')
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor)
  }
}

function originDescription(value) {
  exactKeys(value, ['format_version', 'kind', 'executable', 'sources'], 'origin')
  if (value.format_version !== 1 || value.kind !== 'frontend-origin-tool') {
    fail('origin', '工具种类或版本不匹配')
  }
  exactKeys(value.executable, ['path', 'sha256'], 'origin.executable')
  digest(value.executable.sha256, 'origin.executable.sha256')
  if (!Array.isArray(value.sources) || !value.sources.length) fail('origin.sources', '必须为非空数组')
  for (const [index, item] of value.sources.entries()) {
    exactKeys(item, ['path', 'sha256'], 'origin.sources')
    digest(item.sha256, 'origin.sources.sha256')
    if (
      typeof item.path !== 'string' ||
      !item.path ||
      /[\\:\0\r\n]/u.test(item.path) ||
      item.path.split('/').some((part) => ['', '.', '..'].includes(part)) ||
      (index > 0 &&
        Buffer.compare(Buffer.from(value.sources[index - 1].path), Buffer.from(item.path)) >= 0)
    ) {
      fail('origin.sources', '必须为安全相对路径且按 UTF-8 字节有序、唯一')
    }
  }
  if (!value.sources.some((item) => item.path === 'xtask/source-inventory.json')) {
    fail('origin.sources', '缺少完整来源规则项')
  }
  return value
}

function verifyBinding(context) {
  const binding = context.origin_tool_binding
  exactKeys(binding, ['path', 'bytes', 'sha256'], 'origin_tool_binding')
  const file = absolutePath(binding.path, 'origin_tool_binding.path')
  if (!samePath(file, path.join(context.backend_root, '.local-tests/frontend-origin-tool.json'))) {
    fail('origin_tool_binding.path', '必须绑定后端固定的工具来源文件')
  }
  if (
    !Number.isSafeInteger(binding.bytes) ||
    binding.bytes <= 0 ||
    binding.bytes > 4 * 1024 * 1024
  ) {
    fail('origin_tool_binding.bytes', '必须为不超过 4 MiB 的正安全整数')
  }
  digest(binding.sha256, 'origin_tool_binding.sha256')
  const input = readManagedJson(path.dirname(file), path.basename(file), '消费上下文 origin')
  if (!input || input.bytes.length !== binding.bytes || fileHash(input.bytes) !== binding.sha256) {
    fail('origin_tool_binding', '字节数或摘要漂移')
  }
  absolutePath(file, 'origin_tool_binding.path')
  const description = originDescription(input.value)
  const identity = executableSnapshot(description.executable.path, description.executable.sha256)
  // 完整来源数组保留在固定绑定中；内容、集合与编译根由父 Rust 和原生入口核验。
  return { description, identity }
}

function verifyConfiguration(context) {
  if (!Array.isArray(context.tool_configuration)) fail('tool_configuration', '必须为数组')
  for (const item of context.tool_configuration) {
    exactKeys(item, ['path', 'sha256'], 'tool_configuration')
    if (!configurationPaths.includes(item.path)) fail('tool_configuration.path', '路径不在允许集合')
    digest(item.sha256, 'tool_configuration.sha256')
  }
  const current = []
  for (const relative of configurationPaths) {
    const file = optionalManagedFile(
      context.backend_root,
      relative,
      '消费上下文 tool_configuration',
    )
    if (file) current.push({ path: relative, sha256: fileFact(file, 'tool_configuration').sha256 })
  }
  if (!isDeepStrictEqual(current, context.tool_configuration)) {
    fail('tool_configuration', '公共、本机配置的存在性、有序集合或摘要漂移')
  }
}

function readSnapshot(file, frontendRoot) {
  absolutePath(file, 'file')
  const input = readManagedJson(path.dirname(file), path.basename(file), '消费上下文')
  if (!input) fail('file', '缺少必需文件')
  const context = input.value
  exactKeys(context, contextKeys, 'schema')
  if (context.format_version !== 1) fail('format_version', '只接受版本 1')
  absolutePath(context.backend_root, 'backend_root', { directory: true })
  const frontend = absolutePath(context.frontend_root, 'frontend_root', { directory: true })
  if (!samePath(frontend, frontendRoot)) fail('frontend_root', '必须等于当前工作目录')
  const argumentsMap = consumerArguments(context.arguments)
  const origin = verifyBinding(context)
  verifyConfiguration(context)
  return { context, arguments: argumentsMap, sha256: fileHash(input.bytes), origin }
}

/** 固定原始上下文摘要，并在每次任务前后重验文件、来源绑定和配置存在性集合。 */
export function readConsumerContext(raw, { frontendRoot = process.cwd() } = {}) {
  if (typeof raw !== 'string' || !raw || raw.split(/[\\/]/u).includes('..')) {
    fail('file', '路径不得为空或包含 ParentDir')
  }
  const file = path.isAbsolute(raw) ? raw : `${process.cwd()}${path.sep}${raw}`
  const before = readSnapshot(file, frontendRoot)
  const verifyUnchanged = () => {
    const after = readSnapshot(file, frontendRoot)
    if (before.sha256 !== after.sha256) fail('file', '上下文字节摘要漂移')
    if (!isDeepStrictEqual(before.origin, after.origin)) fail('origin', '程序身份或固定描述漂移')
  }
  verifyUnchanged()
  return {
    context: before.context,
    arguments: before.arguments,
    originTool: { executable: before.origin.description.executable.path },
    verifyUnchanged,
  }
}
