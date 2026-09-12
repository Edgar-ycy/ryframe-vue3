import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { sha256 } from './build-source-inventory.mjs'
import { restoreProofBindings } from './restore-proof.mjs'
import {
  inspectRestoreRuntimeReceipt,
  restoreRuntimeBinding,
  verifyRestoreRuntimeReceipt,
} from './restore-runtime-receipt.mjs'
import { parseXtaskJsonReceipt } from './xtask-receipt.mjs'

const verificationFields = [
  'format_version',
  'kind',
  'status',
  'runtime_receipt_sha256',
  'bindings',
  'build_receipts',
  'restore',
  'source',
  'endpoints',
  'processes',
  'api_readiness',
  'frontend',
]

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

/** 核验测试 runner 或产品源码使用预期提交的干净仓库根。 */
export function verifiedCheckout(directory, sha, label = '源码目录', execute = execFileSync) {
  const root = evidenceDirectory(directory, label)
  if (!validHex(sha, 40)) throw new Error(`${label}缺少精确提交 SHA`)
  const git = (...args) =>
    execute('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true }).trim()
  if (
    !samePath(realpathSync.native(git('rev-parse', '--show-toplevel')), root) ||
    git('rev-parse', 'HEAD') !== sha ||
    git('status', '--porcelain', '--untracked-files=all')
  )
    throw new Error(`${label}必须是预期 SHA 的干净仓库根目录`)
  return root
}

function exactObject(value, fields, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')
  )
    throw new Error(`${label}字段必须精确匹配当前格式`)
  return value
}

function validHex(value, size = 64) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${size}}$`, 'u').test(value)
}

function pathDigest(value, label) {
  const result = exactObject(value, ['path', 'sha256'], label)
  if (typeof result.path !== 'string' || !path.isAbsolute(result.path) || !validHex(result.sha256))
    throw new Error(`${label}路径或摘要无效`)
  return result
}

function exactValues(value, expected, label) {
  const result = exactObject(value, Object.keys(expected), label)
  if (Object.entries(expected).some(([field, expectedValue]) => result[field] !== expectedValue))
    throw new Error(`${label}与权威恢复上下文不一致`)
}

function artifactDescriptor(value, label) {
  const result = exactObject(value, ['path', 'bytes', 'sha256'], label)
  if (
    typeof result.path !== 'string' ||
    !path.isAbsolute(result.path) ||
    !Number.isInteger(result.bytes) ||
    result.bytes < 0 ||
    !validHex(result.sha256)
  )
    throw new Error(`${label}无效`)
  return result
}

function processObservation(value, expectedProcess, expectedArtifact, label) {
  const result = exactObject(value, ['identity', 'process_receipt', 'executable'], label)
  const identity = exactObject(result.identity, ['pid', 'started', 'executable'], `${label}身份`)
  if (
    !Number.isInteger(identity.pid) ||
    identity.pid <= 1 ||
    typeof identity.started !== 'string' ||
    !identity.started ||
    typeof identity.executable !== 'string' ||
    !path.isAbsolute(identity.executable)
  )
    throw new Error(`${label}身份无效`)
  const processReceipt = pathDigest(result.process_receipt, `${label}进程收据`)
  const executable = artifactDescriptor(result.executable, `${label}可执行文件`)
  if (
    identity.pid !== expectedProcess.identity.pid ||
    identity.started !== expectedProcess.identity.started ||
    !samePath(identity.executable, expectedProcess.identity.executable) ||
    !samePath(processReceipt.path, expectedProcess.receipt_path) ||
    processReceipt.sha256 !== expectedProcess.receipt_sha256 ||
    (expectedArtifact !== undefined &&
      (!samePath(executable.path, expectedArtifact.executable) ||
        executable.bytes !== expectedArtifact.bytes ||
        executable.sha256 !== expectedArtifact.sha256)) ||
    !samePath(identity.executable, executable.path)
  )
    throw new Error(`${label}与运行收据绑定的进程或可执行文件不一致`)
  return processReceipt
}

function validFrontendFile(value, expected, previous) {
  const file = exactObject(value, ['path', 'bytes', 'sha256'], '运行核验前端文件')
  const parts = typeof file.path === 'string' ? file.path.split('/') : []
  if (
    parts.length === 0 ||
    parts.some((part) => !part || part === '.' || part === '..') ||
    file.path.includes('\\') ||
    file.path.startsWith('/') ||
    file.path <= previous ||
    !Number.isInteger(file.bytes) ||
    file.bytes < 0 ||
    !validHex(file.sha256) ||
    file.path !== expected.path ||
    file.bytes !== expected.bytes ||
    file.sha256 !== expected.sha256
  )
    throw new Error('运行核验前端文件必须与运行收据中的有序生产文件一致')
  return file.path
}

function verificationBindings(authority) {
  return {
    restore: {
      id: authority.restore_id,
      backup_id: authority.backup_id,
      plan_hash: authority.plan_hash,
      scope_id: authority.scope_id,
      data_verified_at: authority.data_verified_at,
    },
    source: {
      backup_source_sha: authority.backup_source_sha,
      backend_product_sha: authority.backend_product_sha,
      backend_execution_sha: authority.backend_execution_sha,
      backend_adapter_contract: authority.backend_adapter_contract,
      frontend_sha: authority.frontend_sha,
    },
    endpoints: {
      api: authority.api_endpoint,
      worker: authority.worker_endpoint,
      frontend: authority.frontend_endpoint,
    },
  }
}

function verificationResult(output, { runtime, binding, expected, roots }) {
  let value
  try {
    value = parseXtaskJsonReceipt(output)
  } catch {
    throw new Error('运行产物核验未返回单一 JSON 结果')
  }
  exactObject(value, verificationFields, '运行产物核验结果')
  if (
    value.format_version !== 1 ||
    value.kind !== 'restore-runtime-verification' ||
    value.status !== 'verified' ||
    !validHex(value.runtime_receipt_sha256)
  )
    throw new Error('运行产物核验未返回完整有效的 verified 结果')
  const { digest, receipt: runtimeReceipt } = verifyRestoreRuntimeReceipt({
    bytes: runtime.bytes,
    verifiedDigest: value.runtime_receipt_sha256,
    bindingsBytes: binding.bytes,
    expected,
  })
  if (
    !samePath(runtimeReceipt.paths.bindings, binding.path) ||
    !samePath(runtimeReceipt.paths.backend_product_root, roots.product) ||
    !samePath(runtimeReceipt.paths.backend_execution_root, roots.execution) ||
    !samePath(runtimeReceipt.paths.frontend_root, roots.frontend)
  )
    throw new Error('运行收据没有绑定本次核验的 bindings 或源码目录')
  const bindings = pathDigest(value.bindings, '运行产物核验 bindings')
  if (!samePath(bindings.path, binding.path) || bindings.sha256 !== sha256(binding.bytes))
    throw new Error('运行产物核验 bindings 与本次输入不一致')
  const bindingsExpected = verificationBindings(expected.authority)
  for (const field of Object.keys(bindingsExpected)) {
    exactValues(runtimeReceipt[field], bindingsExpected[field], `运行收据 ${field}`)
    exactValues(value[field], bindingsExpected[field], `运行核验 ${field}`)
  }

  const builds = exactObject(
    value.build_receipts,
    ['backend', 'frontend', 'launch'],
    '运行产物核验构建收据',
  )
  const backendBuild = pathDigest(builds.backend, '运行产物核验后端构建收据')
  const frontendBuild = pathDigest(builds.frontend, '运行产物核验前端构建收据')
  const launch = pathDigest(builds.launch, '运行产物核验启动收据')
  if (
    !samePath(backendBuild.path, runtimeReceipt.paths.backend_build) ||
    backendBuild.sha256 !== runtimeReceipt.digests.backend_build ||
    !samePath(frontendBuild.path, runtimeReceipt.paths.frontend_build) ||
    frontendBuild.sha256 !== runtimeReceipt.digests.frontend_build ||
    !samePath(launch.path, runtimeReceipt.paths.launch) ||
    launch.sha256 !== runtimeReceipt.digests.launch
  )
    throw new Error('运行产物核验构建收据与运行收据不一致')

  const processes = exactObject(value.processes, ['api', 'worker', 'frontend'], '运行产物核验进程')
  const processReceipts = [
    processObservation(
      processes.api,
      runtimeReceipt.processes.api,
      runtimeReceipt.backend.artifacts.api,
      'API 运行核验',
    ),
    processObservation(
      processes.worker,
      runtimeReceipt.processes.worker,
      runtimeReceipt.backend.artifacts.worker,
      'Worker 运行核验',
    ),
    processObservation(
      processes.frontend,
      runtimeReceipt.processes.frontend,
      undefined,
      '前端运行核验',
    ),
  ]
  if (
    processReceipts.some((item, index) =>
      processReceipts.slice(index + 1).some((other) => samePath(item.path, other.path)),
    )
  )
    throw new Error('运行产物核验进程收据路径重复')

  const readiness = exactObject(
    value.api_readiness,
    ['status', 'mysql', 'redis', 'object_storage'],
    '运行产物核验 API readiness',
  )
  if (
    readiness.status !== 'ready' ||
    readiness.mysql !== 'up' ||
    !['up', 'optional_degraded'].includes(readiness.redis) ||
    !['up', 'not_required'].includes(readiness.object_storage)
  )
    throw new Error('运行产物核验 API readiness 无效')

  const frontend = exactObject(
    value.frontend,
    ['build_receipt_sha256', 'files'],
    '运行产物核验前端结果',
  )
  if (
    frontend.build_receipt_sha256 !== frontendBuild.sha256 ||
    !Array.isArray(frontend.files) ||
    frontend.files.length !== runtimeReceipt.frontend.files.length
  )
    throw new Error('运行产物核验前端结果无效')
  let previous = ''
  const frontendFiles = new Set()
  for (const [index, file] of frontend.files.entries()) {
    previous = validFrontendFile(file, runtimeReceipt.frontend.files[index], previous)
    frontendFiles.add(previous)
  }
  if (!frontendFiles.has('index.html') || !frontendFiles.has('.vite/manifest.json'))
    throw new Error('运行产物核验前端结果缺少生产首页或 Vite manifest')
  return digest
}

export function verifyRuntime(
  { receipt, bindings, targetPlan, backend, frontend, baseURL, python },
  execute = execFileSync,
  environment = process.env,
) {
  const runtime = evidenceFile(receipt, '运行产物收据')
  const binding = evidenceFile(bindings, '恢复绑定收据')
  const target = evidenceFile(targetPlan, '恢复目标计划')
  const backendRoot = evidenceDirectory(backend, '后端源码目录')
  const frontendRoot = evidenceDirectory(frontend, '前端源码目录')
  if (typeof baseURL !== 'string' || !baseURL.trim() || baseURL !== baseURL.trim())
    throw new Error('浏览器地址不能为空或包含首尾空白')
  const { record, manifest } = restoreProofBindings(binding.bytes)
  const expected = restoreRuntimeBinding({
    record,
    manifest,
    targetPlanBytes: target.bytes,
    frontendEndpoint: baseURL,
  })
  inspectRestoreRuntimeReceipt({
    bytes: runtime.bytes,
    bindingsBytes: binding.bytes,
    expected,
  })
  const roots = {
    product: evidenceDirectory(expected.roots.source_backend, '后端产品源码目录'),
    execution: evidenceDirectory(expected.roots.execution_backend, '后端执行源码目录'),
    frontend: evidenceDirectory(expected.roots.frontend, '前端运行源码目录'),
  }
  if (!samePath(roots.frontend, frontendRoot))
    throw new Error('恢复目标计划没有绑定当前前端源码目录')
  const authority = expected.authority
  const pythonPath = absolutePath(python, '恢复运行核验 Python')
  const childEnvironment = { ...environment }
  for (const name of Object.keys(childEnvironment)) {
    if (name.startsWith('RYFRAME_RESTORE_RUNTIME_')) delete childEnvironment[name]
  }
  delete childEnvironment.RYFRAME_RESTORE_SOURCE_PROTOCOL
  delete childEnvironment.RYFRAME_DEVEX_TARGET_ROOT
  childEnvironment.RYFRAME_WORKSPACE_ROOT = backendRoot
  childEnvironment.RYFRAME_PYTHON = pythonPath
  childEnvironment.PYTHONUTF8 = '1'
  childEnvironment.PYTHONIOENCODING = 'utf-8'
  const result = execute(
    'cargo',
    [
      'xtask',
      'check',
      'recovery',
      'runtime',
      'verify',
      '--source-backend',
      roots.execution,
      '--source-frontend',
      roots.frontend,
      '--receipt',
      runtime.path,
      '--bindings',
      binding.path,
      ...(authority.backend_adapter_contract === null
        ? []
        : [
            '--adapter-contract',
            authority.backend_adapter_contract,
            '--product-backend',
            roots.product,
          ]),
    ],
    {
      cwd: backendRoot,
      encoding: 'utf8',
      env: childEnvironment,
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
      input: JSON.stringify(authority),
    },
  )
  const digest = verificationResult(result, {
    runtime,
    binding,
    expected,
    roots,
  })
  const runtimeAfter = evidenceFile(runtime.path, '运行产物收据')
  const bindingAfter = evidenceFile(binding.path, '恢复绑定收据')
  const targetAfter = evidenceFile(target.path, '恢复目标计划')
  if (
    !runtime.bytes.equals(runtimeAfter.bytes) ||
    !binding.bytes.equals(bindingAfter.bytes) ||
    !target.bytes.equals(targetAfter.bytes)
  )
    throw new Error('运行产物核验期间输入收据发生变化')
  return digest
}
