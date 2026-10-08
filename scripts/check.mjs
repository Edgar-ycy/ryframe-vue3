import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import console from 'node:console'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { verifyLocalContractState } from './api-contract-state.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parseArguments(argv) {
  let stage = 'contract'
  let full = false
  let explicitStage = false
  let plan = false
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
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
  return { full, stage: selected, plan }
}

export function checkTasks(stage) {
  const tasks = {
    contract: [{ name: 'contract' }],
    static: [
      { name: 'import-boundaries', node: ['scripts/check-import-boundaries.mjs'] },
      { name: 'workflows', node: ['scripts/check-workflows.mjs'] },
      { name: 'eslint', args: ['exec', 'eslint', '.', '--max-warnings', '0'] },
      { name: 'prettier', args: ['exec', 'prettier', '--check', '.'] },
      { name: 'stylelint', args: ['exec', 'stylelint', 'src/**/*.{vue,scss}'] },
    ],
    unit: [
      { name: 'script-tests', node: ['--test', 'scripts/tests/*.test.mjs'] },
      { name: 'test-types', args: ['exec', 'vue-tsc', '-p', 'tsconfig.test.json'] },
      { name: 'unit-coverage', args: ['exec', 'vitest', 'run', '--coverage'] },
    ],
    build: [
      { name: 'production-build', args: ['build'] },
      { name: 'bundle-budget', node: ['scripts/check-bundle-budget.mjs'] },
    ],
    browser: [{ name: 'browser-smoke', args: ['exec', 'playwright', 'test'] }],
  }
  if (stage === 'full') return ['contract', 'static', 'unit', 'build'].flatMap(checkTasks)
  if (!tasks[stage]) throw new Error(`未知检查阶段：${stage}`)
  return tasks[stage]
}

function runTask(task) {
  if (task.name === 'contract') return runContractCheck()
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
      env: process.env,
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

function consumerArguments() {
  const raw = process.env.RYFRAME_CONSUMER_CONTRACT
  if (!raw) return null
  let values
  try {
    values = JSON.parse(raw)
  } catch {
    throw new Error('RYFRAME_CONSUMER_CONTRACT 不是合法 JSON')
  }
  if (!Array.isArray(values) || values.length % 2 !== 0) {
    throw new Error('消费契约上下文必须是键值参数数组')
  }
  const result = new Map()
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]
    const value = values[index + 1]
    if (typeof key !== 'string' || !key.startsWith('--') || typeof value !== 'string') {
      throw new Error('消费契约上下文参数无效')
    }
    if (result.has(key)) throw new Error(`消费契约上下文重复参数：${key}`)
    result.set(key, value)
  }
  const required = [
    '--mode',
    '--openapi',
    '--backend-commit',
    '--backend-repository',
    '--require-pin',
  ]
  if (required.some((key) => !result.has(key))) throw new Error('消费契约上下文缺少必需参数')
  return result
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

async function runContractCheck() {
  const state = await verifyLocalContractState(root)
  const consumer = consumerArguments()
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

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const tasks = checkTasks(options.stage)
  if (options.plan) {
    console.log(JSON.stringify({ stage: options.stage, tasks }, null, 2))
    return
  }
  for (const task of tasks) await runTask(task)
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  main().catch((error) => {
    console.error(error.stack ?? error.message)
    process.exitCode = 1
  })
}
