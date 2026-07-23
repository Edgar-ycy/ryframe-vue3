import { parse as parseYaml } from 'yaml'

/**
 * Match every SemVer-style prerelease suffix instead of maintaining a list of
 * labels. Numeric identifiers and ecosystem-specific labels such as `next`,
 * `dev`, and `experimental` are prereleases too.
 */
export const prereleaseVersion = /(?<![0-9A-Za-z\\])v?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?![0-9A-Za-z\\])/giu

export function findPrereleaseVersions(source) {
  return [...source.matchAll(prereleaseVersion)].map(match => match[0])
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
        key === 'uses'
        || key === 'image'
        || key === 'container'
        || child.trimStart().toLowerCase().startsWith('docker://')
      if (isDependencyReference) findings.push(...findPrereleaseVersions(child))
    }
    else {
      findings.push(...findCiDependencyReferences(child, seen))
    }
  }
  return findings
}

/** Inspect dependency-bearing fields in a parsed workflow or action manifest. */
export function findPrereleaseVersionsInCiYaml(source) {
  return findCiDependencyReferences(parseYaml(source, { maxAliasCount: 100 }))
}
