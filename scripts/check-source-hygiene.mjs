import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { collectComments } from './source-hygiene-comments.mjs'

const root = process.cwd()
const excludedDirectories = new Set([
  '.git',
  '.idea',
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
const legacyApiTermAllowlist = new Map([
  [
    'requestId',
    new Set([
      // HTTP 内部使用驼峰属性承载服务端 request_id，不属于公开 API 兼容字段。
      'src/shared/http/client.ts',
      'src/shared/http/client.test.ts',
    ]),
  ],
])
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

function isRequiredCommentDirective(line) {
  return /^=+$/u.test(line)
    || /^(?:\/?\s*<reference\b|@(?:type|ts-(?:ignore|nocheck|expect-error)|vite-ignore|vitest-environment)\b|(?:eslint|prettier|stylelint|biome|noinspection|istanbul|c8|v8|vitest|coverage)(?:[-:\s]|$)|SPDX-License-Identifier:|Copyright\b)/iu.test(line)
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
      const allowed = legacyApiTermAllowlist.get(term)?.has(relative) === true
      if (!allowed && text.includes(term)) {
        errors.push(`${relative}: contains legacy API term ${term}`)
      }
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
