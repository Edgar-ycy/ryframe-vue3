import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parseDocument } from 'yaml'

const root = process.cwd()
const workflowsDirectory = path.join(root, '.github', 'workflows')
const actionsDirectory = path.join(root, '.github', 'actions')
const errors = []

async function readDirectory(directory) {
  try {
    return await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

async function collectYamlFiles(directory, predicate = () => true) {
  const files = []
  for (const entry of await readDirectory(directory)) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectYamlFiles(absolute, predicate)))
    else if (entry.isFile() && predicate(entry.name)) files.push(absolute)
  }
  return files
}

async function fileExists(absolute) {
  try {
    await access(absolute)
    return true
  } catch {
    return false
  }
}

function collectLocalUses(value, uses = []) {
  if (Array.isArray(value)) {
    for (const child of value) collectLocalUses(child, uses)
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'uses' && typeof child === 'string' && child.startsWith('./')) uses.push(child)
      else collectLocalUses(child, uses)
    }
  }
  return uses
}

function collectRemoteUses(value, uses = []) {
  if (Array.isArray(value)) {
    for (const child of value) collectRemoteUses(child, uses)
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'uses' && typeof child === 'string' && !child.startsWith('./')) uses.push(child)
      else collectRemoteUses(child, uses)
    }
  }
  return uses
}

function relative(absolute) {
  return path.relative(root, absolute).split(path.sep).join('/')
}

function containsExpressionReference(value, name) {
  if (typeof value !== 'string' || !value.includes('${{')) return false
  return new RegExp(`(^|[^A-Za-z0-9_])${name}\\s*(?:\\.|\\[)`, 'u').test(value)
}

export function validateEnvironmentContexts(name, workflow) {
  const contextErrors = []
  const scopes = [
    [
      'workflow env',
      workflow?.env,
      ['runner', 'job', 'steps', 'env', 'needs', 'strategy', 'matrix'],
    ],
  ]
  for (const [jobName, job] of Object.entries(workflow?.jobs ?? {})) {
    scopes.push([`job ${jobName} env`, job?.env, ['runner', 'job', 'steps', 'env']])
  }
  for (const [location, environment, forbidden] of scopes) {
    if (environment == null) continue
    if (typeof environment !== 'object' || Array.isArray(environment)) {
      contextErrors.push(`${name}: ${location} must be an object`)
      continue
    }
    for (const [variable, value] of Object.entries(environment)) {
      for (const context of forbidden) {
        if (containsExpressionReference(value, context)) {
          contextErrors.push(
            `${name}: ${location}.${variable} cannot reference ${context}; move it to a step env, with, or run`,
          )
        }
      }
      if (typeof value === 'string' && value.includes('${{') && /\bhashFiles\s*\(/u.test(value)) {
        contextErrors.push(
          `${name}: ${location}.${variable} cannot call hashFiles; move it to a step env or with`,
        )
      }
    }
  }
  return contextErrors
}

const workflowFiles = await collectYamlFiles(workflowsDirectory, (name) => /\.ya?ml$/iu.test(name))
const actionFiles = await collectYamlFiles(actionsDirectory, (name) =>
  /^action\.ya?ml$/iu.test(name),
)

for (const absolute of [...workflowFiles, ...actionFiles].sort()) {
  const source = await readFile(absolute)
  const name = relative(absolute)

  if (source.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    errors.push(`${name}: must not contain a UTF-8 BOM`)
  }
  if (source.includes(0x0d)) errors.push(`${name}: must use LF line endings`)
  if (source.length > 0 && source.at(-1) !== 0x0a) {
    errors.push(`${name}: must end with a single LF`)
  }

  const text = source.toString('utf8')
  const document = parseDocument(text, { prettyErrors: true, strict: true, uniqueKeys: true })
  for (const error of document.errors) errors.push(`${name}: ${error.message}`)
  if (document.errors.length > 0) continue

  const workflow = document.toJS()
  if (workflowFiles.includes(absolute)) {
    errors.push(...validateEnvironmentContexts(name, workflow))
  }

  for (const localUse of collectLocalUses(workflow)) {
    if (localUse.includes('${{')) {
      errors.push(`${name}: local uses reference must be static (${localUse})`)
      continue
    }
    const target = path.resolve(root, localUse)
    if (!target.startsWith(`${root}${path.sep}`)) {
      errors.push(`${name}: local uses reference escapes repository (${localUse})`)
      continue
    }
    const candidates = /\.ya?ml$/iu.test(target)
      ? [target]
      : [path.join(target, 'action.yml'), path.join(target, 'action.yaml')]
    if (!(await Promise.all(candidates.map(fileExists)).then((results) => results.some(Boolean)))) {
      errors.push(`${name}: local uses reference is missing (${localUse})`)
    }
  }

  for (const remoteUse of collectRemoteUses(workflow)) {
    const separator = remoteUse.lastIndexOf('@')
    if (separator < 1) {
      errors.push(
        `${name}: remote uses reference must include an immutable revision (${remoteUse})`,
      )
      continue
    }
    const action = remoteUse.slice(0, separator)
    const revision = remoteUse.slice(separator + 1)
    if (action.startsWith('docker://')) {
      if (!/^sha256:[0-9a-f]{64}$/iu.test(revision)) {
        errors.push(`${name}: container action must use a sha256 digest (${remoteUse})`)
      }
    } else if (!/^[0-9a-f]{7,40}$/iu.test(revision)) {
      errors.push(`${name}: remote action must use a commit SHA (${remoteUse})`)
    }
  }
}

if (errors.length > 0) {
  console.error('Workflow check failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Workflow check passed (${workflowFiles.length} workflows, ${actionFiles.length} action manifests)`,
  )
}
