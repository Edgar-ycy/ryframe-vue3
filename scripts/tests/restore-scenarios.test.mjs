import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from '../restore-build.mjs'
import { requiredScenarios } from '../restore-proof.mjs'
import { realTestSelection, restoreSpecs } from '../restore-scenarios.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function bindingFixture(t, contents) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const directory = mkdtempSync(path.join(local, 'restore-selection-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const plan = {
    id: 'restore-selection',
    backup_id: 'backup',
    scope_id: 'restore-selection',
    fault_at: '2026-01-01T00:00:00Z',
    databases: [
      {
        source_key: 'control',
        target_key: 'control',
        server_uuid: 'server-one',
        database: 'restore_control',
      },
    ],
    object_endpoint: 'http://127.0.0.1:9000',
    object_prefix: 'restore-selection/',
    api_ready_url: 'http://127.0.0.1:8080/readyz',
    worker_ready_url: 'http://127.0.0.1:9091/readyz',
    frontend_sha: 'b'.repeat(40),
  }
  const value = {
    record: {
      status: 'data_verified',
      plan_hash: sha256(Buffer.from(JSON.stringify(plan))),
      plan,
    },
    manifest: { id: 'backup', source_sha: 'c'.repeat(40) },
  }
  const file = path.join(directory, 'bindings.json')
  const bytes = Buffer.from(contents ?? JSON.stringify(value))
  writeFileSync(file, bytes)
  return { bytes, file }
}

test('普通 core 与 Device 保留所有故障验收，不加载恢复专属旧数据场景', () => {
  for (const fixture of ['core', 'device'])
    assert.deepEqual(realTestSelection(undefined, fixture, '不存在的目录'), {
      selection: { testIgnore: ['**/restore-existing.spec.ts'] },
      reporter: undefined,
    })
})

test('恢复选择只引用当前完整文件并绑定预检收据', (t) => {
  const binding = bindingFixture(t)
  const result = realTestSelection(binding.file, 'core', root)
  assert.deepEqual(result.selection, { testMatch: restoreSpecs })
  assert.deepEqual(result.reporter, {
    bindingPath: binding.file,
    bindingSha256: sha256(binding.bytes),
  })
  assert.equal(result.selection.testMatch.includes('**/restore-existing.spec.ts'), true)
  assert.equal(result.selection.testMatch.includes('**/session-races.spec.ts'), false)
  result.selection.testMatch.pop()
  assert.equal(restoreSpecs.length, 5)
  assert.deepEqual(requiredScenarios, [
    'login',
    'session',
    'post',
    'notice',
    'tenant',
    'export',
    'message',
    'schedule',
    'restored-data',
  ])
})

test('恢复绑定、fixture 与场景来源在配置副作用前失败关闭', (t) => {
  const binding = bindingFixture(t)
  assert.throws(() => realTestSelection(binding.file, 'device', root), /core/u)
  assert.throws(() => realTestSelection('   ', 'core', root), /只包含空白/u)
  assert.throws(() => realTestSelection('bindings.json', 'core', root), /绝对路径/u)
  assert.throws(() => realTestSelection(` ${binding.file}`, 'core', root), /首尾空白/u)
  const invalid = bindingFixture(t, '{invalid')
  assert.throws(() => realTestSelection(invalid.file, 'core', root), /JSON/u)
  const missingRoot = path.dirname(bindingFixture(t).file)
  assert.throws(() => realTestSelection(binding.file, 'core', missingRoot), /场景不存在/u)
})

test('真实浏览器配置先完成恢复选择，再创建目录与控制端点', async () => {
  const source = await readFile(path.join(root, 'playwright.real.config.ts'), 'utf8')
  const selection = source.indexOf('const restore = realTestSelection(')
  const report = source.indexOf('const reportDirectory =')
  const directory = source.indexOf('mkdirSync(directory')
  const control = source.indexOf('const controlId =')
  assert.ok(selection >= 0 && selection < report && report < directory && directory < control)
  assert.match(source, /if \(restore\.reporter\)[\s\S]+restore-reporter\.mjs/u)
  assert.match(source, /actionTimeout: 15_000/u)
  assert.match(source, /navigationTimeout: 30_000/u)
})
