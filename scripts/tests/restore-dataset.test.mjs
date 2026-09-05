import test from 'node:test'
import assert from 'node:assert/strict'
import {
  datasetDigest,
  restoredDataset,
  restoredExistingVerification,
} from '../restore-dataset.mjs'

function fixture() {
  const plan = {
    source: { scope_id: 'source' },
    target: { s3: { endpoint: 'http://127.0.0.1:9000' }, scope_id: 'target' },
  }
  const restorePlan = {
    id: 'restore-one',
    backup_id: 'backup-one',
    scope_id: 'target',
    fault_at: '2026-01-01T00:30:00Z',
    databases: [
      {
        source_key: 'control',
        target_key: 'control',
        server_uuid: 'server-one',
        database: 'restore_control',
      },
    ],
    object_endpoint: plan.target.s3.endpoint,
    object_prefix: 'target/',
    api_ready_url: 'http://127.0.0.1:8080/readyz',
    worker_ready_url: 'http://127.0.0.1:9091/readyz',
    frontend_sha: 'b'.repeat(40),
  }
  const dataset = {
    format_version: 1,
    source_scope_id: 'source',
    started_at: '2025-12-31T23:00:00Z',
    completed_at: '2026-01-01T00:00:00Z',
    plan_sha256: datasetDigest(JSON.stringify(plan)),
    records: 110_000,
    object_bytes: 264 * 4 * 1024 * 1024,
    tenants: Array.from({ length: 11 }, (_, index) => ({
      tenant_id: index === 0 ? 'system' : `source-${String(index).padStart(2, '0')}`,
      username: 'owner',
      password_env: 'TEST_OWNER',
      records: 10_000,
      posts: Array.from({ length: 3 }, (_, value) => ({
        id: String(index * 3 + value + 1),
        code: `old-${value}`,
        name: `旧岗位${value}`,
      })),
      files: Array.from({ length: 24 }, (_, value) => ({
        file_path: `${index}/file-${value}`,
        bytes: 4 * 1024 * 1024,
        sha256: 'a'.repeat(64),
      })),
    })),
  }
  const bindings = {
    manifest: {
      id: 'backup-one',
      scope_id: 'source',
      source_sha: 'c'.repeat(40),
      quiesced_at: '2026-01-01T01:00:00Z',
    },
    record: {
      status: 'data_verified',
      data_verified_at: '2026-01-01T02:00:00Z',
      plan_hash: datasetDigest(JSON.stringify(restorePlan)),
      plan: restorePlan,
    },
    dataset_sha256: datasetDigest(JSON.stringify(dataset)),
  }
  return { plan, dataset, bindings }
}

const bytes = (value) => Buffer.from(JSON.stringify(value))

test('旧数据证明必须满足参考规模并绑定备份之前的实际数据集', () => {
  const { plan, dataset, bindings } = fixture()
  assert.equal(restoredDataset(bytes(dataset), bytes(plan), bytes(bindings)).tenants.length, 11)
})

test('篡改、遗漏租户、空对象、缩减规模和备份之后生成的收据均拒绝', () => {
  const tampered = fixture()
  tampered.bindings.dataset_sha256 = 'f'.repeat(64)
  assert.throws(() =>
    restoredDataset(bytes(tampered.dataset), bytes(tampered.plan), bytes(tampered.bindings)),
  )
  for (const change of [
    (value) => {
      value.plan.target.scope_id = 'other'
    },
    (value) => {
      value.dataset.tenants.pop()
    },
    (value) => {
      value.dataset.tenants[0].files = []
    },
    (value) => {
      value.dataset.records = 99_999
    },
    (value) => {
      value.dataset.completed_at = '2026-01-02T00:00:00Z'
    },
    (value) => {
      value.dataset.tenants[1].files[0].file_path = value.dataset.tenants[0].files[0].file_path
    },
    (value) => {
      value.dataset.tenants[0].posts[1].id = value.dataset.tenants[0].posts[0].id
    },
  ]) {
    const value = fixture()
    change(value)
    value.bindings.dataset_sha256 = datasetDigest(bytes(value.dataset))
    assert.throws(() =>
      restoredDataset(bytes(value.dataset), bytes(value.plan), bytes(value.bindings)),
    )
  }
})

test('无效 UTF-8、空输入与不完整恢复绑定失败关闭', () => {
  const { plan, dataset, bindings } = fixture()
  assert.throws(() => restoredDataset(Buffer.from([0xff]), bytes(plan), bytes(bindings)), /UTF-8/u)
  assert.throws(() => restoredDataset(Buffer.alloc(0), bytes(plan), bytes(bindings)), /缺失/u)
  delete bindings.record.plan.frontend_sha
  assert.throws(
    () => restoredDataset(bytes(dataset), bytes(plan), bytes(bindings)),
    /恢复业务验收/u,
  )
})

test('已有数据验证必须匹配target、原数据摘要和只读范围，source收据不能进入恢复证明', () => {
  const { plan, dataset, bindings } = fixture()
  const result = {
    format_version: 1,
    status: 'existing_data_verified',
    side: 'target',
    scope_id: 'target',
    plan_sha256: dataset.plan_sha256,
    source_scope_id: 'source',
    dataset_sha256: datasetDigest(bytes(dataset)),
    actions: { business: 'read_only', objects: 'read_only', session: 'login_logout' },
    restore_success: false,
    tenants: 11,
    posts: 33,
    files: 264,
  }
  const verify = (value) =>
    restoredExistingVerification(value, bytes(dataset), bytes(plan), bytes(bindings))
  assert.doesNotThrow(() => verify(result))
  for (const change of [
    (value) => {
      value.side = 'source'
      value.scope_id = 'source'
    },
    (value) => {
      value.side = 'source'
    },
    (value) => {
      value.scope_id = 'other'
    },
    (value) => {
      value.plan_sha256 = 'a'.repeat(64)
    },
    (value) => {
      value.dataset_sha256 = 'b'.repeat(64)
    },
    (value) => {
      value.source_scope_id = 'other'
    },
    (value) => {
      value.restore_success = true
    },
    (value) => {
      value.status = 'verified'
    },
    (value) => {
      value.actions.business = 'write'
    },
    (value) => {
      value.actions.objects = 'write'
    },
    (value) => {
      value.files--
    },
  ]) {
    const candidate = structuredClone(result)
    change(candidate)
    assert.throws(() => verify(candidate), /target/)
  }
})
