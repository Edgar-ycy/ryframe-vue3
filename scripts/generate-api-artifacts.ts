import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createTemporaryDirectory } from './temporary-directory.ts'

import {
  buildApiArtifacts,
  generatedArtifactPaths,
  ownershipManifestPath,
} from './api-artifacts.ts'

class TaskUsageError extends Error {}

type Artifacts = ReadonlyMap<string, string>

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : undefined
}

const root = fileURLToPath(new URL('../', import.meta.url))
const legacyArtifactPaths = Object.freeze([
  'src/api/generated/operations.ts',
  'src/api/generated/schema.ts',
])
const generatedSet = new Set(generatedArtifactPaths)
const sharedGeneratedPaths = new Set([
  'src/shared/security/passwordPolicy.generated.json',
  'src/shared/markdown/noticePolicy.generated.json',
  'src/shared/config/apiPrefix.generated.json',
])

function requireOwnedPath(relative: unknown): string {
  if (
    typeof relative !== 'string' ||
    relative.length === 0 ||
    relative.includes('\\') ||
    path.posix.isAbsolute(relative) ||
    relative.split('/').includes('..') ||
    (!relative.startsWith('src/api/generated/') && !sharedGeneratedPaths.has(relative))
  ) {
    throw new Error(`OpenAPI ownership manifest 包含非法路径：${String(relative)}`)
  }
  return relative
}

async function writeArtifacts(outputRoot: string, artifacts: Artifacts) {
  for (const [relative, content] of artifacts) {
    requireOwnedPath(relative)
    const output = path.join(outputRoot, relative)
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, content, 'utf8')
  }
}

async function readPreviousOwnership() {
  try {
    const manifest: unknown = JSON.parse(
      await readFile(path.join(root, ownershipManifestPath), 'utf8'),
    )
    if (
      typeof manifest !== 'object' ||
      manifest === null ||
      !('version' in manifest) ||
      manifest.version !== 1 ||
      !('files' in manifest) ||
      !Array.isArray(manifest.files)
    ) {
      throw new Error('OpenAPI ownership manifest 必须是 version=1 且包含 files 数组')
    }
    return new Set([...manifest.files.map(requireOwnedPath), ...legacyArtifactPaths])
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') throw error
    return new Set([...legacyArtifactPaths, ...generatedArtifactPaths])
  }
}

async function existingFile(relative: string) {
  try {
    return await readFile(path.join(root, relative))
  } catch (error) {
    const code = errorCode(error)
    if (code === 'ENOENT') return undefined
    const reason =
      code === 'EISDIR'
        ? '路径是目录，不能作为受管文件读取'
        : code === 'EACCES' || code === 'EPERM'
          ? '没有读取受管文件的权限'
          : '读取受管文件失败'
    throw new Error(
      `读取受管文件 ${relative} 失败：IO ${code ?? 'UNKNOWN'}；${reason}；` +
        '请检查文件类型和读取权限；保留未知目录及文件现场，确认后再处理',
      { cause: error },
    )
  }
}

function validateArtifacts(artifacts: Artifacts) {
  const actual = new Set(artifacts.keys())
  for (const relative of generatedArtifactPaths) {
    if (!actual.has(relative)) throw new Error(`生成器遗漏正式资产：${relative}`)
  }
  for (const [relative, content] of artifacts) {
    requireOwnedPath(relative)
    if (!generatedSet.has(relative)) throw new Error(`生成器输出未登记资产：${relative}`)
    if (typeof content !== 'string') throw new Error(`生成器输出不是 UTF-8 文本：${relative}`)
  }
}

async function validateStaging(stagingRoot: string, artifacts: Artifacts) {
  for (const [relative, content] of artifacts) {
    const staged = await readFile(path.join(stagingRoot, relative))
    if (!staged.equals(Buffer.from(content, 'utf8'))) {
      throw new Error(`OpenAPI 暂存内容与本次生成结果不一致：${relative}`)
    }
  }
}

async function checkArtifacts(artifacts: Artifacts, previousOwnership: ReadonlySet<string>) {
  const stale = []
  for (const [relative, content] of artifacts) {
    const committed = await existingFile(relative)
    if (!committed?.equals(Buffer.from(content, 'utf8'))) stale.push(relative)
  }
  for (const relative of previousOwnership) {
    if (!generatedSet.has(relative) && (await existingFile(relative))) stale.push(relative)
  }
  if (stale.length > 0) {
    throw new Error(
      `以下 OpenAPI 派生文件不是最新版本：\n  - ${stale.sort().join('\n  - ')}\n请运行 corepack pnpm generate --write`,
    )
  }
}

async function installArtifacts(stagingRoot: string, previousOwnership: ReadonlySet<string>) {
  const backupRoot = path.join(stagingRoot, '.rollback')
  const installed = []
  const backedUp = []
  const affected = new Set([...previousOwnership, ...generatedArtifactPaths])
  try {
    for (const relative of affected) {
      const output = path.join(root, relative)
      if (!(await existingFile(relative))) continue
      const backup = path.join(backupRoot, relative)
      await mkdir(path.dirname(backup), { recursive: true })
      await rename(output, backup)
      backedUp.push(relative)
    }
    for (const relative of generatedArtifactPaths) {
      const staged = path.join(stagingRoot, relative)
      const output = path.join(root, relative)
      await mkdir(path.dirname(output), { recursive: true })
      await rename(staged, output)
      installed.push(relative)
    }
  } catch (error) {
    for (const relative of installed.reverse()) {
      await rm(path.join(root, relative), { force: true })
    }
    for (const relative of backedUp.reverse()) {
      const backup = path.join(backupRoot, relative)
      const output = path.join(root, relative)
      await mkdir(path.dirname(output), { recursive: true })
      await rename(backup, output)
    }
    throw error
  }
}

async function sourceFiles(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await sourceFiles(target)))
    else if (/\.(?:ts|vue)$/u.test(entry.name)) files.push(target)
  }
  return files
}

async function assertUnifiedSchemaImports() {
  const sourceRoot = path.join(root, 'src')
  const violations = []
  for (const file of await sourceFiles(sourceRoot)) {
    const relative = path.relative(root, file).replaceAll('\\', '/')
    if (relative === 'src/api/contract.ts' || relative.startsWith('src/api/generated/schema/')) {
      continue
    }
    const source = await readFile(file, 'utf8')
    if (source.includes('generated/schema')) violations.push(relative)
  }
  if (violations.length > 0) {
    throw new Error(
      `业务代码只能通过 src/api/contract.ts 使用 OpenAPI 类型：\n  - ${violations.join('\n  - ')}`,
    )
  }
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] ?? '--check'
  if (args.length > 1 || !['--write', '--check'].includes(mode)) {
    throw new TaskUsageError('用法：generate-api-artifacts.ts [--check|--write]，默认只读检查')
  }

  const artifacts = await buildApiArtifacts(root)
  validateArtifacts(artifacts)
  await assertUnifiedSchemaImports()
  const previousOwnership = await readPreviousOwnership()
  if (mode === '--check') {
    await checkArtifacts(artifacts, previousOwnership)
    console.log(`OpenAPI 派生文件只读校验通过（${artifacts.size} 个文件）`)
    return
  }

  const stagingParent = path.join(root, 'target')
  await mkdir(stagingParent, { recursive: true })
  const stagingRoot = await createTemporaryDirectory(path.join(stagingParent, 'api-artifacts-'))
  try {
    await writeArtifacts(stagingRoot, artifacts)
    await validateStaging(stagingRoot, artifacts)
    await installArtifacts(stagingRoot, previousOwnership)
    console.log(`已原子安装 OpenAPI 派生文件（${artifacts.size} 个文件）`)
  } finally {
    await rm(stagingRoot, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = error instanceof TaskUsageError ? 2 : 1
})
