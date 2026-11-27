import { toolProcessEnvironment } from './tool-inputs.mjs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import console from 'node:console'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { verifyLocalContractState } from './api-contract-state.mjs'
import { readConsumerContext } from './consumer-context.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parseArguments(argv) {
  let stage = 'contract'
  let full = false
  let explicitStage = false
  let plan = false
  let real = false
  let generated = false
  let spec
  let fixture
  let server
  let consumerContext
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--generated') {
      if (generated) throw new Error('--generated 不能重复')
      generated = true
      continue
    }
    if (value === '--spec') {
      if (spec !== undefined) throw new Error('--spec 不能重复')
      spec = argv[++index]
      if (!spec || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.spec\.ts$/.test(spec))
        throw new Error('--spec 必须为生成页面测试文件名')
      continue
    }
    if (value === '--consumer-context') {
      if (consumerContext !== undefined) throw new Error('--consumer-context 不能重复')
      consumerContext = argv[++index]
      if (!consumerContext || consumerContext.startsWith('--')) {
        throw new Error('--consumer-context 缺少文件路径')
      }
      continue
    }
    if (value === '--real') {
      real = true
      continue
    }
    if (value === '--fixture' || value === '--server') {
      const selected = argv[++index]
      const choices = value === '--fixture' ? ['core', 'business'] : ['dev', 'preview']
      if (!choices.includes(selected)) throw new Error(`${value} 必须为 ${choices.join(' 或 ')}`)
      if (value === '--fixture') fixture = selected
      else server = selected
      continue
    }
    if (value === '--plan') {
      plan = true
      continue
    }
    if (value === '--full') {
      full = true
      continue
    }
    if (value === '--stage') {
      explicitStage = true
      stage = argv[++index]
      if (!stage) throw new Error('--stage 缺少值')
      continue
    }
    throw new Error(`未知参数：${value}`)
  }
  if (full && explicitStage) throw new Error('--full 不能与 --stage 同时使用')
  const selected = full ? 'full' : stage
  if (!['contract', 'static', 'unit', 'build', 'browser', 'full'].includes(selected)) {
    throw new Error(`未知检查阶段：${selected}`)
  }
  if ((real || fixture || server || generated) && selected !== 'browser')
    throw new Error('真实浏览器参数只能用于 browser 阶段')
  if ((fixture || server) && !real) throw new Error('--fixture 和 --server 必须与 --real 一起使用')
  if (generated && (!real || (fixture && fixture !== 'core')))
    throw new Error('--generated 必须与 --real 及 core fixture 一起使用')
  if (
    spec !== undefined &&
    (selected !== 'browser' || !generated || !real || (fixture && fixture !== 'core'))
  )
    throw new Error('--spec 仅适用于 browser --generated --real 的 core 验收')
  if (consumerContext && !['contract', 'full'].includes(selected)) {
    throw new Error('--consumer-context 只能用于 contract 或 full 阶段')
  }
  return {
    full,
    stage: selected,
    plan,
    ...(generated ? { generated } : {}),
    ...(spec !== undefined ? { spec } : {}),
    ...(consumerContext ? { consumerContext } : {}),
    ...(real ? { real, fixture: fixture || 'core', server: server || 'dev' } : {}),
  }
}

export function checkTasks(stage, options = {}) {
  if (
    options.generated &&
    (stage !== 'browser' || !options.real || (options.fixture && options.fixture !== 'core'))
  )
    throw new Error('--generated 仅适用于 browser 阶段的真实 core 验收')
  if (
    options.spec !== undefined &&
    (stage !== 'browser' ||
      !options.generated ||
      !options.real ||
      (options.fixture && options.fixture !== 'core') ||
      typeof options.spec !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*\.spec\.ts$/.test(options.spec))
  )
    throw new Error('--spec 仅接受真实 core 生成页面测试文件名')
  if (options.consumerContext && !['contract', 'full'].includes(stage)) {
    throw new Error('--consumer-context 只能用于 contract 或 full 阶段')
  }
  if (stage === 'browser' && options.real)
    return [
      {
        name: 'browser-real',
        node: [
          'scripts/run-browser.mjs',
          ...(options.generated ? ['--generated'] : []),
          '--real',
          '--fixture',
          options.fixture,
          '--server',
          options.server,
          ...(options.spec !== undefined ? ['--spec', options.spec] : []),
        ],
      },
    ]
  const tasks = {
    contract: [
      { name: 'contract' },
      ...(options.consumerContext
        ? [
            {
              name: 'consumer-proof',
              dependsOn: ['contract'],
              node: [
                'scripts/contract-tests/frontend-native-receipt.mjs',
                '--consumer-context',
                options.consumerContext,
              ],
            },
          ]
        : []),
    ],
    static: [
      { name: 'documentation', node: ['scripts/check-documentation.ts'] },
      { name: 'import-boundaries', node: ['scripts/check-import-boundaries.ts'] },
      { name: 'workflows', node: ['scripts/check-workflows.ts'] },
      { name: 'eslint', args: ['exec', 'eslint', '.', '--max-warnings', '0'] },
      { name: 'prettier', args: ['exec', 'prettier', '--check', '.'] },
      { name: 'stylelint', args: ['exec', 'stylelint', 'src/**/*.{vue,scss}'] },
    ],
    unit: [
      { name: 'script-tests', node: ['--test', 'scripts/tests/*.test.{mjs,ts,mts}'] },
      { name: 'test-types', args: ['exec', 'vue-tsc', '-p', 'tsconfig.test.json'] },
      { name: 'unit-coverage', args: ['exec', 'vitest', 'run', '--coverage'] },
    ],
    build: [
      { name: 'production-build', args: ['build'] },
      { name: 'bundle-budget', node: ['scripts/check-bundle-budget.mjs'] },
    ],
    browser: [{ name: 'browser-smoke', node: ['scripts/run-browser.mjs'] }],
  }
  if (stage === 'full') {
    return ['contract', 'static', 'unit', 'build'].flatMap((name) =>
      checkTasks(name, name === 'contract' ? options : {}),
    )
  }
  if (!tasks[stage]) throw new Error(`未知检查阶段：${stage}`)
  return tasks[stage]
}

export function checkTaskEnvironment(_task, environment = process.env) {
  return {
    ...toolProcessEnvironment(environment),
  }
}

function runTask(task, consumer) {
  if (task.name === 'contract') return runContractCheck(consumer?.arguments)
  return new Promise((resolve, reject) => {
    const windows = process.platform === 'win32'
    const command = windows || task.node ? process.execPath : 'corepack'
    const corepack = path.join(
      path.dirname(process.execPath),
      'node_modules/corepack/dist/corepack.js',
    )
    const args = task.node ?? [...(windows ? [corepack] : []), 'pnpm', ...task.args]
    const child = spawn(command, args, {
      cwd: root,
      env: checkTaskEnvironment(task),
      stdio: 'inherit',
      windowsHide: true,
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal || code !== 0) reject(new Error(`${task.name} 失败：${signal ?? code}`))
      else resolve()
    })
  })
}

function runNodeScript(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', script), ...args], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`${script} 被信号终止：${signal}`))
      else if (code !== 0) reject(new Error(`${script} 失败，退出码 ${code}`))
      else resolve()
    })
  })
}

async function runContractCheck(consumer) {
  const state = await verifyLocalContractState(root)
  if (consumer) {
    if (consumer.get('--mode') !== state.mode) throw new Error('前端契约状态与消费检查模式不一致')
    const backendOpenapi = await readFile(consumer.get('--openapi'))
    verifyConsumerDocument(state, backendOpenapi)
    if (state.metadata.backend_repository !== consumer.get('--backend-repository')) {
      throw new Error('openapi/source.json 未指向本次后端仓库')
    }
    if (
      state.mode === 'formal' &&
      consumer.get('--require-pin') === 'true' &&
      state.metadata.backend_commit !== consumer.get('--backend-commit')
    ) {
      throw new Error('正式前端契约未锁定本次后端提交')
    }
  }
  await runNodeScript('generate-api-artifacts.mjs', ['--check'])
  console.log(`契约门禁通过（${state.mode}）`)
}

export function verifyConsumerDocument(state, backendOpenapi) {
  if (!state.bytes.equals(backendOpenapi)) throw new Error('前端 OpenAPI 与后端本次快照不一致')
}

export async function runCheck(options) {
  const tasks = checkTasks(options.stage, options)
  if (options.plan) {
    console.log(JSON.stringify({ stage: options.stage, tasks }, null, 2))
    return
  }
  const consumer = options.consumerContext ? readConsumerContext(options.consumerContext) : null
  for (const task of tasks) {
    consumer?.verifyUnchanged()
    try {
      await runTask(task, consumer)
    } finally {
      consumer?.verifyUnchanged()
    }
  }
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  Promise.resolve()
    .then(() => runCheck(parseArguments(process.argv.slice(2))))
    .catch((error) => {
      console.error(error.stack ?? error.message)
      process.exitCode = 1
    })
}
