import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(root, 'src')
const excludedPrefixes = ['src/api/generated/', 'src/i18n/catalog/']
const excludedDocumentDirectories = new Set([
  '.git',
  '.github',
  '.local-tests',
  'coverage',
  'dist',
  'node_modules',
])
const documentLimits = new Map([
  ['ARCHITECTURE.md', 160],
  ['README.md', 120],
])
const limits = {
  composable: 500,
  viewOrStyle: 700,
}

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDocumentDirectories.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(path))
    }
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      files.push(path)
    }
  }
  return files
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(path))
    }
    else if (entry.isFile()) {
      files.push(path)
    }
  }
  return files
}

function normalizedRelative(path) {
  return relative(root, path).replaceAll('\\', '/')
}

function isExcluded(path) {
  const relativePath = normalizedRelative(path)
  return excludedPrefixes.some(prefix => relativePath.startsWith(prefix))
}

function lineCount(content) {
  if (!content) return 0
  const lines = content.split(/\r\n|\r|\n/)
  if (lines.at(-1) === '') lines.pop()
  return lines.length
}

function sourceLimit(path) {
  const extension = extname(path)
  const fileName = path.split(/[\\/]/).at(-1) ?? ''
  if (extension === '.vue' || extension === '.scss') return limits.viewOrStyle
  if (extension === '.ts' && /^use.+\.ts$/u.test(fileName)) return limits.composable
  return undefined
}

const files = await collectFiles(sourceRoot)
const violations = []
let scanned = 0

for (const path of files.sort()) {
  if (isExcluded(path)) continue
  const limit = sourceLimit(path)
  if (!limit) continue
  scanned += 1
  const lines = lineCount(await readFile(path, 'utf8'))
  if (lines > limit) violations.push({ limit, lines, path: normalizedRelative(path) })
}

const documentFiles = await collectMarkdownFiles(root)
const documentNames = documentFiles.map(normalizedRelative).sort()
const expectedDocumentNames = [...documentLimits.keys()].sort()
if (JSON.stringify(documentNames) !== JSON.stringify(expectedDocumentNames)) {
  violations.push({
    limit: expectedDocumentNames.join('、'),
    lines: documentNames.join('、') || '无',
    path: '人工文档清单',
  })
}

for (const [path, limit] of documentLimits) {
  const lines = lineCount(await readFile(join(root, path), 'utf8'))
  if (lines > limit) violations.push({ limit, lines, path })
}

if (violations.length > 0) {
  console.error('源码规模检查失败：')
  for (const violation of violations) {
    if (violation.path === '人工文档清单') {
      console.error(`  人工文档应仅为 ${violation.limit}，当前为 ${violation.lines}`)
    }
    else {
      console.error(`  ${violation.lines} 行（上限 ${violation.limit}） ${violation.path}`)
    }
  }
  process.exitCode = 1
}
else {
  console.log(`源码规模检查通过（扫描 ${scanned} 个 Composable、Vue SFC 与 SCSS 文件）。`)
}
