import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, posix, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const sourceLimits = Object.freeze({
  composable: 300,
  script: 500,
  style: 300,
  test: 300,
  typescript: 300,
  vue: 400,
})

export const documentLimits = Object.freeze({
  'ARCHITECTURE.md': 160,
  'README.md': 120,
})

export const historicalDocuments = Object.freeze(['CHANGELOG.md'])

export function allowedDocumentNames() {
  return [...Object.keys(documentLimits), ...historicalDocuments].sort()
}

const generatedPrefixes = ['src/api/generated/', 'src/generated/']
const typescriptExtensions = new Set(['.cts', '.mts', '.ts', '.tsx'])

export function normalizeRepositoryPath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '')
}

export function lineCount(content) {
  if (!content) return 0
  const lines = content.split(/\r\n|\r|\n/u)
  if (lines.at(-1) === '') lines.pop()
  return lines.length
}

export function sourceLimit(path) {
  const normalized = normalizeRepositoryPath(path)
  if (generatedPrefixes.some((prefix) => normalized.startsWith(prefix))) return undefined
  if (/\.d\.[cm]?tsx?$/u.test(normalized)) return undefined

  const extension = extname(normalized).toLowerCase()
  const fileName = posix.basename(normalized)
  if (normalized.startsWith('tests/') && typescriptExtensions.has(extension)) {
    return sourceLimits.test
  }
  if (!normalized.startsWith('src/')) {
    return typescriptExtensions.has(extension) ? sourceLimits.typescript : undefined
  }
  if (extension === '.vue') return sourceLimits.vue
  if (extension === '.css' || extension === '.scss') return sourceLimits.style
  if (!typescriptExtensions.has(extension)) return undefined
  if (/^use.+\.[cm]?tsx?$/u.test(fileName) || normalized.includes('/composables/')) {
    return sourceLimits.composable
  }
  return sourceLimits.typescript
}

export function scriptLimit(path) {
  return extname(normalizeRepositoryPath(path)).toLowerCase() === '.mjs'
    ? sourceLimits.script
    : undefined
}

export function sourceSizeViolation(path, content, limit = sourceLimit(path)) {
  const assessment = sourceSizeAssessment(path, content, limit)
  return assessment?.severity === 'error' ? assessment : undefined
}

export function sourceSizeAssessment(path, content, limit = sourceLimit(path)) {
  if (limit === undefined) return undefined
  const lines = lineCount(content)
  const ratio = lines / limit
  const severity =
    ratio >= 1 ? 'error' : ratio >= 0.9 ? 'warning' : ratio >= 0.8 ? 'notice' : undefined
  return severity ? { limit, lines, path: normalizeRepositoryPath(path), severity } : undefined
}

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const excludedRepositoryDirectories = new Set([
  '.git',
  '.github',
  '.local-tests',
  'coverage',
  'dist',
  'node_modules',
  'openapi',
])

async function collectRepositoryFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && excludedRepositoryDirectories.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectRepositoryFiles(path)))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

function repositoryRelative(root, path) {
  return relative(root, path).replaceAll('\\', '/')
}

/** 扫描仓库源码、维护脚本和人工文档，并输出统一规模诊断。 */
export async function runSourceSizeCheck(root = defaultRoot, output = console) {
  const repositoryFiles = await collectRepositoryFiles(root)
  const violations = []
  const advisories = []
  let scannedSourceFiles = 0
  let scannedScriptFiles = 0

  for (const path of repositoryFiles.sort()) {
    const relativePath = repositoryRelative(root, path)
    const limit = sourceLimit(relativePath)
    const maintenanceLimit = scriptLimit(relativePath)
    const effectiveLimit = limit ?? maintenanceLimit
    if (!effectiveLimit) continue
    if (limit) scannedSourceFiles += 1
    else scannedScriptFiles += 1
    const content = await readFile(path, 'utf8')
    const violation = sourceSizeViolation(relativePath, content, effectiveLimit)
    if (violation) violations.push(violation)
    else {
      const assessment = sourceSizeAssessment(relativePath, content, effectiveLimit)
      if (assessment) advisories.push(assessment)
    }
  }

  const documentNames = repositoryFiles
    .filter((path) => extname(path).toLowerCase() === '.md')
    .map((path) => repositoryRelative(root, path))
    .sort()
  const expectedDocumentNames = allowedDocumentNames()
  if (JSON.stringify(documentNames) !== JSON.stringify(expectedDocumentNames)) {
    violations.push({
      limit: expectedDocumentNames.join('、'),
      lines: documentNames.join('、') || '无',
      path: '人工文档清单',
    })
  }

  for (const [path, limit] of Object.entries(documentLimits)) {
    const lines = lineCount(await readFile(join(root, path), 'utf8'))
    if (lines > limit) violations.push({ limit, lines, path })
  }

  for (const advisory of advisories) {
    const label = advisory.severity === 'warning' ? '强警告' : '提示'
    output.warn(`源码规模${label}：${advisory.lines}/${advisory.limit} 行 ${advisory.path}`)
  }

  if (violations.length > 0) {
    output.error('源码规模检查失败：')
    for (const violation of violations) {
      if (violation.path === '人工文档清单') {
        output.error(`  人工文档应仅为 ${violation.limit}，当前为 ${violation.lines}`)
      } else {
        output.error(`  ${violation.lines} 行（上限 ${violation.limit}） ${violation.path}`)
      }
    }
    return false
  }

  output.log(
    `源码规模检查通过（扫描 ${scannedSourceFiles} 个手写 TS、Vue SFC 与样式文件，` +
      `${scannedScriptFiles} 个脚本模块）。`,
  )
  return true
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (isMain && !(await runSourceSizeCheck())) process.exitCode = 1
