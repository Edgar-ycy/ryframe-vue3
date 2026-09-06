import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import RestoreReporter from '../restore-reporter.mjs'
import { sha256 } from '../restore-build.mjs'
import { requiredScenarios } from '../restore-proof.mjs'

function fixture(t, verify, expectedDigest) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  mkdirSync(path.resolve('.local-tests/playwright-real'), { recursive: true })
  const directory = mkdtempSync(path.join(local, 'restore-reporter-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const id = `proof-${randomUUID()}`
  const plan = {
    id,
    backup_id: 'backup',
    scope_id: 'restore-unit',
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
    object_prefix: 'restore-unit/',
    api_ready_url: 'http://127.0.0.1:8080/readyz',
    worker_ready_url: 'http://127.0.0.1:9091/readyz',
    frontend_sha: 'b'.repeat(40),
  }
  const bindings = path.join(directory, 'bindings.json')
  const runtime = path.join(directory, 'runtime.json')
  const bindingValue = {
    record: {
      status: 'data_verified',
      data_verified_at: new Date(Date.now() - 1000).toISOString(),
      plan_hash: sha256(Buffer.from(JSON.stringify(plan))),
      plan,
    },
    manifest: { id: 'backup', scope_id: 'source-unit', source_sha: 'c'.repeat(40) },
  }
  const bindingBytes = Buffer.from(JSON.stringify(bindingValue))
  writeFileSync(bindings, bindingBytes)
  const source = (head) => ({
    head,
    patch_sha256: 'd'.repeat(64),
    files: [],
    clean: true,
  })
  const artifact = (role, digest) => ({
    executable: path.join(directory, `${role}.exe`),
    command: ['cargo', 'build'],
    bytes: 1,
    sha256: digest,
  })
  const runtimeValue = {
    format_version: 2,
    kind: 'restore-runtime',
    restore: {
      id,
      backup_id: plan.backup_id,
      plan_hash: bindingValue.record.plan_hash,
      scope_id: plan.scope_id,
      data_verified_at: bindingValue.record.data_verified_at,
    },
    paths: {
      backend_root: directory,
      frontend_root: directory,
      runtime_dir: directory,
      bindings,
      backend_build: path.join(directory, 'backend-build.json'),
      frontend_build: path.join(directory, 'frontend-build.json'),
    },
    digests: {
      bindings: sha256(bindingBytes),
      backend_build: 'e'.repeat(64),
      frontend_build: 'f'.repeat(64),
    },
    source: { backend_sha: bindingValue.manifest.source_sha, frontend_sha: plan.frontend_sha },
    endpoints: {
      api: plan.api_ready_url,
      worker: plan.worker_ready_url,
      frontend: 'http://127.0.0.1:4174',
    },
    backend: {
      format_version: 1,
      kind: 'restore-backend-build',
      source: source(bindingValue.manifest.source_sha),
      source_inventory: {},
      artifacts: {
        api: artifact('api', '3'.repeat(64)),
        worker: artifact('worker', '4'.repeat(64)),
      },
    },
    frontend: {
      format_version: 1,
      kind: 'restore-frontend-build',
      source: source(plan.frontend_sha),
      files: [{ path: 'index.html', bytes: 1, sha256: '5'.repeat(64) }],
    },
    processes: {
      api: {
        receipt_path: path.join(directory, 'api.json'),
        receipt_sha256: '1'.repeat(64),
        identity: { pid: 101, started: 'api-started', executable: path.join(directory, 'api.exe') },
      },
      worker: {
        receipt_path: path.join(directory, 'worker.json'),
        receipt_sha256: '2'.repeat(64),
        identity: {
          pid: 102,
          started: 'worker-started',
          executable: path.join(directory, 'worker.exe'),
        },
      },
    },
  }
  writeFileSync(runtime, JSON.stringify(runtimeValue))
  const environment = {
    RYFRAME_RESTORE_BINDINGS: bindings,
    RYFRAME_RESTORE_RUNTIME_RECEIPT: runtime,
    RYFRAME_RESTORE_BACKEND_DIR: directory,
    RYFRAME_E2E_SCOPE_ID: 'restore-unit',
  }
  for (const [key, value] of Object.entries(environment)) {
    const previous = process.env[key]
    process.env[key] = value
    t.after(() => {
      if (previous === undefined) delete process.env[key]
      else process.env[key] = previous
    })
  }
  const output = path.resolve(`.local-tests/playwright-real/restore-${id}.json`)
  for (const suffix of ['', '-runtime', '-tests'])
    t.after(() =>
      rmSync(path.resolve(`.local-tests/playwright-real/restore-${id}${suffix}.json`), {
        force: true,
      }),
    )
  const digest = sha256(readFileSync(runtime))
  const reporter = new RestoreReporter({
    checkout: (root) => root,
    verify: () => verify(digest),
    expectedBinding: {
      bindingPath: bindings,
      bindingSha256: expectedDigest ?? sha256(bindingBytes),
    },
  })
  reporter.onBegin({ projects: [{ use: { baseURL: 'http://127.0.0.1:4174' } }] })
  reporter.onTestEnd(
    {
      titlePath: () => ['fixture'],
      annotations: requiredScenarios.map((description) => ({
        type: 'restore-scenario',
        description,
      })),
    },
    { status: 'passed', retry: 0 },
  )
  return { reporter, runtime, bindings, output, digest }
}

test('全部测试完成后重新核验来源，并保存与证明摘要对应的运行收据', (t) => {
  let calls = 0
  const item = fixture(t, (digest) => {
    calls++
    return digest
  })
  assert.equal(calls, 1)
  assert.equal(item.reporter.onEnd({ status: 'passed' }), undefined)
  assert.equal(calls, 2)
  const proof = JSON.parse(readFileSync(item.output))
  assert.equal(proof.runtime_receipt_sha256, item.digest)
  assert.equal(sha256(readFileSync(item.output.replace('.json', '-runtime.json'))), item.digest)
})

test('测试结束时进程或源码核验失败不会写成功证明', (t) => {
  let calls = 0
  const item = fixture(t, (digest) => {
    if (++calls > 1) throw new Error('process changed')
    return digest
  })
  t.mock.method(console, 'error', () => {})
  assert.deepEqual(item.reporter.onEnd({ status: 'passed' }), { status: 'failed' })
  assert.equal(existsSync(item.output), false)
})

test('测试中替换运行收据或演练绑定文件会拒绝成功证明', (t) => {
  t.mock.method(console, 'error', () => {})
  for (const file of ['runtime', 'bindings']) {
    const item = fixture(t, (digest) => digest)
    writeFileSync(item[file], '{}')
    assert.deepEqual(item.reporter.onEnd({ status: 'passed' }), { status: 'failed' })
    assert.equal(existsSync(item.output), false)
  }
})

test('任一证明输出已存在时不会留下其他部分收据', (t) => {
  const item = fixture(t, (digest) => digest)
  const testsOutput = item.output.replace('.json', '-tests.json')
  writeFileSync(testsOutput, 'existing')
  t.mock.method(console, 'error', () => {})
  assert.deepEqual(item.reporter.onEnd({ status: 'passed' }), { status: 'failed' })
  assert.equal(existsSync(item.output), false)
  assert.equal(existsSync(item.output.replace('.json', '-runtime.json')), false)
  assert.equal(readFileSync(testsOutput, 'utf8'), 'existing')
})

test('恢复输入必须使用绝对普通文件且 scope 必须精确匹配', (t) => {
  const item = fixture(t, (digest) => digest)
  process.env.RYFRAME_RESTORE_BINDINGS = 'bindings.json'
  assert.throws(
    () => item.reporter.onBegin({ projects: [{ use: { baseURL: 'http://127.0.0.1:4174' } }] }),
    /绝对路径/u,
  )
  process.env.RYFRAME_RESTORE_BINDINGS = item.bindings
  process.env.RYFRAME_E2E_SCOPE_ID = 'other'
  assert.throws(
    () => item.reporter.onBegin({ projects: [{ use: { baseURL: 'http://127.0.0.1:4174' } }] }),
    /scope/u,
  )
})

test('reporter 拒绝与配置预检不一致的恢复绑定', (t) => {
  assert.throws(() => fixture(t, (digest) => digest, '0'.repeat(64)), /预检结果/u)
})
