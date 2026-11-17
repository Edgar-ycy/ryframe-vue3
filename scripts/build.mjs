import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'
import { pathToFileURL } from 'node:url'
import { buildSourceSnapshot } from './build-source.mjs'
import { loadFrontendConfiguration, requireSameOrigin } from './frontend-tool-config.mjs'
import { prepareBuildIdentity } from './build-identity.mjs'
import { writeBuildReceipt } from './restore-build.mjs'
import { bundledCorepackPath } from './tool-inputs.mjs'

export function parseBuildArguments(argv) {
  const options = { real: false, plan: false }
  const seen = new Set()
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (!['--real', '--plan', '--source-commit'].includes(flag) || seen.has(flag)) {
      throw new Error('用法：corepack pnpm build [--real] [--plan] [--source-commit <SHA>]')
    }
    seen.add(flag)
    if (flag === '--source-commit') {
      const commit = argv[++index]
      if (typeof commit !== 'string' || !/^[a-f0-9]{40}$/u.test(commit)) {
        throw new Error('--source-commit 必须为完整 40 位小写 Git SHA')
      }
      options.sourceCommit = commit
    } else options[flag === '--real' ? 'real' : 'plan'] = true
  }
  return options
}

export function buildTasks() {
  return [
    { name: 'app-types', arguments: ['exec', 'vue-tsc', '-p', 'tsconfig.app.json'] },
    { name: 'production-build', arguments: ['exec', 'vite', 'build'] },
  ]
}

function executeTask(root, task, environment) {
  execFileSync(process.execPath, [bundledCorepackPath(), 'pnpm', ...task.arguments], {
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
    configure = loadFrontendConfiguration,
    identify = prepareBuildIdentity,
  } = {},
) {
  const tasks = buildTasks()
  if (options.plan) {
    return {
      tasks,
      receipt: options.real,
      sourceCommit: options.sourceCommit ?? 'development',
    }
  }
  const configuration = configure(root, environment.APP_ENV ?? 'dev')
  if (options.real) requireSameOrigin(configuration)
  identify(root, options.sourceCommit)
  const trackSource = options.real || options.sourceCommit !== undefined
  const before = trackSource ? capture(root, environment) : undefined
  if (
    trackSource &&
    !isDeepStrictEqual(configuration, configure(root, environment.APP_ENV ?? 'dev'))
  ) {
    throw new Error('执行任务前公开配置或工具来源发生漂移；请稳定文件后重试')
  }
  for (const task of tasks) execute(root, task, environment)
  if (options.real) return publish(root, before, environment)
  if (trackSource && !isDeepStrictEqual(before, capture(root, environment))) {
    throw new Error('正式构建期间源码、配置、身份或工具链发生变化；请稳定来源后重新构建')
  }
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
