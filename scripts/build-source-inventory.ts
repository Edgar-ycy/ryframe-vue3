import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync, type Stats } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'

export type InventoryFile = {
  path: string
  sha256: string
}

type SourceSnapshot = {
  head: string
  patch_sha256: string
  files: InventoryFile[]
  clean: boolean
}

type SourceGuard = {
  head: string
  index_sha256: string
  modes_sha256: string
}

export type SourceInventory = {
  source: {
    snapshot: SourceSnapshot
    worktree_fingerprint: string
  }
  files: InventoryFile[]
  guard: SourceGuard
}

type SourceFileOptions = {
  allowMissing?: boolean
}

export const sha256 = (bytes: string | NodeJS.ArrayBufferView): string =>
  createHash('sha256').update(bytes).digest('hex')

export const hex = (value: unknown, size: number): value is string =>
  typeof value === 'string' && new RegExp(`^[a-f0-9]{${size}}$`, 'u').test(value)

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  }
  return value
}

export const canonicalDigest = (value: unknown): string => sha256(JSON.stringify(canonical(value)))
export const compareSourcePaths = (left: string, right: string): number =>
  Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'))
const git = (root: string, ...args: string[]) =>
  execFileSync('git', ['-C', root, ...args], { windowsHide: true })

export function exactObject<Key extends string>(
  value: unknown,
  fields: readonly Key[],
  message: string,
): asserts value is Record<Key, unknown> {
  if (!isRecord(value) || Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0'))
    throw new Error(message)
}

function validRelative(relative: unknown): relative is string {
  return (
    typeof relative === 'string' &&
    Boolean(relative) &&
    !relative.startsWith('/') &&
    !relative.includes('\\') &&
    !path.win32.isAbsolute(relative) &&
    relative.split('/').every((part) => part && part !== '.' && part !== '..')
  )
}

export function localSourceFile(
  root: string,
  relative: unknown,
  message: string,
  options?: { allowMissing?: false },
): string
export function localSourceFile(
  root: string,
  relative: unknown,
  message: string,
  options: SourceFileOptions,
): string | null
export function localSourceFile(
  root: string,
  relative: unknown,
  message: string,
  { allowMissing = false }: SourceFileOptions = {},
): string | null {
  if (!validRelative(relative)) throw new Error(message)
  let cursor = root
  let observed: Stats | undefined
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part)
    try {
      observed = lstatSync(cursor)
    } catch (error) {
      if (allowMissing && isRecord(error) && error.code === 'ENOENT') return null
      throw new Error(message, { cause: error })
    }
    if (observed.isSymbolicLink()) throw new Error(message)
  }
  const file = path.resolve(root, ...relative.split('/'))
  const resolvedRoot = realpathSync(root)
  const resolved = realpathSync(file)
  const normalizedRoot = process.platform === 'win32' ? resolvedRoot.toLowerCase() : resolvedRoot
  const normalized = process.platform === 'win32' ? resolved.toLowerCase() : resolved
  if (!normalized.startsWith(normalizedRoot + path.sep) || !observed?.isFile()) {
    throw new Error(message)
  }
  return file
}

function untracked(root: string): string[] {
  return git(root, 'ls-files', '--others', '--exclude-standard', '-z')
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
}

export function sourceSnapshot(root: string): SourceSnapshot {
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

function worktreeFingerprint(root: string, commit: string): string {
  const digest = createHash('sha256')
  const update = (value: Buffer | string) => {
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

function fileInventory(root: string): SourceGuard & { files: InventoryFile[] } {
  const paths = [
    ...new Set(
      git(root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z')
        .toString('utf8')
        .split('\0')
        .filter(Boolean),
    ),
  ].sort(compareSourcePaths)
  const files: InventoryFile[] = []
  const modes: { path: string; executable: number }[] = []
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

export function captureSourceInventory(root: string): SourceInventory {
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

export function validateFiles(
  value: unknown,
  fields: readonly string[],
  message: string,
): asserts value is InventoryFile[] {
  if (!Array.isArray(value)) throw new Error(message)
  let previous = ''
  const items: readonly unknown[] = value
  for (const item of items) {
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

export function validateSourceInventory(value: unknown): SourceInventory {
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
    // 沿用历史收据正则的 JavaScript 字符串转换语义。
    !/^sha256:[a-f0-9]{64}$/u.test(value.source.worktree_fingerprint as string) ||
    value.guard.head !== snapshot.head ||
    !hex(value.guard.index_sha256, 64) ||
    !hex(value.guard.modes_sha256, 64)
  )
    throw new Error('完整来源 Git 内容无效')
  validateFiles(snapshot.files, ['path', 'sha256'], '未跟踪来源文件无效')
  validateFiles(value.files, ['path', 'sha256'], '完整来源文件无效')
  return value as SourceInventory
}
