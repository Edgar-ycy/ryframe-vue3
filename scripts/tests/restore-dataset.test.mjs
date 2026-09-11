import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  datasetDigest,
  restoredDatasetLineage,
  verifyRestoredDataset,
} from '../restore-dataset.mjs'
import { restoreRuntimeFixture } from './build-receipt-fixture.mjs'
import { restoreLineageFixture } from './restore-lineage-fixture.mjs'

const temporaryRoots = []
test.afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true })
})

function temporaryRoot(prefix) {
  const parent = path.resolve('.local-tests', 'restore-dataset-unit')
  mkdirSync(parent, { recursive: true })
  const root = mkdtempSync(path.join(parent, prefix))
  temporaryRoots.push(root)
  return root
}

function lineageFixture(options) {
  return restoreLineageFixture(temporaryRoot('chain-'), { backup_receipt: {} }, options)
}

function verificationFixture(options = {}) {
  const directory = temporaryRoot('target-')
  const value = restoreRuntimeFixture({
    directory,
    backendProductSha: 'b'.repeat(40),
    backendExecutionSha: 'c'.repeat(40),
  })
  mkdirSync(path.join(directory, 'verifier'), { recursive: true })
  const lineage = {
    tenants: Array.from({ length: 11 }, (_, index) => ({ tenant_id: `tenant-${index}` })),
    scale: { post_samples: 33, business_objects: 256 },
    scopes: { origin_tenant_scope_id: 'source-lineage' },
    verification: {
      api_url: 'http://127.0.0.1:7777',
      frontend_url: 'http://127.0.0.1:7778',
      request_interval_ms: 25,
    },
  }
  const calls = []
  const counts = options.counts ?? { tenants: 11, posts: 33, files: 256 }
  const load = async (specifier) => {
    calls.push(specifier)
    if (specifier.endsWith('/restore_source_existing.mjs')) {
      return (
        options.sourceModule ?? {
          validateSourceLineage: (input) => assert.equal(input, lineage),
        }
      )
    }
    if (specifier.endsWith('/restore_reference_existing.mjs')) {
      return (
        options.targetModule ?? {
          verifyIdentitiesAt: async (backend, identities, target, network, pacing) => {
            assert.equal(backend, value.paths.backendExecutionRoot)
            assert.equal(identities, lineage.tenants)
            assert.deepEqual(target, {
              api_url: 'http://127.0.0.1:8080',
              frontend_url: value.runtime.endpoints.frontend,
            })
            assert.equal(network, 19)
            assert.equal(pacing, 25)
            return counts
          },
        }
      )
    }
    throw new Error(`未知测试模块：${specifier}`)
  }
  return { calls, directory, lineage, load, value }
}

test('正式目标计划递归绑定同一 STOP、source-runtime、START 与 C52 血缘', () => {
  const value = lineageFixture()
  const result = restoredDatasetLineage(value.bytes)
  assert.deepEqual(result.lineage, value.lineage)
  assert.deepEqual(result.sourceGeneration, value.sourceGeneration)
  assert.deepEqual(result.sourceRuntime, value.sourceRuntime)
  assert.deepEqual(result.datasetLineage, value.datasetLineage)
})

test('孤立导出代次或混入另一 source-runtime 血缘会失败关闭', () => {
  assert.throws(
    () => restoredDatasetLineage(lineageFixture({ mismatchedExport: true }).bytes),
    /同一/u,
  )
  assert.throws(
    () => restoredDatasetLineage(lineageFixture({ mismatchedRuntime: true }).bytes),
    /同一代次/u,
  )
})

test('递归证据被原地替换或旧备份格式不能作为 C52 数据来源', () => {
  const value = lineageFixture()
  writeFileSync(value.datasetLineage.path, JSON.stringify({ replaced: true }))
  assert.throws(() => restoredDatasetLineage(value.bytes), /登记摘要/u)
  assert.throws(() => restoredDatasetLineage(lineageFixture({ backupVersion: 1 }).bytes), /v2/u)
})

test('目标验收使用 verifier 严格校验和 target 产品执行根及端点', async () => {
  const item = verificationFixture()
  const result = await verifyRestoredDataset(
    {
      bindingsBytes: item.value.bindingsBytes,
      targetPlanBytes: item.value.targetPlanBytes,
      frontendEndpoint: item.value.runtime.endpoints.frontend,
      verifierRoot: path.join(item.directory, 'verifier'),
      lineage: item.lineage,
    },
    item.load,
  )
  assert.deepEqual(result, {
    format_version: 1,
    kind: 'restore-target-existing-verification',
    status: 'target_existing_data_verified',
    scope_id: item.value.bindings.record.plan.scope_id,
    source_scope_id: item.lineage.scopes.origin_tenant_scope_id,
    actions: { business: 'read_only', objects: 'read_only', session: 'login_logout' },
    restore_success: false,
    tenants: 11,
    posts: 33,
    files: 256,
  })
  assert.equal(item.calls.length, 2)
  assert.equal(
    item.calls.every((value) => value.startsWith('file:')),
    true,
  )
})

test('验证器导出缺失或目标规模不同会失败关闭', async () => {
  const missing = verificationFixture({ sourceModule: {} })
  await assert.rejects(
    verifyRestoredDataset(
      {
        bindingsBytes: missing.value.bindingsBytes,
        targetPlanBytes: missing.value.targetPlanBytes,
        frontendEndpoint: missing.value.runtime.endpoints.frontend,
        verifierRoot: path.join(missing.directory, 'verifier'),
        lineage: missing.lineage,
      },
      missing.load,
    ),
    /validateSourceLineage/u,
  )
  const wrong = verificationFixture({ counts: { tenants: 11, posts: 33, files: 255 } })
  await assert.rejects(
    verifyRestoredDataset(
      {
        bindingsBytes: wrong.value.bindingsBytes,
        targetPlanBytes: wrong.value.targetPlanBytes,
        frontendEndpoint: wrong.value.runtime.endpoints.frontend,
        verifierRoot: path.join(wrong.directory, 'verifier'),
        lineage: wrong.lineage,
      },
      wrong.load,
    ),
    /规模/u,
  )
})

test('摘要函数覆盖字节内容而不依赖路径', () => {
  assert.equal(datasetDigest(Buffer.from('same')), datasetDigest('same'))
  assert.notEqual(datasetDigest('same'), datasetDigest('different'))
})
