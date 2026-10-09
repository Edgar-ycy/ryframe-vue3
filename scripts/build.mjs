import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { buildSourceSnapshot } from './build-source.mjs'
import { writeBuildReceipt } from './restore-build.mjs'

export function parseBuildArguments(argv) {
  const flags = new Set(argv)
  if (flags.size !== argv.length || argv.some((value) => !['--real', '--plan'].includes(value)))
    throw new Error('用法：corepack pnpm build [--real] [--plan]')
  return { real: flags.has('--real'), plan: flags.has('--plan') }
}

export function buildTasks() {
  return [
    { name: 'app-types', arguments: ['exec', 'vue-tsc', '-p', 'tsconfig.app.json'] },
    { name: 'production-build', arguments: ['exec', 'vite', 'build'] },
  ]
}

function executeTask(root, task, environment) {
  const corepack = path.join(
    path.dirname(process.execPath),
    'node_modules/corepack/dist/corepack.js',
  )
  execFileSync(process.execPath, [corepack, 'pnpm', ...task.arguments], {
    cwd: root,
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  })
}

export function runBuild(
  root,
  options,
  {
    environment = process.env,
    execute = executeTask,
    capture = buildSourceSnapshot,
    publish = writeBuildReceipt,
  } = {},
) {
  const tasks = buildTasks()
  if (options.plan)
    return {
      tasks,
      receipt: options.real,
      overrides: options.real ? { VITE_APP_API_ORIGIN: '' } : {},
    }
  const overrides = options.real ? { VITE_APP_API_ORIGIN: '' } : {}
  const effective = { ...environment, ...overrides }
  const before = options.real ? capture(root, overrides, effective) : undefined
  for (const task of tasks) execute(root, task, effective)
  if (options.real) return publish(root, before, overrides, effective)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const options = parseBuildArguments(process.argv.slice(2))
    const result = runBuild(process.cwd(), options)
    if (options.plan) console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(error.stack ?? error.message)
    process.exitCode = 1
  }
}
