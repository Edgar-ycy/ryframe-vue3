import assert from 'node:assert/strict'
import test from 'node:test'
import { sha256 } from '../build-source-inventory.mjs'
import { restoreRuntimeBinding, verifyRestoreRuntimeReceipt } from '../restore-runtime-receipt.mjs'
import { jsonBytes, restoreRuntimeFixture } from './build-receipt-fixture.mjs'

test('运行证明消费者保留权威 v2/runtime v3，仅内嵌前端构建升级 v3 并严格核验身份', () => {
  const value = restoreRuntimeFixture()
  const expected = restoreRuntimeBinding({
    record: value.binding.record,
    manifest: value.binding.manifest,
    targetPlanBytes: value.targetPlanBytes,
    frontendEndpoint: value.runtime.endpoints.frontend,
  })
  const verify = (runtime) => {
    const bytes = jsonBytes(runtime)
    return verifyRestoreRuntimeReceipt({
      bytes,
      bindingsBytes: value.bindingsBytes,
      expected,
      verifiedDigest: sha256(bytes),
    })
  }
  assert.equal(expected.authority.format_version, 2)
  assert.equal(value.runtime.format_version, 3)
  assert.equal(value.runtime.backend.format_version, 2)
  assert.equal(value.runtime.frontend.format_version, 3)
  assert.equal(verify(value.runtime).digest, sha256(value.runtimeBytes))
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
    assert.throws(() => verify(changed), /前端/u)
  }
})
