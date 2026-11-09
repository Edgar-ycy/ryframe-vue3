import { toolProcessEnvironment } from '../tool-inputs.mjs'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  datasetDigest,
  restoreDatasetAuthority,
  restoreDatasetEvidence,
  verifyRestoreDatasetAuthority,
  verifyRestoredDataset,
} from '../restore-dataset.mjs'
import { evidenceFile } from '../restore-verification.mjs'
import { fixture } from './restore-dataset-fixture.mjs'

test('正式 Cargo 只读预检绑定当前输入并返回递归冻结的权威', () => {
  const item = fixture()
  assert.deepEqual(restoreDatasetAuthority(item.authority), item.authority)
  const result = verifyRestoreDatasetAuthority(item.input, { execute: item.execute })
  assert.deepEqual(result.authority, item.authority)
  assert.deepEqual(result.lineage, item.lineage)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.authority.target), true)
  assert.equal(Object.isFrozen(result.lineage.scale), true)
  assert.throws(() => {
    result.lineage.scale.post_samples = 1
  }, TypeError)
  assert.equal(item.calls.length, 1)
  const [call] = item.calls
  assert.equal(call.program, 'cargo')
  assert.deepEqual(call.args, ['xtask', '__source-evidence'])
  assert.equal(call.settings.cwd, item.verifierRoot)
  assert.deepEqual(JSON.parse(call.settings.input), {
    operation: 'restore-dataset-authority',
    arguments: {
      backend_dir: item.verifierRoot,
      runtime_receipt: item.input.runtimeReceipt,
      target_plan: item.input.targetPlan,
    },
    write: false,
  })
  assert.deepEqual(call.settings.env, toolProcessEnvironment())
})

test('伪造链由后端失败关闭且不会产生可供登录使用的权威', () => {
  const item = fixture({ failure: 'forged chain' })
  assert.throws(
    () => verifyRestoreDatasetAuthority(item.input, { execute: item.execute }),
    /只读预检失败/u,
  )
  assert.equal(item.calls.length, 1)
})

test('worker 只消费配置冻结权威，不重读可替换的 target plan', () => {
  const item = fixture()
  writeFileSync(item.input.targetPlan, '{replaced')
  const restored = restoreDatasetEvidence(item.authority)
  assert.deepEqual(restored.authority, item.authority)
  assert.deepEqual(restored.lineage, item.lineage)
  writeFileSync(item.authority.dataset_lineage.path, '{}')
  assert.throws(() => restoreDatasetEvidence(item.authority), /登记摘要/u)
})

test('输出必须精确绑定当前 runtime、target、目标与配置阶段权威', () => {
  const mutations = [
    (value) => (value.unknown = true),
    (value) => (value.runtime.sha256 = '0'.repeat(64)),
    (value) => (value.target_plan.path = path.resolve('other.json')),
    (value) => (value.target.scope_id = 'other-scope'),
    (value) => (value.execution_backend = path.resolve('other-backend')),
  ]
  for (const mutate of mutations) {
    const item = fixture()
    const changed = structuredClone(item.authority)
    mutate(changed)
    assert.throws(
      () =>
        verifyRestoreDatasetAuthority(item.input, {
          execute: () => JSON.stringify({ ok: true, result: { value: changed } }),
        }),
      /权威|不一致/u,
    )
  }
  const item = fixture()
  const expected = structuredClone(item.authority)
  expected.source_generation.sha256 = '1'.repeat(64)
  assert.throws(
    () =>
      verifyRestoreDatasetAuthority(item.input, {
        expected,
        execute: item.execute,
      }),
    /冻结结果/u,
  )
})

test('证据拒绝 canonical 路径不符和同文件同长度改写', () => {
  const alias = fixture()
  const aliasRead = (filename, label) => {
    const file = evidenceFile(filename, label)
    if (label === '来源 STOP 代次') return { ...file, path: path.join(alias.directory, 'other') }
    return file
  }
  assert.throws(
    () => verifyRestoreDatasetAuthority(alias.input, { execute: alias.execute, read: aliasRead }),
    /路径不一致/u,
  )

  const changed = fixture()
  let reads = 0
  const changingRead = (filename, label) => {
    if (label === 'C52 派生数据血缘' && ++reads === 2) {
      const before = readFileSync(filename)
      writeFileSync(filename, Buffer.from(' '.repeat(before.byteLength)))
    }
    return evidenceFile(filename, label)
  }
  assert.throws(
    () =>
      verifyRestoreDatasetAuthority(changed.input, {
        execute: changed.execute,
        read: changingRead,
      }),
    /读取期间发生变化/u,
  )
})

test('错误或不完整的原生封装不能作为数据权威且不重试', () => {
  const item = fixture()
  for (const output of [
    item.authority,
    {
      ok: false,
      error: {
        category: 'SourceEvidenceRejected',
        message: 'rejected',
        remote_write_may_have_occurred: false,
        automatic_retry_permitted: false,
      },
    },
    { ok: true, result: item.authority },
    { ok: true, result: { value: item.authority, unknown: true } },
    { ok: true, result: { value: item.authority }, unknown: true },
  ]) {
    let calls = 0
    assert.throws(
      () =>
        verifyRestoreDatasetAuthority(item.input, {
          execute: () => {
            calls++
            return JSON.stringify(output)
          },
        }),
      /只读预检失败/u,
    )
    assert.equal(calls, 1)
  }
})

test('原生调用错误保留原始原因；调用期间输入漂移不能接受成功', () => {
  const item = fixture()
  const failure = new Error('native rejected')
  assert.throws(
    () =>
      verifyRestoreDatasetAuthority(item.input, {
        execute: () => {
          throw failure
        },
      }),
    (error) => error.cause === failure,
  )
  for (const filename of [item.input.runtimeReceipt, item.input.targetPlan]) {
    const before = readFileSync(filename)
    try {
      assert.throws(
        () =>
          verifyRestoreDatasetAuthority(item.input, {
            execute: (...args) => {
              const output = item.execute(...args)
              writeFileSync(filename, Buffer.from(' '.repeat(before.byteLength)))
              return output
            },
          }),
        /预检期间.*发生变化/u,
      )
    } finally {
      writeFileSync(filename, before)
    }
  }
})

function existingReceipt(item) {
  return {
    format_version: 1,
    kind: 'restore-target-existing-verification',
    status: 'target_existing_data_verified',
    scope_id: item.authority.target.scope_id,
    source_scope_id: item.lineage.scopes.origin_tenant_scope_id,
    actions: { business: 'read_only', objects: 'read_only', session: 'login_logout' },
    restore_success: false,
    tenants: 11,
    posts: 33,
    files: 256,
  }
}

const verifierSha = 'f'.repeat(40)
const acceptCheckout = (directory) => directory

function existingInput(item, authority = restoreDatasetEvidence(item.authority)) {
  return { authority, verifierRoot: item.verifierRoot, verifierSha }
}

test('恢复已有数据仅调用一次 Cargo，并将冻结权威完整交给登记协调器', () => {
  const item = fixture()
  const verified = restoreDatasetEvidence(item.authority)
  const receipt = existingReceipt(item)
  const checkouts = []
  let calls = 0
  const result = verifyRestoredDataset(existingInput(item, verified), {
    checkout: (...args) => {
      checkouts.push(args)
      return item.verifierRoot
    },
    execute: (program, args, options) => {
      calls++
      assert.equal(program, 'cargo')
      assert.deepEqual(args, ['xtask', '__restore-dataset-verify-existing'])
      assert.equal(options.cwd, item.verifierRoot)
      assert.deepEqual(options.env, toolProcessEnvironment())
      assert.equal(options.encoding, 'utf8')
      assert.equal(options.windowsHide, true)
      assert.equal(options.timeout, 20 * 60_000)
      assert.equal(options.maxBuffer, 1024 * 1024)
      const input = JSON.parse(options.input)
      assert.deepEqual(input, {
        format_version: 1,
        kind: 'ryframe-restore-dataset-verification',
        write: true,
        authority: verified.authority,
      })
      assert.equal(input.authority.execution_backend, item.value.paths.backendExecutionRoot)
      assert.notEqual(input.authority.execution_backend, item.value.paths.backendProductRoot)
      return '运行工具\n' + JSON.stringify(receipt) + '\n'
    },
  })
  assert.equal(calls, 1)
  assert.deepEqual(checkouts, [[item.verifierRoot, verifierSha, '恢复证明协调后端']])
  assert.deepEqual(result, receipt)
  assert.equal(Object.isFrozen(result.actions), true)
})

test('已有数据核验拒绝未绑定的血缘及不完整的登记样本', () => {
  const item = fixture()
  const input = existingInput(item)
  const execute = () => assert.fail('不得调用 Cargo')
  const changed = structuredClone(input)
  changed.authority.lineage.scale.post_samples = 1
  assert.throws(
    () => verifyRestoredDataset(changed, { execute, checkout: acceptCheckout }),
    /冻结内容不一致/u,
  )

  const lineage = { ...item.lineage, scale: { ...item.lineage.scale, business_objects: 255 } }
  const bytes = Buffer.from(JSON.stringify(lineage))
  writeFileSync(item.authority.dataset_lineage.path, bytes)
  const incomplete = {
    ...item.authority,
    dataset_lineage: {
      ...item.authority.dataset_lineage,
      bytes: bytes.byteLength,
      sha256: datasetDigest(bytes),
    },
  }
  assert.throws(
    () =>
      verifyRestoredDataset(existingInput(item, restoreDatasetEvidence(incomplete)), {
        execute,
        checkout: acceptCheckout,
      }),
    /没有登记完整/u,
  )
})

test('已有数据成功收据必须精确匹配冻结身份、操作和全部样本', () => {
  const item = fixture()
  const input = existingInput(item)
  const receipt = existingReceipt(item)
  for (const change of [
    { format_version: 2 },
    { kind: 'other' },
    { status: 'other' },
    { scope_id: 'other-target' },
    { source_scope_id: 'other-source' },
    { actions: { ...receipt.actions, session: 'read_only' } },
    { restore_success: true },
    { tenants: 10 },
    { posts: 34 },
    { files: 255 },
    { unknown: 'unregistered' },
  ]) {
    let calls = 0
    assert.throws(
      () =>
        verifyRestoredDataset(input, {
          checkout: acceptCheckout,
          execute: () => {
            calls++
            return JSON.stringify({ ...receipt, ...change })
          },
        }),
      /收据与冻结身份/u,
    )
    assert.equal(calls, 1)
  }
})

test('已有数据子进程失败不泄露原始输出，也不重试', () => {
  const item = fixture()
  const input = existingInput(item)
  let calls = 0
  const execute = () => {
    calls++
    throw Object.assign(new Error('模拟凭据正文'), { stderr: '模拟凭据正文' })
  }
  assert.throws(
    () => verifyRestoredDataset(input, { execute, checkout: acceptCheckout }),
    (error) =>
      /禁止自动重放/u.test(error.message) &&
      !error.message.includes('模拟凭据正文') &&
      error.cause === undefined,
  )
  assert.equal(calls, 1)
})
