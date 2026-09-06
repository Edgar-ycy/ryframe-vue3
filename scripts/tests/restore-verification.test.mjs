import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { sha256 } from '../restore-build.mjs'
import { evidenceFile, verifyRuntime } from '../restore-verification.mjs'

function fixture(t) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const root = mkdtempSync(path.join(local, 'restore-verification-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const backend = path.join(root, 'backend')
  const frontend = path.join(root, 'frontend')
  mkdirSync(path.join(backend, 'scripts'), { recursive: true })
  mkdirSync(frontend)
  const receipt = path.join(root, 'runtime.json')
  const bindings = path.join(root, 'bindings.json')
  const plan = {
    id: 'restore-v2',
    backup_id: 'backup-v2',
    scope_id: 'target-v2',
    fault_at: '2026-09-06T00:00:00Z',
    databases: [
      {
        source_key: 'control',
        target_key: 'control',
        server_uuid: 'server-one',
        database: 'restore_control',
      },
    ],
    object_endpoint: 'http://127.0.0.1:9000',
    object_prefix: 'target-v2/',
    api_ready_url: 'http://127.0.0.1:8080/readyz',
    worker_ready_url: 'http://127.0.0.1:9091/readyz',
    frontend_sha: 'b'.repeat(40),
  }
  const bindingValue = {
    record: {
      status: 'data_verified',
      plan_hash: sha256(Buffer.from(JSON.stringify(plan))),
      data_verified_at: '2026-09-06T00:10:00Z',
      plan,
    },
    manifest: { id: plan.backup_id, scope_id: 'source-v2', source_sha: 'a'.repeat(40) },
  }
  const bindingBytes = Buffer.from(JSON.stringify(bindingValue))
  writeFileSync(bindings, bindingBytes)
  const source = (head) => ({
    head,
    patch_sha256: 'c'.repeat(64),
    files: [],
    clean: true,
  })
  const executable = (role) => path.join(root, `${role}.exe`)
  const artifact = (role, digest) => ({
    executable: executable(role),
    command: ['cargo', 'build'],
    bytes: 1,
    sha256: digest,
  })
  const frontendFiles = [
    { path: '.vite/manifest.json', bytes: 1, sha256: '5'.repeat(64) },
    { path: 'index.html', bytes: 1, sha256: '6'.repeat(64) },
  ]
  const runtimeValue = {
    format_version: 2,
    kind: 'restore-runtime',
    restore: {
      id: plan.id,
      backup_id: plan.backup_id,
      plan_hash: bindingValue.record.plan_hash,
      scope_id: plan.scope_id,
      data_verified_at: bindingValue.record.data_verified_at,
    },
    paths: {
      backend_root: backend,
      frontend_root: frontend,
      runtime_dir: root,
      bindings,
      backend_build: path.join(root, 'backend-build.json'),
      frontend_build: path.join(root, 'frontend-build.json'),
    },
    digests: {
      bindings: sha256(bindingBytes),
      backend_build: 'd'.repeat(64),
      frontend_build: 'e'.repeat(64),
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
        api: artifact('api', '7'.repeat(64)),
        worker: artifact('worker', '8'.repeat(64)),
      },
    },
    frontend: {
      format_version: 1,
      kind: 'restore-frontend-build',
      source: source(plan.frontend_sha),
      files: frontendFiles,
    },
    processes: Object.fromEntries(
      ['api', 'worker'].map((role, index) => [
        role,
        {
          receipt_path: path.join(root, `${role}.json`),
          receipt_sha256: String(index + 1).repeat(64),
          identity: {
            pid: 101 + index,
            started: `${role}-started`,
            executable: executable(role),
          },
        },
      ]),
    ),
  }
  writeFileSync(receipt, JSON.stringify(runtimeValue))
  const authority = {
    format_version: 1,
    kind: 'restore-runtime-authority',
    restore_id: plan.id,
    backup_id: plan.backup_id,
    plan_hash: bindingValue.record.plan_hash,
    scope_id: plan.scope_id,
    data_verified_at: bindingValue.record.data_verified_at,
    backend_sha: bindingValue.manifest.source_sha,
    frontend_sha: plan.frontend_sha,
    api_endpoint: plan.api_ready_url,
    worker_endpoint: plan.worker_ready_url,
    frontend_endpoint: runtimeValue.endpoints.frontend,
  }
  return {
    input: { receipt, bindings, backend, frontend, baseURL: authority.frontend_endpoint },
    receipt,
    bindings,
    root,
    authority,
    runtimeValue,
    frontendFiles,
  }
}

function verificationOutput(value) {
  const runtimeDigest = sha256(evidenceFile(value.receipt, '收据').bytes)
  const bindingDigest = sha256(evidenceFile(value.bindings, '绑定').bytes)
  const process = (role) => {
    const identity = value.runtimeValue.processes[role].identity
    return {
      identity,
      process_receipt: {
        path: value.runtimeValue.processes[role].receipt_path,
        sha256: value.runtimeValue.processes[role].receipt_sha256,
      },
      executable: {
        path: identity.executable,
        bytes: 1,
        sha256: value.runtimeValue.backend.artifacts[role].sha256,
      },
    }
  }
  return {
    format_version: 1,
    kind: 'restore-runtime-verification',
    status: 'verified',
    runtime_receipt_sha256: runtimeDigest,
    bindings: { path: value.bindings, sha256: bindingDigest },
    build_receipts: {
      backend: {
        path: value.runtimeValue.paths.backend_build,
        sha256: value.runtimeValue.digests.backend_build,
      },
      frontend: {
        path: value.runtimeValue.paths.frontend_build,
        sha256: value.runtimeValue.digests.frontend_build,
      },
    },
    restore: value.runtimeValue.restore,
    source: value.runtimeValue.source,
    endpoints: value.runtimeValue.endpoints,
    processes: { api: process('api'), worker: process('worker') },
    api_readiness: {
      status: 'ready',
      mysql: 'up',
      redis: 'up',
      object_storage: 'not_required',
    },
    frontend: {
      build_receipt_sha256: value.runtimeValue.digests.frontend_build,
      files: value.frontendFiles,
    },
  }
}

test('核验结果必须等于实际运行收据摘要并使用明确路径', (t) => {
  const value = fixture(t)
  const expected = sha256(evidenceFile(value.receipt, '收据').bytes)
  const output = verificationOutput(value)
  let command
  const digest = verifyRuntime(value.input, (executable, argv, options) => {
    command = { executable, argv, options }
    return JSON.stringify(output)
  })
  assert.equal(digest, expected)
  assert.equal(command.argv[2], path.join(value.input.backend, 'scripts/restore_runtime.py'))
  assert.equal(command.options.timeout, 60_000)
  assert.equal(command.options.input, JSON.stringify(value.authority))
  assert.deepEqual(JSON.parse(command.options.input), value.authority)
})

test('非法恢复标识在启动 Python 核验器前失败', (t) => {
  const value = fixture(t)
  value.runtimeValue.restore.scope_id = 'scope-'
  const bindingValue = JSON.parse(evidenceFile(value.bindings, '绑定').bytes.toString('utf8'))
  bindingValue.record.plan.scope_id = 'scope-'
  bindingValue.record.plan.object_prefix = 'scope-/'
  bindingValue.record.plan_hash = sha256(Buffer.from(JSON.stringify(bindingValue.record.plan)))
  writeFileSync(value.bindings, JSON.stringify(bindingValue))
  writeFileSync(value.receipt, JSON.stringify(value.runtimeValue))
  let calls = 0
  assert.throws(() =>
    verifyRuntime(value.input, () => {
      calls++
      return '{}'
    }),
  )
  assert.equal(calls, 0)
})

test('缺失、多余、错误摘要或另一演练绑定的完整结果均拒绝', (t) => {
  for (const mutate of [
    (output) => Reflect.deleteProperty(output, 'status'),
    (output) => Object.assign(output, { warning: 'ignored' }),
    (output) => Object.assign(output, { runtime_receipt_sha256: 'a'.repeat(64) }),
    (output) =>
      Object.assign(output.bindings, {
        path: path.join(path.dirname(output.bindings.path), 'other.json'),
      }),
    (output) => Object.assign(output.bindings, { sha256: 'a'.repeat(64) }),
    (output) => Object.assign(output.restore, { scope_id: 'another.scope' }),
    (output) => Reflect.deleteProperty(output.processes, 'worker'),
    (output) => Object.assign(output.build_receipts.frontend, { sha256: 'invalid' }),
    (output) => Object.assign(output.build_receipts.backend, { sha256: '9'.repeat(64) }),
    (output) =>
      Object.assign(output.build_receipts.frontend, {
        path: path.join(
          path.dirname(output.build_receipts.frontend.path),
          'other-frontend-build.json',
        ),
      }),
    (output) => Object.assign(output.processes.api.identity, { pid: 102 }),
    (output) =>
      Object.assign(output.processes.api.process_receipt, {
        path: path.join(path.dirname(output.processes.api.process_receipt.path), 'other-api.json'),
      }),
    (output) => Object.assign(output.processes.worker.process_receipt, { sha256: '9'.repeat(64) }),
    (output) => Object.assign(output.processes.worker.executable, { sha256: '9'.repeat(64) }),
    (output) => Object.assign(output.api_readiness, { mysql: 'down' }),
    (output) => Object.assign(output.frontend, { build_receipt_sha256: 'a'.repeat(64) }),
    (output) => Object.assign(output.frontend.files[0], { sha256: '9'.repeat(64) }),
  ]) {
    const value = fixture(t)
    const output = verificationOutput(value)
    mutate(output)
    assert.throws(() => verifyRuntime(value.input, () => JSON.stringify(output)))
  }
})

test('运行收据的 bindings 路径必须对应本次读取的规范文件', (t) => {
  const value = fixture(t)
  value.runtimeValue.paths.bindings = path.join(value.root, 'other-bindings.json')
  writeFileSync(value.receipt, JSON.stringify(value.runtimeValue))
  const output = verificationOutput(value)
  assert.throws(
    () => verifyRuntime(value.input, () => JSON.stringify(output)),
    /本次核验的 bindings/u,
  )
})

test('核验期间替换任一输入收据会失败关闭', (t) => {
  for (const target of ['receipt', 'bindings']) {
    const value = fixture(t)
    const output = verificationOutput(value)
    assert.throws(
      () =>
        verifyRuntime(value.input, () => {
          writeFileSync(value[target], '{"changed":true}')
          return JSON.stringify(output)
        }),
      /输入收据发生变化/u,
    )
  }
})

test('相对路径、空文件和过大证据在执行核验前被拒绝', (t) => {
  const value = fixture(t)
  let calls = 0
  const execute = () => {
    calls++
    return JSON.stringify(verificationOutput(value))
  }
  assert.throws(
    () => verifyRuntime({ ...value.input, receipt: 'runtime.json' }, execute),
    /绝对路径/u,
  )
  writeFileSync(value.receipt, '')
  assert.throws(() => verifyRuntime(value.input, execute), /非空普通文件/u)
  assert.equal(calls, 0)
})
