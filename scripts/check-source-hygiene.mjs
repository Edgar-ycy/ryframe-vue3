import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const excludedDirectories = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
])
const textExtensions = new Set([
  '.css',
  '.html',
  '.json',
  '.md',
  '.mjs',
  '.scss',
  '.ts',
  '.vue',
  '.yaml',
  '.yml',
])
const textNames = new Set(['.editorconfig', '.gitattributes', '.gitignore'])
const mojibakeMarkers = ['\uFFFD', '\u951B', '\u9286', '\u922B']
const legacyApiTerms = ['pageSize', 'pageNum', 'searchValue', 'requestId']
const legacyActionPaths = ['assign-perm', 'assign-dept', 'update-data-scope', 'assign-role']
const legacyBootstrapCredentials = ['admin123']
const decoder = new TextDecoder('utf-8', { fatal: true })

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (excludedDirectories.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath))
    else if (entry.isFile()) files.push(fullPath)
  }

  return files
}

function isTextSource(file) {
  return textExtensions.has(path.extname(file).toLowerCase()) || textNames.has(path.basename(file))
}

const errors = []
const files = (await collectFiles(root)).filter(isTextSource).sort()

for (const file of files) {
  const relative = path.relative(root, file).split(path.sep).join('/')
  const data = await readFile(file)
  let text

  try {
    text = decoder.decode(data)
  }
  catch (error) {
    errors.push(`${relative}: invalid UTF-8 (${error.message})`)
    continue
  }

  if (text.includes('\0')) errors.push(`${relative}: contains a NUL byte`)
  if (mojibakeMarkers.some(marker => text.includes(marker))) {
    errors.push(`${relative}: contains replacement or mojibake characters`)
  }
  if (/[\uE000-\uF8FF]/u.test(text)) {
    errors.push(`${relative}: contains a Unicode private-use character`)
  }
  if (data.length > 1_000 && text.split('\n').length < 3) {
    errors.push(`${relative}: suspiciously collapsed into fewer than three lines`)
  }
  if (relative.endsWith('.vue')) {
    for (const match of text.matchAll(/<el-pagination\b[^>]*>/gu)) {
      if (/\ssmall(?:\s|\/?>)/u.test(match[0])) {
        errors.push(`${relative}: uses deprecated el-pagination small prop; use size="small"`)
      }
    }
    if (/<el-col\b[^>]*\s:span=/u.test(text)) {
      errors.push(`${relative}: fixed el-col spans must declare responsive breakpoints`)
    }
  }
  if (relative.startsWith('src/')) {
    for (const term of legacyApiTerms) {
      if (text.includes(term)) errors.push(`${relative}: contains legacy API term ${term}`)
    }
    for (const route of legacyActionPaths) {
      if (text.includes(route)) errors.push(`${relative}: contains legacy action path ${route}`)
    }
    for (const credential of legacyBootstrapCredentials) {
      if (text.includes(credential)) {
        errors.push(`${relative}: contains legacy bootstrap credential ${credential}`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Source hygiene check failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exitCode = 1
}
else {
  console.log(`Source hygiene check passed (${files.length} files)`)
}
