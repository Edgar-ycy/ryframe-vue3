import {
  canonicalDigest,
  validateSourceDomains as validateFrontendSourceDomains,
  validateSourceInventory,
} from './build-source-inventory.mjs'
import { validateBuildContext as validateFrontendBuildContext } from './build-source.mjs'

const validHex = (value, size) =>
  typeof value === 'string' && new RegExp(`^[a-f0-9]{${size}}$`, 'u').test(value)

function exactObject(value, fields, message) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')
  )
    throw new Error(message)
}

function verifyBuildSource(sources, expectedSha) {
  const source = sources.full.source.snapshot
  if (
    source.head !== expectedSha ||
    !validHex(source.head, 40) ||
    !validHex(source.patch_sha256, 64) ||
    !Array.isArray(source.files) ||
    source.clean !== true
  )
    throw new Error('运行产物收据内嵌构建未绑定精确干净源码')
}

function backendProductRoles(relative) {
  const parts = relative.split('/')
  const first = parts[0]
  if (['scripts', 'xtask', 'tests', '.github', 'architecture', 'docs', 'deploy'].includes(first))
    return []
  if (first === 'crates' && parts.length >= 3 && parts[2] === 'tests') return []
  if (parts[0] === 'crates' && parts[1] === 'ryframe-api') return ['api']
  if (parts[0] === 'crates' && parts[1] === 'ryframe-generator') return []
  if (parts[0] === 'crates' && parts[1] === 'ryframe' && parts[2] === 'src') {
    const nested = parts.slice(3)
    if (nested.length === 0) return ['api', 'worker']
    if (nested[0] === 'main.rs') return ['api']
    if (nested[0] === 'reset') return []
    if (nested[0] === 'bin') {
      return nested[1] === 'ryframe_worker.rs' || nested[1] === 'ryframe_worker' ? ['worker'] : []
    }
    return ['api', 'worker']
  }
  if (parts[0] === 'crates' && parts[1] === 'ryframe') return ['api', 'worker']
  if (first === 'crates') return ['api', 'worker']
  if (['.cargo', 'vendor', 'catalog', 'config', 'locales', 'sql'].includes(first))
    return ['api', 'worker']
  if (first === 'openapi') return ['api']
  if (['Cargo.lock', 'Cargo.toml', 'rust-toolchain.toml'].includes(relative))
    return ['api', 'worker']
  if (
    [
      'CHANGELOG.md',
      'LICENSE',
      'README.md',
      '.dockerignore',
      '.editorconfig',
      '.gitattributes',
      '.gitignore',
      'deny.toml',
      'rustfmt.toml',
    ].includes(relative)
  )
    return []
  return ['api', 'worker']
}

function backendTool(relative) {
  const parts = relative.split('/')
  return (
    ['scripts', 'xtask', 'tests', '.github', 'architecture'].includes(parts[0]) ||
    (parts[0] === 'crates' && parts.length >= 3 && parts[2] === 'tests') ||
    ['deny.toml', 'rustfmt.toml'].includes(relative)
  )
}

function sourceGroup(files, selected) {
  const byPath = new Map(files.map((item) => [item.path, item]))
  return {
    sha256: canonicalDigest(selected.map((relative) => byPath.get(relative))),
    files: selected,
  }
}

export function backendSourceDomains(inventory) {
  validateSourceInventory(inventory)
  const roles = { api: [], worker: [] }
  const tools = []
  for (const file of inventory.files) {
    for (const role of backendProductRoles(file.path)) roles[role].push(file.path)
    if (backendTool(file.path)) tools.push(file.path)
  }
  return {
    product: {
      api: sourceGroup(inventory.files, roles.api),
      worker: sourceGroup(inventory.files, roles.worker),
    },
    tools: sourceGroup(inventory.files, tools),
    full: structuredClone(inventory),
  }
}

function validateBackendSourceDomains(value) {
  exactObject(value, ['product', 'tools', 'full'], '后端构建来源分域字段无效')
  exactObject(value.product, ['api', 'worker'], '后端产品来源角色无效')
  const expected = backendSourceDomains(validateSourceInventory(value.full))
  if (canonicalDigest(value) !== canonicalDigest(expected)) {
    throw new Error('后端构建来源分域与完整清单不一致')
  }
  return value
}

function backendCommand(role) {
  const [feature, name] = role === 'api' ? ['bin-api', 'ryframe'] : ['bin-worker', 'ryframe-worker']
  return [
    'cargo',
    'build',
    '--locked',
    '-p',
    'ryframe',
    '--no-default-features',
    '--features',
    feature,
    '--bin',
    name,
    '--message-format=json',
  ]
}

function validateBuildEnvironment(value) {
  exactObject(value, ['variables', 'sha256'], '后端构建环境摘要无效')
  if (
    !Array.isArray(value.variables) ||
    JSON.stringify(value.variables) !== JSON.stringify([...new Set(value.variables)].sort()) ||
    !value.variables.every((name) => typeof name === 'string' && name) ||
    !validHex(value.sha256, 64)
  )
    throw new Error('后端构建环境摘要无效')
}

function validateBackendBuildContext(value) {
  exactObject(
    value,
    ['commands', 'profile', 'target', 'jobs', 'toolchain', 'environment'],
    '后端构建上下文字段无效',
  )
  exactObject(value.commands, ['api', 'worker'], '后端构建命令字段无效')
  exactObject(value.toolchain, ['cargo', 'rustc'], '后端构建工具链字段无效')
  if (
    JSON.stringify(value.commands.api) !== JSON.stringify(backendCommand('api')) ||
    JSON.stringify(value.commands.worker) !== JSON.stringify(backendCommand('worker')) ||
    value.profile !== 'dev' ||
    typeof value.target !== 'string' ||
    !value.target ||
    typeof value.jobs !== 'string' ||
    !value.jobs ||
    !Object.values(value.toolchain).every((item) => typeof item === 'string' && item)
  )
    throw new Error('后端构建命令或工具链上下文无效')
  validateBuildEnvironment(value.environment)
}

export function validateBackendBuildSources(receipt, expectedSha) {
  validateBackendSourceDomains(receipt.sources)
  verifyBuildSource(receipt.sources, expectedSha)
  validateBackendBuildContext(receipt.build)
}

export function validateFrontendBuildSources(receipt, expectedSha) {
  validateFrontendSourceDomains(receipt.sources)
  verifyBuildSource(receipt.sources, expectedSha)
  validateFrontendBuildContext(receipt.build)
}
