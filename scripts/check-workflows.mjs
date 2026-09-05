import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const ordinaryJobs = ['static', 'unit', 'build', 'browser', 'windows-smoke']
const requiredJobMatrix = {
  push: { success: ordinaryJobs, skipped: [] },
  pull_request: { success: ordinaryJobs, skipped: [] },
}

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

function relative(root, absolute) {
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

export function validateRequiredJobs(event, results) {
  const errors = []
  const matrix = requiredJobMatrix[event]
  if (!matrix) return [`不支持的 GitHub 事件：${event}`]
  for (const name of ordinaryJobs) {
    if (!Object.hasOwn(results, name)) errors.push(`缺少 required job 结果：${name}`)
  }
  for (const name of Object.keys(results)) {
    if (!ordinaryJobs.includes(name)) errors.push(`包含未知 required job：${name}`)
  }
  if (errors.length > 0) return errors

  const expected = new Map([
    ...matrix.success.map((name) => [name, 'success']),
    ...matrix.skipped.map((name) => [name, 'skipped']),
  ])
  for (const name of ordinaryJobs) {
    if (results[name] !== expected.get(name)) {
      errors.push(`${name} 期望 ${expected.get(name)}，实际 ${results[name]}`)
    }
  }
  return errors
}

function parseRequiredArguments(argv) {
  let event
  const results = {}
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--event' && argv[index + 1]) {
      event = argv[index + 1]
      index += 1
      continue
    }
    if (value === '--job' && argv[index + 1]) {
      const raw = argv[index + 1]
      const separator = raw.indexOf('=')
      if (separator <= 0 || separator === raw.length - 1) {
        throw new Error(`job 结果必须使用 name=result：${raw}`)
      }
      const name = raw.slice(0, separator)
      if (Object.hasOwn(results, name)) throw new Error(`job 结果重复：${name}`)
      results[name] = raw.slice(separator + 1)
      index += 1
      continue
    }
    throw new Error(`未知参数：${value}`)
  }
  if (!event) throw new Error('缺少 --event')
  return { event, results }
}

function inspectWorkflowFile(root, absolute, source, document, isWorkflow) {
  const errors = []
  const name = relative(root, absolute)
  if (source.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    errors.push(`${name}: must not contain a UTF-8 BOM`)
  }
  if (source.includes(0x0d)) errors.push(`${name}: must use LF line endings`)
  if (source.length > 0 && source.at(-1) !== 0x0a) {
    errors.push(`${name}: must end with a single LF`)
  }
  for (const error of document.errors) errors.push(`${name}: ${error.message}`)
  if (document.errors.length > 0) return { errors, name }

  const workflow = document.toJS()
  if (isWorkflow) errors.push(...validateEnvironmentContexts(name, workflow))
  return { errors, name, workflow }
}

async function validateWorkflowReferences(root, name, workflow) {
  const errors = []
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
  return errors
}

export async function inspectWorkflows(root) {
  const { parseDocument } = await import('yaml')
  const workflowFiles = await collectYamlFiles(path.join(root, '.github', 'workflows'), (name) =>
    /\.ya?ml$/iu.test(name),
  )
  const actionFiles = await collectYamlFiles(path.join(root, '.github', 'actions'), (name) =>
    /^action\.ya?ml$/iu.test(name),
  )
  const workflowSet = new Set(workflowFiles)
  const errors = []
  for (const absolute of [...workflowFiles, ...actionFiles].sort()) {
    const source = await readFile(absolute)
    const document = parseDocument(source.toString('utf8'), {
      prettyErrors: true,
      strict: true,
      uniqueKeys: true,
    })
    const result = inspectWorkflowFile(root, absolute, source, document, workflowSet.has(absolute))
    errors.push(...result.errors)
    if (result.workflow) {
      errors.push(...(await validateWorkflowReferences(root, result.name, result.workflow)))
    }
  }
  return { actionFiles, errors, workflowFiles }
}

export async function runWorkflowCheck(root = process.cwd(), output = console) {
  const { actionFiles, errors, workflowFiles } = await inspectWorkflows(root)
  if (errors.length > 0) {
    output.error('Workflow check failed:')
    for (const error of errors) output.error(`  - ${error}`)
    return false
  }
  output.log(
    `Workflow check passed (${workflowFiles.length} workflows, ${actionFiles.length} action manifests)`,
  )
  return true
}

export function runRequiredJobsCheck(argv, output = console) {
  const { event, results } = parseRequiredArguments(argv)
  const errors = validateRequiredJobs(event, results)
  if (errors.length > 0) {
    for (const error of errors) output.error(error)
    return false
  }
  output.log(`Required 汇总校验通过（event=${event}）`)
  return true
}

export async function runWorkflowCli(argv, root = process.cwd(), output = console) {
  if (argv[0] === 'required') return runRequiredJobsCheck(argv.slice(1), output)
  if (argv.length > 0) throw new Error(`未知参数：${argv[0]}`)
  return runWorkflowCheck(root, output)
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  try {
    if (!(await runWorkflowCli(process.argv.slice(2)))) process.exitCode = 1
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
