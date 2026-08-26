import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  findPrereleaseVersionsInCiYaml,
  findPrereleaseVersionsInPackageJson,
  findPrereleaseVersionsInPnpmLock,
  findPrereleaseVersionsInPnpmWorkspace,
} from './prerelease-dependency-policy.mjs'

const root = process.cwd()

const sources = [
  ['package.json', findPrereleaseVersionsInPackageJson],
  ['pnpm-workspace.yaml', findPrereleaseVersionsInPnpmWorkspace],
  ['pnpm-lock.yaml', findPrereleaseVersionsInPnpmLock],
]
const findings = []

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

async function findCiYamlFiles() {
  const workflowDirectory = path.join(root, '.github', 'workflows')
  const workflows = (await readDirectory(workflowDirectory))
    .filter((entry) => entry.isFile() && /\.ya?ml$/iu.test(entry.name))
    .map((entry) => path.join(workflowDirectory, entry.name))
  const actions = await findActionManifests(path.join(root, '.github', 'actions'))
  return [...workflows, ...actions].sort()
}

for (const [relative, inspect] of sources) {
  const source = await readFile(path.join(root, relative), 'utf8')
  for (const version of inspect(source)) {
    findings.push(`${relative}: ${version}`)
  }
}

const ciYamlFiles = await findCiYamlFiles()
for (const absolute of ciYamlFiles) {
  const relative = path.relative(root, absolute).split(path.sep).join('/')
  const source = await readFile(absolute, 'utf8')
  for (const version of findPrereleaseVersionsInCiYaml(source)) {
    findings.push(`${relative}: ${version}`)
  }
}

if (findings.length > 0) {
  console.error('Prerelease dependency check failed:')
  for (const finding of [...new Set(findings)].sort()) console.error(`  - ${finding}`)
  console.error('Use a compatible stable release; do not add an implicit prerelease allowlist.')
  process.exitCode = 1
} else {
  console.log(
    `Prerelease dependency check passed (package.json, pnpm-workspace.yaml, pnpm-lock.yaml, and ${ciYamlFiles.length} CI YAML files)`,
  )
}
