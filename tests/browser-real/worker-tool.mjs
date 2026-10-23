import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { isDeepStrictEqual } from 'node:util'
import { checkApplicationPath } from '../../scripts/application-config-paths.mjs'
import { readManagedJson, unchangedManagedJson } from '../../scripts/application-config-files.mjs'
export { parseJson as parseWorkerJson } from '../../scripts/resource-render/json.mjs'

const bindingFile = '.local-tests/frontend-origin-tool.json'
const policyFile = 'xtask/source-inventory.json'
const bindingLimit = 4 * 1024 * 1024

function exact(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort())
  )
}

function relativePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !/[\\:\0\r\n]/u.test(value) &&
    value.split('/').every((part) => !['', '.', '..'].includes(part))
  )
}

function sourcePaths(backend) {
  const policy = readManagedJson(backend, policyFile, 'Worker 来源清单规则')?.value
  if (
    !exact(policy, ['format_version', 'files', 'trees', 'excluded_directories']) ||
    policy.format_version !== 1 ||
    ['files', 'trees', 'excluded_directories'].some(
      (key) => !Array.isArray(policy[key]) || !policy[key].every(relativePath),
    )
  ) {
    throw new Error('来源清单规则无效')
  }
  const found = new Set()
  const walk = (relative) => {
    const file = path.join(backend, relative)
    const info = fs.lstatSync(file)
    checkApplicationPath(file, { directory: info.isDirectory(), label: 'Worker 来源清单' })
    if (info.isDirectory()) {
      for (const name of fs.readdirSync(file)) {
        if (!policy.excluded_directories.includes(name)) walk(`${relative}/${name}`)
      }
    } else if (info.isFile()) found.add(relative)
    else throw new Error('来源不是普通文件')
  }
  for (const relative of [...policy.files, ...policy.trees]) walk(relative)
  return [...found].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
}

function snapshot(file, expected) {
  if (!path.isAbsolute(file) || file.split(/[\\/]/u).includes('..')) throw new Error('绑定路径无效')
  checkApplicationPath(file, { label: 'Worker 正式工具来源' })
  const identity = (stat) =>
    ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].map((field) => String(stat[field]))
  const before = identity(fs.statSync(file, { bigint: true }))
  const descriptor = fs.openSync(file, 'r')
  const hash = createHash('sha256')
  const buffer = Buffer.alloc(64 * 1024)
  try {
    let count
    while ((count = fs.readSync(descriptor, buffer)) !== 0) hash.update(buffer.subarray(0, count))
    if (!isDeepStrictEqual(before, identity(fs.fstatSync(descriptor, { bigint: true })))) {
      throw new Error('工具读取期间身份漂移')
    }
  } finally {
    fs.closeSync(descriptor)
  }
  checkApplicationPath(file, { label: 'Worker 正式工具来源' })
  if (
    hash.digest('hex') !== expected ||
    !isDeepStrictEqual(before, identity(fs.statSync(file, { bigint: true })))
  ) {
    throw new Error('工具身份或摘要漂移')
  }
  return before
}

/** 复用跨仓固定绑定和路径守卫，前后复核源码与程序；禁止 PATH 猜测或编译回退。 */
export function bindWorkerTool(backend) {
  const failure = () =>
    new Error(
      'Worker 正式工具绑定无效或漂移；请由主控核对当前源码、重新构建并登记 .local-tests/frontend-origin-tool.json；保留收据，不自动重放',
    )
  try {
    const binding = readManagedJson(backend, bindingFile, 'Worker 正式工具绑定')
    if (!binding || binding.bytes.length > bindingLimit) throw failure()
    const value = binding.value
    const digest = (item) =>
      exact(item, ['path', 'sha256']) &&
      typeof item.path === 'string' &&
      typeof item.sha256 === 'string' &&
      /^[a-f0-9]{64}$/u.test(item.sha256)
    if (
      !exact(value, ['format_version', 'kind', 'executable', 'sources']) ||
      value.format_version !== 1 ||
      value.kind !== 'frontend-origin-tool' ||
      !digest(value.executable) ||
      !Array.isArray(value.sources) ||
      value.sources.length === 0 ||
      !value.sources.some((item) => item.path === policyFile) ||
      value.sources.some(
        (item, index) =>
          !digest(item) ||
          !relativePath(item.path) ||
          (index > 0 &&
            Buffer.compare(Buffer.from(value.sources[index - 1].path), Buffer.from(item.path)) >=
              0),
      )
    ) {
      throw failure()
    }
    const inputs = value.sources.map((item) => ({ ...item, path: path.join(backend, item.path) }))
    inputs.push(value.executable)
    const expectedPaths = value.sources.map((item) => item.path)
    const before = inputs.map((item) => snapshot(item.path, item.sha256))
    const verifyUnchanged = () => {
      try {
        unchangedManagedJson(backend, bindingFile, binding, 'Worker 正式工具绑定')
        if (!isDeepStrictEqual(sourcePaths(backend), expectedPaths)) throw failure()
        inputs.forEach((item, index) => {
          if (!isDeepStrictEqual(before[index], snapshot(item.path, item.sha256))) throw failure()
        })
      } catch {
        throw failure()
      }
    }
    verifyUnchanged()
    return { executable: value.executable.path, verifyUnchanged }
  } catch {
    throw failure()
  }
}
