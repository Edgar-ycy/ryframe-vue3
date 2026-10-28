import { toolProcessEnvironment } from '../tool-inputs.mjs'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
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

test('目标读取使用 B0 执行后端和目标端点，不混用备份来源身份', async () => {
  const item = fixture()
  const verified = verifyRestoreDatasetAuthority(item.input, { execute: item.execute })
  const calls = []
  const load = async (specifier) => {
    calls.push(specifier)
    if (specifier.endsWith('/restore_source_existing.mjs'))
      return { validateSourceLineage: (lineage) => assert.equal(lineage, verified.lineage) }
    return {
      verifyIdentitiesAt: async (backend, identities, target, network, pacing) => {
        assert.equal(backend, item.value.paths.backendExecutionRoot)
        assert.notEqual(backend, item.value.paths.backendProductRoot)
        assert.equal(identities, verified.lineage.tenants)
        assert.deepEqual(target, item.authority.target)
        assert.equal(network, 19)
        assert.equal(pacing, 25)
        return { tenants: 11, posts: 33, files: 256 }
      },
    }
  }
  const result = await verifyRestoredDataset(
    { authority: verified, verifierRoot: item.verifierRoot },
    load,
  )
  assert.equal(result.scope_id, item.authority.target.scope_id)
  assert.equal(result.source_scope_id, 'source-lineage')
  assert.equal(calls.length, 2)
})

test('验证器导出缺失或目标规模不同会失败关闭', async () => {
  const item = fixture()
  const verified = verifyRestoreDatasetAuthority(item.input, { execute: item.execute })
  const missing = async (specifier) =>
    specifier.endsWith('/restore_source_existing.mjs')
      ? {}
      : { verifyIdentitiesAt: async () => ({ tenants: 11, posts: 33, files: 256 }) }
  await assert.rejects(
    verifyRestoredDataset({ authority: verified, verifierRoot: item.verifierRoot }, missing),
    /validateSourceLineage/u,
  )
  const wrong = async (specifier) =>
    specifier.endsWith('/restore_source_existing.mjs')
      ? { validateSourceLineage: () => {} }
      : { verifyIdentitiesAt: async () => ({ tenants: 11, posts: 33, files: 255 }) }
  await assert.rejects(
    verifyRestoredDataset({ authority: verified, verifierRoot: item.verifierRoot }, wrong),
    /规模/u,
  )
})
