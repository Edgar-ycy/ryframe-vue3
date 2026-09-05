import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { sha256 } from './restore-build.mjs'

function samePath(left, right) {
  const normalize = (value) =>
    process.platform === 'win32' ? path.normalize(value).toLowerCase() : path.normalize(value)
  return normalize(left) === normalize(right)
}

function absolutePath(value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value))
    throw new Error(`${label}必须使用明确绝对路径`)
  return path.resolve(value)
}

export function evidenceFile(value, label) {
  const resolved = absolutePath(value, label)
  const stat = lstatSync(resolved)
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size === 0 || stat.size > 16 * 1024 * 1024)
    throw new Error(`${label}必须是 16 MiB 内的非空普通文件`)
  const canonical = realpathSync.native(resolved)
  if (!samePath(canonical, resolved)) throw new Error(`${label}不能通过链接或别名路径访问`)
  return { path: canonical, bytes: readFileSync(canonical) }
}

export function evidenceDirectory(value, label) {
  const resolved = absolutePath(value, label)
  const stat = lstatSync(resolved)
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${label}必须是实际目录`)
  const canonical = realpathSync.native(resolved)
  if (!samePath(canonical, resolved)) throw new Error(`${label}不能通过链接或别名路径访问`)
  return canonical
}

function verificationResult(output) {
  let value
  try {
    value = JSON.parse(output)
  } catch {
    throw new Error('运行产物核验未返回单一 JSON 结果')
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).join(',') !== 'runtime_receipt_sha256' ||
    !/^[a-f0-9]{64}$/u.test(value.runtime_receipt_sha256)
  )
    throw new Error('运行产物核验未返回唯一有效的收据摘要')
  return value.runtime_receipt_sha256
}

export function verifyRuntime(
  { receipt, bindings, backend, frontend, baseURL },
  execute = execFileSync,
) {
  const runtime = evidenceFile(receipt, '运行产物收据')
  const binding = evidenceFile(bindings, '恢复绑定收据')
  const backendRoot = evidenceDirectory(backend, '后端源码目录')
  const frontendRoot = evidenceDirectory(frontend, '前端源码目录')
  if (typeof baseURL !== 'string' || !baseURL.trim()) throw new Error('浏览器地址不能为空')
  const result = execute(
    process.env.RYFRAME_PYTHON?.trim() || 'python',
    [
      '-X',
      'utf8',
      path.join(backendRoot, 'scripts/restore_runtime.py'),
      'verify',
      '--backend-dir',
      backendRoot,
      '--frontend-dir',
      frontendRoot,
      '--receipt',
      runtime.path,
      '--bindings',
      binding.path,
      '--frontend-url',
      baseURL,
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 60_000, maxBuffer: 1024 * 1024 },
  )
  const digest = verificationResult(result)
  if (digest !== sha256(runtime.bytes)) throw new Error('运行产物核验摘要与实际收据内容不一致')
  const runtimeAfter = evidenceFile(runtime.path, '运行产物收据')
  const bindingAfter = evidenceFile(binding.path, '恢复绑定收据')
  if (!runtime.bytes.equals(runtimeAfter.bytes) || !binding.bytes.equals(bindingAfter.bytes))
    throw new Error('运行产物核验期间输入收据发生变化')
  return digest
}
