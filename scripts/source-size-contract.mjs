import { extname, posix } from 'node:path'

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
