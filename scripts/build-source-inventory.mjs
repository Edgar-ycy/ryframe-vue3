import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

export const hex = (value, size) =>
  typeof value === 'string' && new RegExp(`^[a-f0-9]{${size}}$`, 'u').test(value)

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  }
  return value
}

export const canonicalDigest = (value) => sha256(JSON.stringify(canonical(value)))
export const compareSourcePaths = (left, right) =>
  Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'))
const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { windowsHide: true })

export function exactObject(value, fields, message) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')
  )
    throw new Error(message)
}

function validRelative(relative) {
  return (
    typeof relative === 'string' &&
    Boolean(relative) &&
    !relative.startsWith('/') &&
    !relative.includes('\\') &&
    !path.win32.isAbsolute(relative) &&
    relative.split('/').every((part) => part && part !== '.' && part !== '..')
  )
}

export function localSourceFile(root, relative, message, { allowMissing = false } = {}) {
  if (!validRelative(relative)) throw new Error(message)
  let cursor = root
  let observed
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part)
    try {
      observed = lstatSync(cursor)
    } catch (error) {
      if (allowMissing && error?.code === 'ENOENT') return null
      throw new Error(message, { cause: error })
    }
    if (observed.isSymbolicLink()) throw new Error(message)
  }
  const file = path.resolve(root, ...relative.split('/'))
  const resolvedRoot = realpathSync(root)
  const resolved = realpathSync(file)
  const normalizedRoot = process.platform === 'win32' ? resolvedRoot.toLowerCase() : resolvedRoot
  const normalized = process.platform === 'win32' ? resolved.toLowerCase() : resolved
  if (!normalized.startsWith(normalizedRoot + path.sep) || !observed.isFile()) {
    throw new Error(message)
  }
  return file
}

function untracked(root) {
  return git(root, 'ls-files', '--others', '--exclude-standard', '-z')
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
}

export function sourceSnapshot(root) {
  if (
    realpathSync(git(root, 'rev-parse', '--show-toplevel').toString().trim()) !== realpathSync(root)
  )
    throw new Error('恢复构建必须使用实际 Git 仓库根目录')
  const files = [...untracked(root)].sort(compareSourcePaths).map((relative) => ({
    path: relative,
    sha256: sha256(
      readFileSync(localSourceFile(root, relative, '源码快照包含越界路径或非普通文件')),
    ),
  }))
  return {
    head: git(root, 'rev-parse', 'HEAD').toString().trim(),
    patch_sha256: sha256(git(root, 'diff', '--binary', 'HEAD')),
    files,
    clean: git(root, 'status', '--porcelain', '--untracked-files=all').length === 0,
  }
}

function worktreeFingerprint(root, commit) {
  const digest = createHash('sha256')
  const update = (value) => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value)
    const size = Buffer.alloc(8)
    size.writeBigUInt64LE(BigInt(bytes.length))
    digest.update(size).update(bytes)
  }
  update(commit)
  update(git(root, 'diff', '--binary', '--no-ext-diff', 'HEAD', '--', '.'))
  for (const relative of untracked(root)) {
    update(relative)
    update(readFileSync(localSourceFile(root, relative, '源码包含越界的未跟踪路径')))
  }
  return 'sha256:' + digest.digest('hex')
}

function fileInventory(root) {
  const paths = [
    ...new Set(
      git(root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z')
        .toString('utf8')
        .split('\0')
        .filter(Boolean),
    ),
  ].sort(compareSourcePaths)
  const files = []
  const modes = []
  for (const relative of paths) {
    const file = localSourceFile(root, relative, '源码清单包含链接、越界路径或非普通文件', {
      allowMissing: true,
    })
    if (!file) continue
    files.push({ path: relative, sha256: sha256(readFileSync(file)) })
    modes.push({ path: relative, executable: lstatSync(file).mode & 0o111 })
  }
  return {
    files,
    head: git(root, 'rev-parse', 'HEAD').toString().trim(),
    index_sha256: sha256(git(root, 'ls-files', '--stage', '-z')),
    modes_sha256: canonicalDigest(modes),
  }
}

export function captureSourceInventory(root) {
  const before = sourceSnapshot(root)
  const fingerprint = worktreeFingerprint(root, before.head)
  const guard = fileInventory(root)
  if (
    !isDeepStrictEqual(sourceSnapshot(root), before) ||
    worktreeFingerprint(root, before.head) !== fingerprint ||
    guard.head !== before.head
  )
    throw new Error('采集指纹期间完整源码发生变化')
  return {
    source: { snapshot: before, worktree_fingerprint: fingerprint },
    files: guard.files,
    guard: {
      head: guard.head,
      index_sha256: guard.index_sha256,
      modes_sha256: guard.modes_sha256,
    },
  }
}

function frontendProduct(relative) {
  const first = relative.split('/')[0]
  if (['src', 'public', 'openapi'].includes(first)) return true
  if (
    [
      '.env',
      '.node-version',
      'index.html',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'vite.config.ts',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.base.json',
      'tsconfig.test.json',
    ].includes(relative)
  )
    return true
  if (
    ['scripts', 'tests', '.github'].includes(first) ||
    [
      'eslint.config.js',
      'playwright.config.ts',
      'playwright.real.config.ts',
      'prettier.config.mjs',
      'stylelint.config.js',
      'vitest.config.ts',
      '.editorconfig',
      '.gitattributes',
      '.gitignore',
      '.prettierignore',
      '.env.production.example',
      'ARCHITECTURE.md',
      'CHANGELOG.md',
      'LICENSE',
      'README.md',
    ].includes(relative)
  )
    return false
  return true
}

function frontendTool(relative) {
  const first = relative.split('/')[0]
  return (
    ['scripts', 'tests', '.github'].includes(first) ||
    [
      'eslint.config.js',
      'playwright.config.ts',
      'playwright.real.config.ts',
      'prettier.config.mjs',
      'stylelint.config.js',
      'vitest.config.ts',
    ].includes(relative)
  )
}

function sourceGroup(files, selected) {
  const byPath = new Map(files.map((item) => [item.path, item]))
  const values = selected.map((relative) => byPath.get(relative))
  return { sha256: canonicalDigest(values), files: selected }
}

export function sourceDomains(inventory) {
  validateSourceInventory(inventory)
  const product = inventory.files
    .filter((item) => frontendProduct(item.path))
    .map((item) => item.path)
  const tools = inventory.files.filter((item) => frontendTool(item.path)).map((item) => item.path)
  return {
    product: { frontend: sourceGroup(inventory.files, product) },
    tools: sourceGroup(inventory.files, tools),
    full: structuredClone(inventory),
  }
}

export function validateFiles(value, fields, message) {
  if (!Array.isArray(value)) throw new Error(message)
  let previous = ''
  for (const item of value) {
    exactObject(item, fields, message)
    if (
      !validRelative(item.path) ||
      (previous && compareSourcePaths(item.path, previous) <= 0) ||
      !hex(item.sha256, 64)
    ) {
      throw new Error(message)
    }
    previous = item.path
  }
}

export function validateSourceInventory(value) {
  exactObject(value, ['source', 'files', 'guard'], '完整来源清单字段无效')
  exactObject(value.source, ['snapshot', 'worktree_fingerprint'], '完整来源快照字段无效')
  exactObject(
    value.source.snapshot,
    ['head', 'patch_sha256', 'files', 'clean'],
    '完整来源 Git 快照字段无效',
  )
  exactObject(value.guard, ['head', 'index_sha256', 'modes_sha256'], '完整来源 guard 无效')
  const snapshot = value.source.snapshot
  if (
    !hex(snapshot.head, 40) ||
    !hex(snapshot.patch_sha256, 64) ||
    typeof snapshot.clean !== 'boolean' ||
    !/^sha256:[a-f0-9]{64}$/u.test(value.source.worktree_fingerprint) ||
    value.guard.head !== snapshot.head ||
    !hex(value.guard.index_sha256, 64) ||
    !hex(value.guard.modes_sha256, 64)
  )
    throw new Error('完整来源 Git 内容无效')
  validateFiles(snapshot.files, ['path', 'sha256'], '未跟踪来源文件无效')
  validateFiles(value.files, ['path', 'sha256'], '完整来源文件无效')
  return value
}

export function validateSourceDomains(value) {
  exactObject(value, ['product', 'tools', 'full'], '构建来源分域字段无效')
  exactObject(value.product, ['frontend'], '前端产品来源角色无效')
  if (!isDeepStrictEqual(value, sourceDomains(validateSourceInventory(value.full)))) {
    throw new Error('构建来源分域与完整来源清单不一致')
  }
  return value
}
