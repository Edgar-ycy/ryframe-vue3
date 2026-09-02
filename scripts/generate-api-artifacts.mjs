import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  buildApiArtifacts,
  generatedArtifactPaths,
  ownershipManifestPath,
} from './api-artifacts.mjs'

const mode = process.argv[2] ?? '--write'
if (!new Set(['--write', '--check']).has(mode) || process.argv.length > 3) {
  throw new Error('用法：generate-api-artifacts.mjs [--write|--check]')
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

function requireOwnedPath(relative) {
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

async function writeArtifacts(outputRoot, artifacts) {
  for (const [relative, content] of artifacts) {
    requireOwnedPath(relative)
    const output = path.join(outputRoot, relative)
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, content, 'utf8')
  }
}

async function readPreviousOwnership() {
  try {
    const manifest = JSON.parse(await readFile(path.join(root, ownershipManifestPath), 'utf8'))
    if (manifest?.version !== 1 || !Array.isArray(manifest.files)) {
      throw new Error('OpenAPI ownership manifest 必须是 version=1 且包含 files 数组')
    }
    return new Set([...manifest.files.map(requireOwnedPath), ...legacyArtifactPaths])
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    return new Set([...legacyArtifactPaths, ...generatedArtifactPaths])
  }
}

async function existingFile(relative) {
  try {
    return await readFile(path.join(root, relative))
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

async function validateStaging(stagingRoot, artifacts) {
  const actual = new Set(artifacts.keys())
  for (const relative of generatedArtifactPaths) {
    if (!actual.has(relative)) throw new Error(`生成器遗漏正式资产：${relative}`)
    await readFile(path.join(stagingRoot, relative))
  }
  for (const relative of actual) {
    if (!generatedSet.has(relative)) throw new Error(`生成器输出未登记资产：${relative}`)
  }
}

async function checkArtifacts(stagingRoot, artifacts, previousOwnership) {
  const stale = []
  for (const [relative] of artifacts) {
    const committed = await existingFile(relative)
    const generated = await readFile(path.join(stagingRoot, relative))
    if (!committed?.equals(generated)) stale.push(relative)
  }
  for (const relative of previousOwnership) {
    if (!generatedSet.has(relative) && (await existingFile(relative))) stale.push(relative)
  }
  if (stale.length > 0) {
    throw new Error(
      `以下 OpenAPI 派生文件不是最新版本：\n  - ${stale.sort().join('\n  - ')}\n请运行 corepack pnpm api:generate`,
    )
  }
}

async function installArtifacts(stagingRoot, previousOwnership) {
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

async function sourceFiles(directory) {
  const files = []
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

const artifacts = await buildApiArtifacts(root)
const stagingParent = path.join(root, 'target')
await mkdir(stagingParent, { recursive: true })
const stagingRoot = await mkdtemp(path.join(stagingParent, 'api-artifacts-'))
try {
  await writeArtifacts(stagingRoot, artifacts)
  await validateStaging(stagingRoot, artifacts)
  await assertUnifiedSchemaImports()
  const previousOwnership = await readPreviousOwnership()
  if (mode === '--check') {
    await checkArtifacts(stagingRoot, artifacts, previousOwnership)
    console.log(`OpenAPI 派生文件只读校验通过（${artifacts.size} 个文件）`)
  } else {
    await installArtifacts(stagingRoot, previousOwnership)
    console.log(`已原子安装 OpenAPI 派生文件（${artifacts.size} 个文件）`)
  }
} finally {
  await rm(stagingRoot, { recursive: true, force: true })
}
