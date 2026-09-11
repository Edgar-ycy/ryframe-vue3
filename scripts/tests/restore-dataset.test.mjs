import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
import { restoreRuntimeFixture } from './build-receipt-fixture.mjs'

const temporaryRoots = []
test.afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true })
})

function temporaryRoot() {
  const parent = path.resolve('.local-tests', 'restore-dataset-unit')
  mkdirSync(parent, { recursive: true })
  const root = mkdtempSync(path.join(parent, 'authority-'))
  temporaryRoots.push(root)
  return root
}

function descriptor(filename) {
  const bytes = readFileSync(filename)
  return { path: filename, bytes: bytes.byteLength, sha256: datasetDigest(bytes) }
}

function fixture(options = {}) {
  const directory = temporaryRoot()
  const value = restoreRuntimeFixture({
    directory,
    backupSourceSha: 'a'.repeat(40),
    backendProductSha: 'b'.repeat(40),
    backendExecutionSha: 'c'.repeat(40),
  })
  const verifierRoot = path.join(directory, 'verifier')
  for (const item of [verifierRoot, value.paths.backendExecutionRoot])
    mkdirSync(item, { recursive: true })
  const lineage = {
    tenants: Array.from({ length: 11 }, (_, index) => ({ tenant_id: `tenant-${index}` })),
    scale: { post_samples: 33, business_objects: 256 },
    scopes: { origin_tenant_scope_id: 'source-lineage' },
    verification: { request_interval_ms: 25 },
  }
  const generationFile = path.join(directory, 'source-generation.json')
  const lineageFile = path.join(directory, 'dataset-lineage.json')
  const runtimeFile = path.join(directory, 'runtime.json')
  const targetPlanFile = path.join(directory, 'target-plan.json')
  writeFileSync(generationFile, JSON.stringify({ status: 'seed_source_generation_published' }))
  writeFileSync(lineageFile, JSON.stringify(lineage))
  writeFileSync(runtimeFile, value.runtimeBytes)
  writeFileSync(targetPlanFile, value.targetPlanBytes)
  const authority = {
    format_version: 1,
    kind: 'restore-dataset-authority',
    runtime: descriptor(runtimeFile),
    target_plan: descriptor(targetPlanFile),
    source_generation: descriptor(generationFile),
    dataset_lineage: descriptor(lineageFile),
    target: {
      scope_id: value.binding.record.plan.scope_id,
      api_url: new URL(value.runtime.endpoints.api).origin,
      frontend_url: value.runtime.endpoints.frontend,
    },
    execution_backend: value.paths.backendExecutionRoot,
  }
  const python = path.join(directory, 'python.exe')
  const calls = []
  const execute = (program, args, settings) => {
    calls.push({ program, args, settings })
    if (options.failure) throw new Error(options.failure)
    return JSON.stringify(options.authority ?? authority)
  }
  const input = {
    bindingsBytes: value.bindingsBytes,
    runtimeReceipt: runtimeFile,
    targetPlan: targetPlanFile,
    backendRoot: verifierRoot,
    frontendEndpoint: value.runtime.endpoints.frontend,
    python,
  }
  return { authority, calls, directory, execute, input, lineage, value, verifierRoot }
}

test('后端唯一预检以固定 Python 无 stdin 返回完整且递归冻结的权威', () => {
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
  assert.deepEqual(item.calls, [
    {
      program: item.input.python,
      args: [
        '-X',
        'utf8',
        '-B',
        path.join(item.verifierRoot, 'scripts/restore_business_proof.py'),
        '--preflight',
        '--backend-dir',
        item.verifierRoot,
        '--runtime-receipt',
        item.input.runtimeReceipt,
        '--target-plan',
        item.input.targetPlan,
      ],
      settings: {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 300_000,
        maxBuffer: 1024 * 1024,
      },
    },
  ])
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
      () => verifyRestoreDatasetAuthority(item.input, { execute: () => JSON.stringify(changed) }),
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

test('缺少绝对 RYFRAME_PYTHON 会在执行预检前失败', () => {
  for (const python of ['', 'python']) {
    const item = fixture()
    item.input.python = python
    assert.throws(
      () => verifyRestoreDatasetAuthority(item.input, { execute: item.execute }),
      /RYFRAME_PYTHON/u,
    )
    assert.equal(item.calls.length, 0)
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

test('摘要函数覆盖字节内容而不依赖路径', () => {
  assert.equal(datasetDigest(Buffer.from('same')), datasetDigest('same'))
  assert.notEqual(datasetDigest('same'), datasetDigest('different'))
})
