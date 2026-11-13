import assert from 'node:assert/strict'
import test from 'node:test'
import { sha256 } from '../build-source-inventory.mjs'
import { backendSourceDomains } from '../build-receipt-schema.mjs'
import { restoreRuntimeBinding, verifyRestoreRuntimeReceipt } from '../restore-runtime-receipt.mjs'
import {
  b0BuildSources,
  jsonBytes,
  legacyB0FrontendBuild,
  restoreRuntimeFixture,
} from './build-receipt-fixture.mjs'

function verifyFixture(value) {
  const expected = restoreRuntimeBinding({
    record: value.binding.record,
    manifest: value.binding.manifest,
    targetPlanBytes: jsonBytes(value.targetPlan),
    frontendEndpoint: value.runtime.endpoints.frontend,
  })
  const bytes = jsonBytes(value.runtime)
  const result = verifyRestoreRuntimeReceipt({
    bytes,
    bindingsBytes: value.bindingsBytes,
    expected,
    verifiedDigest: sha256(bytes),
  })
  return { expected, result }
}

test('运行证明消费者保留权威 v2/runtime v3，严格核验普通内嵌前端构建 v3 身份', () => {
  const value = restoreRuntimeFixture()
  const { expected, result } = verifyFixture(value)
  assert.equal(expected.authority.format_version, 2)
  assert.equal(result.digest, sha256(value.runtimeBytes))
  for (const mutate of [
    (runtime) => {
      runtime.frontend.format_version = 2
    },
    (runtime) => {
      runtime.frontend.build.identity.frontend_commit = 'development'
    },
    (runtime) => {
      runtime.frontend.build.configuration.tools.push({ path: 'unknown', sha256: 'a'.repeat(64) })
    },
    (runtime) => {
      runtime.frontend.build.environment_files = []
    },
  ]) {
    const changed = structuredClone(value.runtime)
    mutate(changed)
    assert.throws(() => verifyFixture({ ...value, runtime: changed }), /前端/u)
  }
})

test('恢复构建并发值必须与两个角色的构建及产物命令一致', () => {
  const value = restoreRuntimeFixture()
  const { backend } = value.runtime
  const buildCommands = Object.values(backend.build.commands)
  const commands = [
    ...buildCommands,
    ...Object.values(backend.artifacts).map((item) => item.command),
  ]

  backend.build.jobs = '64'
  for (const command of commands) command[command.indexOf('--jobs') + 1] = '64'
  verifyFixture(value)

  for (const invalid of ['0', '65', '064', '+64', '64 ', '6.4e1', 'cargo-default', 64]) {
    backend.build.jobs = invalid
    assert.throws(() => verifyFixture(value), /后端构建 jobs/u)
  }
  backend.build.jobs = '64'
  const worker = backend.build.commands.worker
  worker[worker.indexOf('--jobs') + 1] = '1'
  assert.throws(() => verifyFixture(value), /后端构建命令/u)
  worker[worker.indexOf('--jobs') + 1] = '64'

  const apiArtifact = backend.artifacts.api.command
  apiArtifact.splice(apiArtifact.indexOf('--jobs'), 2)
  assert.throws(() => verifyFixture(value), /后端构建产物命令/u)
})

test('恢复运行收据拒绝 API 或 Worker 产物命令与同角色构建命令不一致', () => {
  const value = restoreRuntimeFixture()
  for (const role of ['api', 'worker']) {
    const runtime = structuredClone(value.runtime)
    runtime.backend.artifacts[role].command.splice(-1, 0, '--release')
    assert.throws(
      () => verifyFixture({ ...value, runtime }),
      /后端构建产物命令必须与构建上下文一致/u,
      role,
    )
  }
})

test('后端来源域按现行目录分类并保留历史 scripts 路径的产品输入', () => {
  const value = restoreRuntimeFixture()
  const inventory = value.runtime.backend.sources.full
  const legacy = 'scripts/check_architecture.py'
  const requirements = 'scripts/requirements-ci.txt'
  const tool = 'tools/python/check_architecture.py'
  inventory.files = [legacy, requirements, tool].map((path) => ({ path, sha256: '1'.repeat(64) }))
  const domains = backendSourceDomains(inventory)
  assert.deepEqual(domains.product.api.files, [legacy, requirements])
  assert.deepEqual(domains.product.worker.files, [legacy, requirements])
  assert.deepEqual(domains.tools.files, [requirements, tool])
})

test('历史前端构建只允许精确的 B0 基线目标', () => {
  const options = { ...b0BuildSources, frontendBuildReceipt: legacyB0FrontendBuild }
  const candidate = restoreRuntimeFixture(options)
  candidate.targetPlan.target_side = 'candidate'
  candidate.targetPlan.comparison_arm = 'b1'
  assert.throws(() => verifyFixture(candidate), /B0 前端构建/u)
  for (const field of Object.keys(b0BuildSources)) {
    const otherSource = restoreRuntimeFixture({ ...options, [field]: '0'.repeat(40) })
    assert.throws(() => verifyFixture(otherSource), /B0 恢复适配/u)
  }
  const withoutAdapter = restoreRuntimeFixture({
    ...options,
    backendExecutionSha: options.backendProductSha,
  })
  withoutAdapter.targetPlan.target_side = 'base'
  withoutAdapter.targetPlan.comparison_arm = 'b0'
  assert.throws(() => verifyFixture(withoutAdapter), /B0 前端构建/u)
})

test('B0 目标拒绝错树、错补丁和其他执行收据替代', () => {
  const options = { ...b0BuildSources, frontendBuildReceipt: legacyB0FrontendBuild }
  const original = restoreRuntimeFixture(options)
  verifyFixture(original)
  for (const mutate of [
    (value) => {
      value.targetPlan.product_execution.adapter.adapter_tree = '0'.repeat(40)
    },
    (value) => {
      value.targetPlan.product_execution.adapter.reconstructed_tree = '0'.repeat(40)
    },
    (value) => {
      value.targetPlan.product_execution.adapter.patch.bytes++
    },
    (value) => {
      value.targetPlan.product_execution.adapter.patch.sha256 = '0'.repeat(64)
    },
    (value) => {
      value.targetPlan.product_execution.adapter.patch.path = 'other.patch'
    },
    (value) => {
      value.targetPlan.product_execution.adapter.patch.unknown = true
    },
  ]) {
    const value = structuredClone(original)
    mutate(value)
    assert.throws(() => verifyFixture(value), /B0 恢复适配/u)
  }
  for (const [mutate, message] of [
    [
      (value) => {
        value.runtime.backend = restoreRuntimeFixture().runtime.backend
      },
      '运行产物收据内嵌构建未绑定精确干净源码',
    ],
    [
      (value) => {
        value.runtime.backend.sources.full.source.snapshot.head = b0BuildSources.backendProductSha
      },
      '完整来源 Git 内容无效',
    ],
    [
      (value) => {
        value.runtime.backend.sources.product.api.sha256 = '0'.repeat(64)
      },
      '后端构建来源分域与完整清单不一致',
    ],
    [
      (value) => {
        value.runtime.backend.sources.tools.sha256 = '0'.repeat(64)
      },
      '后端构建来源分域与完整清单不一致',
    ],
  ]) {
    const value = structuredClone(original)
    mutate(value)
    assert.throws(() => verifyFixture(value), { message })
  }
})

test('历史 B0 前端构建保留来源、命令、身份及 dist 清单检查', () => {
  for (const mutate of [
    (frontend) => {
      frontend.unregistered = null
    },
    (frontend) => {
      frontend.adapter.contract = 'unknown'
    },
    (frontend) => {
      frontend.sources.full.source.snapshot.clean = false
    },
    (frontend) => {
      frontend.sources.product.frontend.sha256 = '0'.repeat(64)
    },
    (frontend) => {
      frontend.build.command = ['vite', 'build']
    },
    (frontend) => {
      frontend.build.mode = 'development'
    },
    (frontend) => {
      frontend.build.toolchain.pnpm.version = '12.8.1'
    },
    (frontend) => {
      frontend.build.configuration.api_origin = 'http://127.0.0.1:8080'
    },
    (frontend) => {
      frontend.build.identity.source_file = 'source.json'
    },
    (frontend) => {
      frontend.files.reverse()
    },
    (frontend) => {
      frontend.files[1].path = 'C:/index.html'
    },
    (frontend) => {
      frontend.files[1].sha256 = 'unknown'
    },
  ]) {
    const value = restoreRuntimeFixture({
      ...b0BuildSources,
      frontendBuildReceipt: legacyB0FrontendBuild,
    })
    mutate(value.runtime.frontend)
    assert.throws(() => verifyFixture(value), /前端|构建来源/u)
  }
})
