import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { normalizeCommit, normalizeRepository } from './api-contract-state.mjs'
import { taskEnvironment, taskSpecs } from './task-specs.mjs'

const commands = new Set(['dev', 'check', 'build', 'generate'])
const stages = new Set(['static', 'unit', 'contract', 'browser', 'tools'])
const freshSource = () => randomUUID()

export const taskRunnerHelp = `RyFrame 前端任务

用法：
  corepack pnpm dev [--preview]
  corepack pnpm check [--full | --test <路径> | --stage <阶段>] [--fix] [--plan]
  corepack pnpm build [--real]
  corepack pnpm generate [--write]

check 阶段：static、unit、contract、browser、tools
附加参数：browser 可用 --real、--fixture core|device、--server dev|preview
static/contract 可用 --upstream；--full 不启动浏览器或真实业务服务
CI 物料清单：corepack pnpm generate --sbom --output <文件> --write
`

export class TaskUsageError extends Error {}

export function parseConsumerArguments(argv) {
  if (!Array.isArray(argv) || argv.some((value) => typeof value !== 'string')) {
    throw new TaskUsageError('消费契约上下文必须是字符串参数数组')
  }
  const values = new Map()
  const names = new Set([
    '--mode',
    '--openapi',
    '--backend-commit',
    '--backend-repository',
    '--require-pin',
  ])
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index]
    const value = argv[index + 1]
    if (!names.has(name) || !value || value.startsWith('--') || values.has(name)) {
      throw new TaskUsageError('未知、重复或缺少值的消费契约参数：' + name)
    }
    values.set(name, value)
  }
  if (!['candidate', 'formal'].includes(values.get('--mode'))) {
    throw new TaskUsageError('--mode 只能是 candidate 或 formal')
  }
  if (!values.has('--openapi')) throw new TaskUsageError('必须提供 --openapi')
  if (!['true', 'false'].includes(values.get('--require-pin'))) {
    throw new TaskUsageError('--require-pin 只能是 true 或 false')
  }
  try {
    return {
      backendCommit: normalizeCommit(values.get('--backend-commit')),
      backendRepository: normalizeRepository(values.get('--backend-repository')),
      candidate: path.resolve(values.get('--openapi')),
      mode: values.get('--mode'),
      requirePin: values.get('--require-pin') === 'true',
    }
  } catch (error) {
    throw new TaskUsageError(error.message)
  }
}

export function consumerContext(options, raw) {
  if (raw === undefined) return undefined
  if (options.command !== 'check' || (!options.full && options.stage !== 'contract')) {
    throw new TaskUsageError('消费契约上下文仅用于 check --full 或 check --stage contract')
  }
  let args
  try {
    args = JSON.parse(raw)
  } catch {
    throw new TaskUsageError('消费契约上下文不是合法 JSON')
  }
  return parseConsumerArguments(args)
}

export function validateConsumerState(options, local, candidateBytes) {
  if (local.mode !== options.mode) throw new Error('前端契约状态与本次消费检查不一致')
  if (!candidateBytes.equals(local.bytes)) throw new Error('前端 OpenAPI 与本次后端契约不一致')
  if (local.metadata.backend_repository !== options.backendRepository) {
    throw new Error('openapi/source.json 未指向本次后端仓库')
  }
  if (
    options.mode === 'formal' &&
    options.requirePin &&
    local.metadata.backend_commit !== options.backendCommit
  ) {
    throw new Error('正式契约必须精确固定本次后端提交')
  }
}

function usage(message) {
  throw new TaskUsageError(message)
}

function normalizedArguments(argv) {
  const args = [...argv]
  while (args[0] === '--') args.shift()
  return args
}

function takeValue(args, index, name) {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) usage(`${name} 缺少参数`)
  return value
}

function ensureUnique(seen, name) {
  if (seen.has(name)) usage(`参数重复：${name}`)
  seen.add(name)
}

function parseCheck(args) {
  const result = {
    command: 'check',
    fix: false,
    full: false,
    plan: false,
    real: false,
    stage: undefined,
    test: undefined,
    upstream: false,
  }
  const seen = new Set()
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index]
    if (name === '--full' || name === '--fix' || name === '--plan') {
      ensureUnique(seen, name)
      result[name.slice(2)] = true
    } else if (name === '--real' || name === '--upstream') {
      ensureUnique(seen, name)
      result[name.slice(2)] = true
    } else if (['--stage', '--test', '--fixture', '--server'].includes(name)) {
      ensureUnique(seen, name)
      result[name.slice(2)] = takeValue(args, index, name)
      index += 1
    } else usage(`check 不支持参数：${name}`)
  }

  if (result.stage && !stages.has(result.stage)) usage(`未知 check 阶段：${result.stage}`)
  if ([result.full, Boolean(result.stage), Boolean(result.test)].filter(Boolean).length > 1) {
    usage('--full、--stage 和 --test 不能同时使用')
  }
  if (result.fix && result.stage && result.stage !== 'static') {
    usage('--fix 只能用于默认检查、--full 或 static 阶段')
  }
  if (result.fix && result.test) usage('--fix 不能与 --test 同时使用')
  if (result.real && result.stage !== 'browser') {
    usage('--real 只能与 --stage browser 同时使用')
  }
  if ((result.fixture || result.server) && result.stage !== 'browser') {
    usage('--fixture 和 --server 只能用于 browser 阶段')
  }
  if (result.fixture && !['core', 'device'].includes(result.fixture)) usage('未知 browser fixture')
  if (result.fixture === 'device' && !result.real) usage('device fixture 必须显式启用 --real')
  if (result.server && !['dev', 'preview'].includes(result.server)) usage('未知 browser server')
  if (result.upstream && !result.full && result.stage !== 'static' && result.stage !== 'contract') {
    usage('--upstream 只能用于 --full、static 或 contract 阶段')
  }
  return result
}

function parseGenerate(args) {
  const result = { command: 'generate', output: undefined, sbom: false, write: false }
  const seen = new Set()
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index]
    if (name === '--write' || name === '--sbom') {
      ensureUnique(seen, name)
      result[name.slice(2)] = true
    } else if (name === '--output') {
      ensureUnique(seen, name)
      result.output = takeValue(args, index, name)
      index += 1
    } else usage(`generate 不支持参数：${name}`)
  }
  if (result.sbom && result.write && !result.output) usage('写入 SBOM 必须同时提供 --output')
  if (result.output && !result.sbom) usage('--output 只能与 --sbom 同时使用')
  return result
}

export function parseTaskArguments(argv) {
  const args = normalizedArguments(argv)
  const command = args.shift()
  if (!command) return { command: 'help' }
  if (command === '--help') {
    if (args.length) usage('--help 不能与其他参数同时使用')
    return { command: 'help' }
  }
  if (!commands.has(command)) usage(`未知任务：${command}`)
  if (args.includes('--help')) {
    if (args.length !== 1) usage('--help 不能与其他参数同时使用')
    return { command: 'help' }
  }
  if (command === 'check') return parseCheck(args)
  if (command === 'generate') return parseGenerate(args)

  const allowed = command === 'dev' ? '--preview' : '--real'
  if (args.length > 1 || (args.length === 1 && args[0] !== allowed)) {
    usage(`${command} 仅支持 ${allowed}`)
  }
  return { command, [allowed.slice(2)]: args.length === 1 }
}

function requestedProfiles(options) {
  if (options.command === 'help') return []
  if (options.command !== 'check') return [options.sbom ? 'sbom' : options.command]
  if (options.test) return ['targeted']
  if (options.full) return ['static', 'unit', 'contract', 'tools', 'build']
  if (options.consumerCheck) return ['contract', 'unit']
  return [options.stage ?? 'fast']
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  }
  return value
}

function taskKey(task) {
  return JSON.stringify(canonical([task.source, task.id, task.params, task.env]))
}

function createTask(id, params, source, phase) {
  const spec = taskSpecs[id]
  if (!spec) throw new Error(`未登记的任务：${id}`)
  const task = {
    id,
    params,
    source,
    phase: phase ?? spec.phase?.(params) ?? 0,
    effect: params.fix || params.write ? 'write' : (spec.effect ?? 'read'),
  }
  task.env = taskEnvironment(task)
  task.key = taskKey(task)
  return task
}

function covers(candidate, task) {
  if (candidate.source !== task.source || candidate.id !== task.id) return false
  if (JSON.stringify(canonical(candidate.env)) !== JSON.stringify(canonical(task.env))) return false
  if (candidate.id === 'unit') {
    return (
      candidate.params.coverage &&
      !task.params.coverage &&
      !candidate.params.test &&
      !task.params.test
    )
  }
  if (candidate.id === 'typecheck')
    return candidate.params.scope === 'all' && task.params.scope === 'app'
  if (candidate.id === 'format')
    return !candidate.params.fix && !task.params.fix && !candidate.params.cache && task.params.cache
  return false
}

/** 只在同次来源上下文内归并；不读取或保存跨运行的成功状态。 */
export function combineTaskPlans(plans) {
  const unique = [
    ...new Map(
      plans.flatMap((plan) => plan.groups.flat()).map((task) => [task.key, task]),
    ).values(),
  ]
  const tasks = unique.filter(
    (task) => !unique.some((other) => other !== task && covers(other, task)),
  )
  const phases = [...new Set(tasks.map((task) => task.phase))].sort((left, right) => left - right)
  let previous = []
  const groups = phases.map((phase) => {
    const group = tasks
      .filter((task) => task.phase === phase)
      .map((task) => ({ ...task, dependencies: previous }))
    previous = group.map((task) => task.key)
    return group
  })
  return { groups, interactive: plans.some((plan) => plan.interactive) }
}

export function createTaskPlan(options, { source = freshSource() } = {}) {
  const profiles = new Set(requestedProfiles(options))
  const tasks = []
  if (options.fix) {
    for (const [index, id] of ['format', 'eslint', 'stylelint'].entries()) {
      const params = { ...taskSpecs[id].params(options, profiles), fix: true }
      if (id === 'format') params.cache = false
      tasks.push(createTask(id, params, source, index - 3))
    }
  }
  for (const [id, spec] of Object.entries(taskSpecs)) {
    if (!spec.profiles.some((profile) => profiles.has(profile)) || spec.when?.(options) === false)
      continue
    tasks.push(createTask(id, spec.params?.(options, profiles) ?? {}, source))
  }
  return combineTaskPlans([{ groups: [tasks], interactive: options.command === 'dev' }])
}

export function createConsumerContractPlan({
  profile = 'contract',
  source = freshSource(),
  consumer,
} = {}) {
  if (!['contract', 'full'].includes(profile))
    throw new TaskUsageError('消费契约 profile 必须为 contract 或 full')
  return createTaskPlan(
    {
      command: 'check',
      full: profile === 'full',
      stage: 'contract',
      consumerCheck: true,
      consumer,
    },
    { source },
  )
}
