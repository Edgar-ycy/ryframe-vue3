import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const ordinaryJobs = ['static', 'unit', 'build', 'browser', 'windows-smoke']
const requiredJobMatrix = {
  push: { success: ordinaryJobs, skipped: [] },
  pull_request: { success: ordinaryJobs, skipped: [] },
}
const requiredRequestKeys = ['event', 'needs', 'operation', 'version']
const requiredNeedKeys = new Set(['outputs', 'result'])

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requireExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} 字段必须精确为 ${expected.join('、')}`)
  }
}

function requireProtocolString(value, label) {
  if (typeof value !== 'string' || !value || /[\r\n\0]/u.test(value)) {
    throw new Error(`${label} 必须是非空单行字符串`)
  }
  return value
}

/** 将 GitHub 的 event/needs 快照转换为 Required 节点的不可变参数。 */
export function parseRequiredJobsRequest(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('Required 环境请求不能为空')
  let request
  try {
    request = JSON.parse(raw)
  } catch {
    throw new Error('Required 环境请求不是合法 JSON')
  }
  if (!isPlainObject(request)) throw new Error('Required 环境请求必须是对象')
  requireExactKeys(request, requiredRequestKeys, 'Required 环境请求')
  if (request.version !== 1) throw new Error('Required 环境协议版本必须为 1')
  if (request.operation !== 'required-jobs')
    throw new Error('Required 环境操作必须为 required-jobs')
  const event = requireProtocolString(request.event, 'Required event')
  if (!isPlainObject(request.needs)) throw new Error('Required needs 必须是对象')

  const resultEntries = []
  for (const [name, job] of Object.entries(request.needs)) {
    requireProtocolString(name, 'Required job 名称')
    if (!isPlainObject(job)) throw new Error(`Required job ${name} 必须是对象`)
    if (
      !Object.hasOwn(job, 'result') ||
      Object.keys(job).some((key) => !requiredNeedKeys.has(key))
    ) {
      throw new Error(`Required job ${name} 只能包含 result 和可选 outputs`)
    }
    if (Object.hasOwn(job, 'outputs') && !isPlainObject(job.outputs)) {
      throw new Error(`Required job ${name}.outputs 必须是对象`)
    }
    resultEntries.push([name, requireProtocolString(job.result, `Required job ${name}.result`)])
  }
  return Object.freeze({ event, results: Object.freeze(Object.fromEntries(resultEntries)) })
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

export async function runWorkflowCli(argv, root = process.cwd(), output = console) {
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
