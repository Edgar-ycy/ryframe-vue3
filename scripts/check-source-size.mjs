import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  allowedDocumentNames,
  documentLimits,
  lineCount,
  scriptLimit,
  sourceLimit,
  sourceSizeAssessment,
  sourceSizeViolation,
} from './source-size-contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const excludedRepositoryDirectories = new Set([
  '.git',
  '.github',
  '.local-tests',
  'coverage',
  'dist',
  'node_modules',
  'openapi',
])
async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && excludedRepositoryDirectories.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(path)))
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      files.push(path)
    }
  }
  return files
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && excludedRepositoryDirectories.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }
  return files
}

function normalizedRelative(path) {
  return relative(root, path).replaceAll('\\', '/')
}

const repositoryFiles = await collectFiles(root)
const violations = []
const advisories = []
let scannedSourceFiles = 0
let scannedScriptFiles = 0

for (const path of repositoryFiles.sort()) {
  const relativePath = normalizedRelative(path)
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

const documentFiles = await collectMarkdownFiles(root)
const documentNames = documentFiles.map(normalizedRelative).sort()
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
  console.warn(`源码规模${label}：${advisory.lines}/${advisory.limit} 行 ${advisory.path}`)
}

if (violations.length > 0) {
  console.error('源码规模检查失败：')
  for (const violation of violations) {
    if (violation.path === '人工文档清单') {
      console.error(`  人工文档应仅为 ${violation.limit}，当前为 ${violation.lines}`)
    } else {
      console.error(`  ${violation.lines} 行（上限 ${violation.limit}） ${violation.path}`)
    }
  }
  process.exitCode = 1
} else {
  console.log(
    `源码规模检查通过（扫描 ${scannedSourceFiles} 个手写 TS、Vue SFC 与样式文件，` +
      `${scannedScriptFiles} 个脚本模块）。`,
  )
}
