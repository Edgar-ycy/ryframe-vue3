import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { parse as parseYaml } from 'yaml'

const dependencySources = [
  ['package.json', findPrereleaseVersionsInPackageJson],
  ['pnpm-workspace.yaml', findPrereleaseVersionsInPnpmWorkspace],
  ['pnpm-lock.yaml', findPrereleaseVersionsInPnpmLock],
]

/**
 * 匹配所有 SemVer 风格的预发布后缀，避免维护标签清单。数字标识符以及
 * 生态系统特有的 `next`、`dev`、`experimental` 等标签也属于预发布版本。
 */
export const prereleaseVersion =
  /(?<![0-9A-Za-z\\])v?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?![0-9A-Za-z\\])/giu

export function findPrereleaseVersions(source) {
  return [...source.matchAll(prereleaseVersion)].map((match) => match[0])
}

function findPrereleaseVersionsInValue(value, seen = new WeakSet()) {
  if (typeof value === 'string') return findPrereleaseVersions(value)
  if (!value || typeof value !== 'object') return []
  if (seen.has(value)) return []
  seen.add(value)

  const findings = []
  for (const [key, child] of Object.entries(value)) {
    findings.push(...findPrereleaseVersions(key))
    findings.push(...findPrereleaseVersionsInValue(child, seen))
  }
  return findings
}

export function findPrereleaseVersionsInPackageJson(source) {
  return findPrereleaseVersionsInValue(JSON.parse(source))
}

export function findPrereleaseVersionsInPnpmLock(source) {
  const lock = parseYaml(source, { maxAliasCount: 100 })
  const findings = []

  findings.push(...findPrereleaseVersionsInValue(lock.overrides))

  for (const importer of Object.values(lock.importers ?? {})) {
    for (const section of [
      importer.dependencies,
      importer.devDependencies,
      importer.optionalDependencies,
    ]) {
      for (const dependency of Object.values(section ?? {})) {
        if (typeof dependency === 'string') {
          findings.push(...findPrereleaseVersions(dependency))
          continue
        }
        if (!dependency || typeof dependency !== 'object') continue
        findings.push(...findPrereleaseVersions(dependency.specifier ?? ''))
        findings.push(...findPrereleaseVersions(dependency.version ?? ''))
      }
    }
  }

  // packages 和 snapshots 的键表示锁定后的实际解析版本；值中的 peerDependency
  // 范围只是兼容性声明，不能视为项目安装了预发布依赖。
  for (const key of [...Object.keys(lock.packages ?? {}), ...Object.keys(lock.snapshots ?? {})]) {
    findings.push(...findPrereleaseVersions(key))
  }

  return findings
}

export function findPrereleaseVersionsInPnpmWorkspace(source) {
  return findPrereleaseVersionsInValue(parseYaml(source, { maxAliasCount: 100 }))
}

function findCiDependencyReferences(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return []
  if (seen.has(value)) return []
  seen.add(value)

  const findings = []
  for (const [rawKey, child] of Object.entries(value)) {
    const key = rawKey.toLowerCase()
    if (typeof child === 'string') {
      const isDependencyReference =
        key === 'uses' ||
        key === 'image' ||
        key === 'container' ||
        child.trimStart().toLowerCase().startsWith('docker://')
      if (isDependencyReference) findings.push(...findPrereleaseVersions(child))
    } else {
      findings.push(...findCiDependencyReferences(child, seen))
    }
  }
  return findings
}

/** 检查已解析工作流或 Action 清单中携带依赖的字段。 */
export function findPrereleaseVersionsInCiYaml(source) {
  return findCiDependencyReferences(parseYaml(source, { maxAliasCount: 100 }))
}

async function readDirectory(directory) {
  try {
    return await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

async function findActionManifests(directory) {
  const manifests = []
  for (const entry of await readDirectory(directory)) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      manifests.push(...(await findActionManifests(absolute)))
    } else if (entry.isFile() && /^action\.ya?ml$/iu.test(entry.name)) {
      manifests.push(absolute)
    }
  }
  return manifests
}

async function findCiYamlFiles(root) {
  const workflowDirectory = path.join(root, '.github', 'workflows')
  const workflows = (await readDirectory(workflowDirectory))
    .filter((entry) => entry.isFile() && /\.ya?ml$/iu.test(entry.name))
    .map((entry) => path.join(workflowDirectory, entry.name))
  const actions = await findActionManifests(path.join(root, '.github', 'actions'))
  return [...workflows, ...actions].sort()
}

/** 扫描仓库内会实际安装或执行的依赖版本。 */
export async function inspectPrereleaseDependencies(root) {
  const findings = []
  for (const [relative, inspect] of dependencySources) {
    const source = await readFile(path.join(root, relative), 'utf8')
    for (const version of inspect(source)) findings.push(`${relative}: ${version}`)
  }

  const ciYamlFiles = await findCiYamlFiles(root)
  for (const absolute of ciYamlFiles) {
    const relative = path.relative(root, absolute).split(path.sep).join('/')
    const source = await readFile(absolute, 'utf8')
    for (const version of findPrereleaseVersionsInCiYaml(source)) {
      findings.push(`${relative}: ${version}`)
    }
  }

  return { ciYamlFiles, findings: [...new Set(findings)].sort() }
}

export async function runPrereleaseDependencyCheck(root = process.cwd(), output = console) {
  const { ciYamlFiles, findings } = await inspectPrereleaseDependencies(root)
  if (findings.length > 0) {
    output.error('Prerelease dependency check failed:')
    for (const finding of findings) output.error(`  - ${finding}`)
    output.error('Use a compatible stable release; do not add an implicit prerelease allowlist.')
    return false
  }

  output.log(
    `Prerelease dependency check passed (package.json, pnpm-workspace.yaml, pnpm-lock.yaml, and ${ciYamlFiles.length} CI YAML files)`,
  )
  return true
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isMain && !(await runPrereleaseDependencyCheck())) process.exitCode = 1
