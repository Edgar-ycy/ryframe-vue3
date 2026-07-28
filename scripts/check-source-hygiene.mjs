import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const excludedDirectories = new Set([
  '.git',
  '.idea',
  '.pnpm-store',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
])
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.scss',
  '.ts',
  '.vue',
  '.yaml',
  '.yml',
])
const textNames = new Set(['.editorconfig', '.gitattributes', '.gitignore', '.node-version'])
const commentPolicyExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.mjs',
  '.scss',
  '.ts',
  '.vue',
  '.yaml',
  '.yml',
])
// OpenAPI 契约是独立后端仓库的受版本固定生成物；在契约完成同步前，不能用本地
// 生成结果覆盖其来源语言。手写源码与生成文件头仍由本门禁覆盖。
const commentPolicyExcludedPrefixes = ['src/api/generated/']
const commentPolicyExcludedNames = new Set([
  'pnpm-lock.yaml',
  'src/auto-imports.d.ts',
])
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

function isCommentPolicyTarget(relative) {
  if (!commentPolicyExtensions.has(path.extname(relative).toLowerCase())) return false
  if (commentPolicyExcludedNames.has(relative)) return false
  return !commentPolicyExcludedPrefixes.some(prefix => relative.startsWith(prefix))
}

function skipQuotedString(text, start, quote) {
  let cursor = start + 1

  while (cursor < text.length) {
    if (text[cursor] === '\\') {
      cursor += 2
      continue
    }
    if (text[cursor] === quote) return cursor + 1
    cursor += 1
  }

  return cursor
}

function lineNumberAt(text, offset) {
  return text.slice(0, offset).split('\n').length
}

function collectComments(text, extension) {
  const comments = []
  const isYaml = extension === '.yaml' || extension === '.yml'
  let cursor = 0

  while (cursor < text.length) {
    const current = text[cursor]
    const next = text[cursor + 1]

    if (current === '\'' || current === '"' || current === '`') {
      cursor = skipQuotedString(text, cursor, current)
      continue
    }

    if (current === '/' && next === '/' && text[cursor - 1] !== '\\') {
      const end = text.indexOf('\n', cursor + 2)
      comments.push({
        body: text.slice(cursor + 2, end === -1 ? text.length : end),
        line: lineNumberAt(text, cursor),
      })
      cursor = end === -1 ? text.length : end + 1
      continue
    }

    if (current === '/' && next === '*') {
      const end = text.indexOf('*/', cursor + 2)
      comments.push({
        body: text.slice(cursor + 2, end === -1 ? text.length : end),
        line: lineNumberAt(text, cursor),
      })
      cursor = end === -1 ? text.length : end + 2
      continue
    }

    if (text.startsWith('<!--', cursor)) {
      const end = text.indexOf('-->', cursor + 4)
      comments.push({
        body: text.slice(cursor + 4, end === -1 ? text.length : end),
        line: lineNumberAt(text, cursor),
      })
      cursor = end === -1 ? text.length : end + 3
      continue
    }

    if (isYaml && current === '#' && (cursor === 0 || /\s/u.test(text[cursor - 1]))) {
      const end = text.indexOf('\n', cursor + 1)
      comments.push({
        body: text.slice(cursor + 1, end === -1 ? text.length : end),
        line: lineNumberAt(text, cursor),
      })
      cursor = end === -1 ? text.length : end + 1
      continue
    }

    cursor += 1
  }

  return comments
}

function isRequiredCommentDirective(line) {
  return /^=+$/u.test(line)
    || /^(?:\/?\s*<reference\b|@(?:type|ts-(?:ignore|nocheck|expect-error)|vite-ignore)\b|(?:eslint|prettier|stylelint|biome|noinspection|istanbul|c8|v8|vitest|coverage)(?:[-:\s]|$)|SPDX-License-Identifier:|Copyright\b)/iu.test(line)
}

function checkCommentLanguage(relative, text) {
  const extension = path.extname(relative).toLowerCase()

  for (const comment of collectComments(text, extension)) {
    let inExample = false
    let inCodeBlock = false
    const lines = comment.body.split('\n')

    for (const [offset, rawLine] of lines.entries()) {
      const line = rawLine.replace(/^\s*\*?\s?/u, '').trim()
      if (!line) continue

      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock
        continue
      }
      if (/^@example(?:\s|$)/iu.test(line)) {
        inExample = true
        continue
      }
      if (/^@[A-Za-z][A-Za-z-]*/u.test(line)) inExample = false
      if (inExample || inCodeBlock || isRequiredCommentDirective(line)) continue
      if (!/[\p{Script=Han}]/u.test(line)) {
        errors.push(`${relative}:${comment.line + offset}: explanatory comments must contain Chinese text`)
      }
    }
  }
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

  if (data.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    errors.push(`${relative}: contains a UTF-8 BOM`)
  }
  if (data.includes(0x0d)) errors.push(`${relative}: must use LF line endings`)
  if (data.length > 0 && data.at(-1) !== 0x0a) {
    errors.push(`${relative}: must end with an LF`)
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
  if (isCommentPolicyTarget(relative)) checkCommentLanguage(relative, text)
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
