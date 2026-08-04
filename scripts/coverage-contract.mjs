import { access, readdir } from 'node:fs/promises'
import path from 'node:path'

const coverageInventoryRoots = [
  'src/app',
  'src/directives',
  'src/hooks',
  'src/i18n',
  'src/router',
  'src/shared/config',
  'src/shared/http',
  'src/shared/markdown',
  'src/shared/media',
  'src/shared/query',
  'src/shared/security',
  'src/shared/ui',
  'src/stores',
  'src/utils',
]

const coverageAdditionalFiles = [
  'src/api/modules/auth.ts',
  'src/api/modules/exportJob.ts',
  'src/api/modules/messages.ts',
  'src/api/modules/monitor.ts',
  'src/api/modules/tools.ts',
  'src/api/operationRequest.ts',
  'src/components/common/iconSelection.ts',
  'src/components/layout/TagsView/routeTagSync.ts',
  'src/main.ts',
  'src/views/dashboardLinks.ts',
  'src/views/login/loginState.ts',
  'src/views/reset-password/resetCredentials.ts',
  'src/views/system/menu/menuTree.ts',
  'src/views/tools/gen/generationForm.ts',
]

export function isCoverageSource(relative) {
  return relative.endsWith('.ts')
    && !relative.endsWith('.d.ts')
    && !/\.(?:test|spec)\.ts$/u.test(relative)
}

/** 收集必须进入覆盖率统计的核心业务模块，新文件进入核心目录后会自动触发清单更新。 */
export async function discoverCriticalCoverageFiles(root, serverStateFiles = []) {
  const files = new Set(coverageAdditionalFiles)
  for (const inventoryRoot of coverageInventoryRoots) {
    const directory = path.join(root, inventoryRoot)
    for (const absolute of await sourceFilesUnder(directory)) {
      const relative = path.relative(root, absolute).replaceAll(path.sep, '/')
      if (isCoverageSource(relative)) files.add(relative)
    }
  }
  for (const relative of serverStateFiles) {
    if (isCoverageSource(relative)) files.add(relative)
  }
  return [...files].sort()
}

export function validateCoverageScope(manifest, expectedFiles) {
  const errors = []
  if (!manifest || typeof manifest !== 'object' || manifest.schemaVersion !== 1) {
    errors.push('scripts/coverage-scope.json: schemaVersion must equal 1')
  }
  const files = Array.isArray(manifest?.files) ? manifest.files : []
  if (!Array.isArray(manifest?.files) || files.some(file => typeof file !== 'string')) {
    errors.push('scripts/coverage-scope.json: files must be a string array')
    return errors
  }

  const uniqueFiles = new Set(files)
  if (uniqueFiles.size !== files.length) {
    errors.push('scripts/coverage-scope.json: duplicate coverage entries are forbidden')
  }
  if (files.some(file => (
    file.includes('\\')
    || file.includes('../')
    || !file.startsWith('src/')
    || !isCoverageSource(file)
  ))) {
    errors.push('scripts/coverage-scope.json: coverage entries must be normalized production TypeScript paths')
  }
  if (files.join('\n') !== [...files].sort().join('\n')) {
    errors.push('scripts/coverage-scope.json: coverage entries must remain sorted')
  }

  const expected = new Set(expectedFiles)
  for (const relative of expectedFiles) {
    if (!uniqueFiles.has(relative)) {
      errors.push(`${relative}: critical module is missing from coverage scope`)
    }
  }
  for (const relative of uniqueFiles) {
    if (!expected.has(relative)) {
      errors.push(`${relative}: coverage scope entry is not classified as a critical module`)
    }
  }
  return errors
}

export async function validateCoverageFilesExist(root, files) {
  const errors = []
  if (!Array.isArray(files)) return errors
  for (const relative of files) {
    if (typeof relative !== 'string') continue
    try {
      await access(path.join(root, relative))
    }
    catch {
      errors.push(`${relative}: coverage scope source is missing`)
    }
  }
  return errors
}

async function sourceFilesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await sourceFilesUnder(absolute))
    else if (entry.name.endsWith('.ts')) files.push(absolute)
  }
  return files
}
