import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import promises from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { canonicalJson, sha256 } from '../api-contract-state.mjs'
import { parseArguments, runCheck } from '../check.mjs'
import { consumerFixture } from './consumer-context-fixture.mjs'

function contractState() {
  const document = JSON.parse(
    fs.readFileSync(new URL('../../openapi/openapi.json', import.meta.url)),
  )
  const bytes = Buffer.from(canonicalJson(document))
  const metadata = {
    schema_version: 1,
    backend_repository: 'example/backend',
    backend_commit: 'a'.repeat(40),
    openapi_path: 'openapi/openapi.json',
    openapi_version: document.openapi,
    sha256: sha256(bytes),
  }
  return { bytes, metadata, mode: 'formal' }
}

function interceptTasks(t, mutate = () => {}) {
  const state = contractState()
  const originalRead = promises.readFile
  t.mock.method(promises, 'readFile', (file, ...args) => {
    if (file === path.join(process.cwd(), 'openapi/source.json')) {
      return Promise.resolve(Buffer.from(canonicalJson(state.metadata)))
    }
    if (file === path.join(process.cwd(), 'openapi/openapi.json'))
      return Promise.resolve(state.bytes)
    if (file === path.join(process.cwd(), 'openapi/candidate.json')) {
      return Promise.reject(Object.assign(new Error('夹具无候选标记'), { code: 'ENOENT' }))
    }
    return originalRead(file, ...args)
  })
  const calls = []
  t.mock.method(childProcess, 'spawn', (program, args, options) => {
    calls.push({ program, args, options })
    const child = new EventEmitter()
    queueMicrotask(() => {
      try {
        mutate(calls.length)
        child.emit('exit', 0, null)
      } catch (error) {
        child.emit('error', error)
      }
    })
    return child
  })
  syncBuiltinESMExports()
  t.after(() => {
    t.mock.restoreAll()
    syncBuiltinESMExports()
  })
  return calls
}

async function context(t) {
  const value = consumerFixture(t)
  const state = contractState()
  value.value.frontend_root = process.cwd()
  fs.writeFileSync(value.value.arguments[3], state.bytes)
  value.value.arguments[1] = state.mode
  value.value.arguments[5] = state.metadata.backend_commit
  value.value.arguments[7] = state.metadata.backend_repository
  value.save()
  return value
}

test('编排先校验内存来源夹具，再派生显式证明入口；拦截子进程，不执行原生工具', async (t) => {
  const value = await context(t)
  const calls = interceptTasks(t)
  await runCheck(parseArguments(['--consumer-context', value.file]))
  assert.equal(calls.length, 2)
  assert.ok(calls[0].args[0].endsWith('generate-api-artifacts.ts'))
  assert.deepEqual(calls[0].args.slice(1), ['--check'])
  assert.deepEqual(calls[1].args, [
    'scripts/contract-tests/frontend-native-receipt.mjs',
    '--consumer-context',
    value.file,
  ])
  assert.equal(calls[1].program, process.execPath)
  assert.equal(calls[1].options.cwd, process.cwd())
})

for (const target of ['context', 'binding', 'configuration']) {
  test(`contract 执行期间 ${target} 漂移后拒绝 consumer-proof，不把派生成功当成验收`, async (t) => {
    const value = await context(t)
    const file = {
      context: value.file,
      binding: value.binding,
      configuration: path.join(value.backend, 'config/tools.toml'),
    }[target]
    const calls = interceptTasks(t, () => fs.appendFileSync(file, ' '))
    await assert.rejects(runCheck(parseArguments(['--consumer-context', value.file])), /漂移/u)
    assert.equal(calls.length, 1)
  })
}

test('proof 运行后再核验绑定，缺失来源绑定在派生任何任务之前失败', async (t) => {
  const value = await context(t)
  const calls = interceptTasks(t, (count) => {
    if (count === 2) fs.rmSync(value.binding)
  })
  await assert.rejects(runCheck(parseArguments(['--consumer-context', value.file])))
  assert.equal(calls.length, 2)
  calls.length = 0
  await assert.rejects(runCheck(parseArguments(['--consumer-context', value.file])))
  assert.equal(calls.length, 0)
})

test('无 ctx 的 unit/contract/full 独立编排，不消费旧环境 JSON 或派生证明', async (t) => {
  const original = process.env.RYFRAME_CONSUMER_CONTRACT
  process.env.RYFRAME_CONSUMER_CONTRACT = 'invalid-private-json'
  t.after(() => {
    if (original === undefined) delete process.env.RYFRAME_CONSUMER_CONTRACT
    else process.env.RYFRAME_CONSUMER_CONTRACT = original
  })
  const calls = interceptTasks(t)
  for (const args of [['--stage', 'unit'], ['--stage', 'contract'], ['--full']]) {
    await runCheck(parseArguments(args))
  }
  assert.ok(calls.length > 3)
  assert.ok(
    !calls.some((call) => call.args.some((arg) => arg.includes('frontend-native-receipt.mjs'))),
  )
})
