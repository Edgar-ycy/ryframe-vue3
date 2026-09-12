import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { sha256 } from '../build-source-inventory.mjs'
import { restoreRuntimeBinding } from '../restore-runtime-receipt.mjs'
import { evidenceFile, verifiedCheckout, verifyRuntime } from '../restore-verification.mjs'
import { jsonBytes, restoreRuntimeFixture } from './build-receipt-fixture.mjs'

function fixture(t, options = {}) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const root = mkdtempSync(path.join(local, 'restore-verification-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const value = restoreRuntimeFixture({ directory: root, ...options })
  const coordinator = path.join(root, 'coordinator')
  for (const directory of [
    coordinator,
    value.paths.backendProductRoot,
    value.paths.backendExecutionRoot,
    value.paths.frontendRoot,
  ])
    mkdirSync(directory, { recursive: true })
  mkdirSync(path.join(coordinator, 'scripts'))
  const receipt = path.join(root, 'runtime.json')
  const targetPlanPath = path.join(root, 'target-plan.json')
  const python = path.join(root, '工具 目录', 'python.exe')
  writeFileSync(value.paths.bindings, value.bindingsBytes)
  writeFileSync(receipt, value.runtimeBytes)
  writeFileSync(targetPlanPath, value.targetPlanBytes)
  const expected = restoreRuntimeBinding({
    record: value.binding.record,
    manifest: value.binding.manifest,
    targetPlanBytes: value.targetPlanBytes,
    frontendEndpoint: value.runtime.endpoints.frontend,
  })
  return {
    ...value,
    coordinator,
    expected,
    input: {
      receipt,
      bindings: value.paths.bindings,
      targetPlan: targetPlanPath,
      backend: coordinator,
      frontend: value.paths.frontendRoot,
      baseURL: value.runtime.endpoints.frontend,
      python,
    },
    receipt,
    root,
    targetPlanPath,
  }
}

function verificationOutput(value) {
  const runtimeDigest = sha256(evidenceFile(value.receipt, '收据').bytes)
  const bindingDigest = sha256(evidenceFile(value.paths.bindings, '绑定').bytes)
  const process = (role) => {
    const identity = value.runtime.processes[role].identity
    const artifact = value.runtime.backend.artifacts[role]
    return {
      identity,
      process_receipt: {
        path: value.runtime.processes[role].receipt_path,
        sha256: value.runtime.processes[role].receipt_sha256,
      },
      executable: {
        path: identity.executable,
        bytes: artifact?.bytes ?? 10,
        sha256: artifact?.sha256 ?? '9'.repeat(64),
      },
    }
  }
  return {
    format_version: 1,
    kind: 'restore-runtime-verification',
    status: 'verified',
    runtime_receipt_sha256: runtimeDigest,
    bindings: { path: value.paths.bindings, sha256: bindingDigest },
    build_receipts: {
      backend: {
        path: value.runtime.paths.backend_build,
        sha256: value.runtime.digests.backend_build,
      },
      frontend: {
        path: value.runtime.paths.frontend_build,
        sha256: value.runtime.digests.frontend_build,
      },
      launch: {
        path: value.runtime.paths.launch,
        sha256: value.runtime.digests.launch,
      },
    },
    restore: value.runtime.restore,
    source: value.runtime.source,
    endpoints: value.runtime.endpoints,
    processes: {
      api: process('api'),
      worker: process('worker'),
      frontend: process('frontend'),
    },
    api_readiness: {
      status: 'ready',
      mysql: 'up',
      redis: 'up',
      object_storage: 'not_required',
    },
    frontend: {
      build_receipt_sha256: value.runtime.digests.frontend_build,
      files: value.frontendFiles,
    },
  }
}

test('候选核验使用 v2 权威、v3 收据和明确的三类源码路径', (t) => {
  const value = fixture(t)
  const expectedDigest = sha256(evidenceFile(value.receipt, '收据').bytes)
  let command
  const inherited = {
    PATH: 'fixed-path',
    RYFRAME_DEVEX_TARGET_ROOT: path.join(value.root, '错误 target'),
    RYFRAME_RESTORE_RUNTIME_RECEIPT: value.receipt,
    RYFRAME_RESTORE_RUNTIME_PROTOCOL: 'untrusted runtime protocol',
    RYFRAME_RESTORE_RUNTIME_UNKNOWN: 'untrusted runtime value',
    RYFRAME_RESTORE_SOURCE_PROTOCOL: 'untrusted source protocol',
    RYFRAME_WORKSPACE_ROOT: path.join(value.root, '错误 workspace'),
  }
  const digest = verifyRuntime(
    value.input,
    (executable, argv, options) => {
      command = { executable, argv, options }
      return `Compiling xtask\n${JSON.stringify(verificationOutput(value))}\n✓ 0.1s\n`
    },
    inherited,
  )
  assert.equal(digest, expectedDigest)
  assert.equal(command.executable, 'cargo')
  assert.deepEqual(command.argv, [
    'xtask',
    'check',
    'recovery',
    'runtime',
    'verify',
    '--source-backend',
    value.paths.backendExecutionRoot,
    '--source-frontend',
    value.paths.frontendRoot,
    '--receipt',
    value.receipt,
    '--bindings',
    value.paths.bindings,
  ])
  assert.equal(command.options.cwd, value.coordinator)
  assert.equal(command.options.timeout, 60_000)
  assert.deepEqual(JSON.parse(command.options.input), value.expected.authority)
  assert.equal(command.options.env.PATH, 'fixed-path')
  assert.equal(command.options.env.RYFRAME_PYTHON, value.input.python)
  assert.equal(command.options.env.RYFRAME_WORKSPACE_ROOT, value.coordinator)
  assert.equal(command.options.env.PYTHONUTF8, '1')
  assert.equal(command.options.env.PYTHONIOENCODING, 'utf-8')
  assert.equal(command.options.env.RYFRAME_DEVEX_TARGET_ROOT, undefined)
  assert.equal(command.options.env.RYFRAME_RESTORE_RUNTIME_RECEIPT, undefined)
  assert.equal(command.options.env.RYFRAME_RESTORE_RUNTIME_PROTOCOL, undefined)
  assert.equal(command.options.env.RYFRAME_RESTORE_RUNTIME_UNKNOWN, undefined)
  assert.equal(command.options.env.RYFRAME_RESTORE_SOURCE_PROTOCOL, undefined)
  assert.equal(
    command.argv.some((item) => item.endsWith('.py')),
    false,
  )
  assert.equal(command.argv.includes('--backend-dir'), false)
  assert.equal(command.argv.includes('--frontend-dir'), false)
  assert.equal(command.argv.includes('--frontend-url'), false)
})

test('B0 适配核验保持备份、产品、执行和前端四类身份互不混用', (t) => {
  const value = fixture(t, {
    backupSourceSha: 'a'.repeat(40),
    backendProductSha: 'b'.repeat(40),
    backendExecutionSha: 'c'.repeat(40),
    frontendSha: 'd'.repeat(40),
  })
  let command
  verifyRuntime(value.input, (_executable, argv, options) => {
    command = { argv, authority: JSON.parse(options.input) }
    return JSON.stringify(verificationOutput(value))
  })
  assert.deepEqual(
    {
      backup: command.authority.backup_source_sha,
      product: command.authority.backend_product_sha,
      execution: command.authority.backend_execution_sha,
      frontend: command.authority.frontend_sha,
    },
    {
      backup: 'a'.repeat(40),
      product: 'b'.repeat(40),
      execution: 'c'.repeat(40),
      frontend: 'd'.repeat(40),
    },
  )
  assert.deepEqual(command.argv.slice(-4), [
    '--adapter-contract',
    'legacy-stable-readiness-b0-v1',
    '--product-backend',
    value.paths.backendProductRoot,
  ])
})

test('非法运行收据和伪造目标计划在启动 Python 核验器前失败', (t) => {
  for (const mutate of [
    (value) => {
      value.runtime.restore.scope_id = 'scope-'
      writeFileSync(value.receipt, jsonBytes(value.runtime))
    },
    (value) => {
      value.targetPlan.product_execution.backend_execution_sha = '9'.repeat(40)
      writeFileSync(value.targetPlanPath, jsonBytes(value.targetPlan))
    },
    (value) => {
      value.targetPlan.product_plan.frontend_sha = '9'.repeat(40)
      writeFileSync(value.targetPlanPath, jsonBytes(value.targetPlan))
    },
  ]) {
    const value = fixture(t)
    mutate(value)
    let calls = 0
    assert.throws(() =>
      verifyRuntime(value.input, () => {
        calls++
        return '{}'
      }),
    )
    assert.equal(calls, 0)
  }
})

test('缺失、多余、错误摘要或另一演练绑定的完整结果均拒绝', (t) => {
  for (const mutate of [
    (output) => Reflect.deleteProperty(output, 'status'),
    (output) => Object.assign(output, { warning: 'ignored' }),
    (output) => Object.assign(output, { runtime_receipt_sha256: 'a'.repeat(64) }),
    (output) => Object.assign(output.restore, { scope_id: 'another.scope' }),
    (output) => Reflect.deleteProperty(output.processes, 'frontend'),
    (output) => Object.assign(output.build_receipts.launch, { sha256: '9'.repeat(64) }),
    (output) => Object.assign(output.processes.api.identity, { pid: 102 }),
    (output) => Object.assign(output.processes.frontend.executable, { sha256: 'invalid' }),
    (output) => Object.assign(output.api_readiness, { mysql: 'down' }),
    (output) => Object.assign(output.frontend.files[0], { sha256: '9'.repeat(64) }),
  ]) {
    const value = fixture(t)
    const output = verificationOutput(value)
    mutate(output)
    assert.throws(() => verifyRuntime(value.input, () => JSON.stringify(output)))
  }
})

test('运行收据的 bindings 和三类源码路径必须对应本次目标计划', (t) => {
  for (const mutate of [
    (value) => {
      value.runtime.paths.bindings = path.join(value.root, 'other-bindings.json')
    },
    (value) => {
      value.runtime.paths.backend_product_root = value.paths.backendExecutionRoot
    },
    (value) => {
      value.runtime.paths.frontend_root = value.root
    },
  ]) {
    const value = fixture(t, {
      backendProductSha: 'b'.repeat(40),
      backendExecutionSha: 'c'.repeat(40),
    })
    mutate(value)
    writeFileSync(value.receipt, jsonBytes(value.runtime))
    assert.throws(() => verifyRuntime(value.input, () => JSON.stringify(verificationOutput(value))))
  }
})

test('核验期间替换任一输入证据会失败关闭', (t) => {
  for (const target of ['receipt', 'bindings', 'targetPlan']) {
    const value = fixture(t)
    const output = verificationOutput(value)
    assert.throws(
      () =>
        verifyRuntime(value.input, () => {
          writeFileSync(value.input[target], '{"changed":true}')
          return JSON.stringify(output)
        }),
      /输入收据发生变化/u,
    )
  }
})

test('相对路径、空文件和缺失目标计划在执行核验前被拒绝', (t) => {
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
  writeFileSync(value.targetPlanPath, '')
  assert.throws(() => verifyRuntime(value.input, execute), /非空普通文件/u)
  assert.equal(calls, 0)
})

test('runner 源码只接受显式 SHA 的干净仓库根', (t) => {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const root = mkdtempSync(path.join(local, 'restore-runner-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const head = 'a'.repeat(40)
  let dirty = ''
  const execute = (_executable, argv) => {
    const operation = argv.slice(2).join(' ')
    if (operation === 'rev-parse --show-toplevel') return root
    if (operation === 'rev-parse HEAD') return head
    if (operation === 'status --porcelain --untracked-files=all') return dirty
    throw new Error(`未预期 Git 调用：${operation}`)
  }
  assert.equal(verifiedCheckout(root, head, '恢复测试 runner 源码', execute), root)
  assert.throws(
    () => verifiedCheckout(root, '0'.repeat(40), '恢复测试 runner 源码', execute),
    /预期 SHA/u,
  )
  dirty = ' M runner.txt'
  assert.throws(() => verifiedCheckout(root, head, '恢复测试 runner 源码', execute), /干净/u)
})
