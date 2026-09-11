import path from 'node:path'
import { sha256 } from './build-source-inventory.mjs'
import { verifyRestoreDatasetAuthority } from './restore-dataset.mjs'
import { restoreProofBindings } from './restore-proof.mjs'
import { inspectRestoreRuntimeReceipt, restoreRuntimeBinding } from './restore-runtime-receipt.mjs'
import { evidenceDirectory, evidenceFile, verifiedCheckout } from './restore-verification.mjs'

export const restoreSpecs = [
  'full-stack',
  'product-tenant',
  'post-export',
  'session',
  'notice',
  'schedule',
  'restore-existing',
].map((name) => `**/${name}.spec.ts`)

function verifyRestoreSpecs(root) {
  const checkout = evidenceDirectory(root, '前端源码目录')
  for (const pattern of restoreSpecs) {
    const name = pattern.slice(3)
    try {
      evidenceFile(path.join(checkout, 'tests', 'browser-real', name), `恢复业务场景 ${name}`)
    } catch (error) {
      throw new Error(`恢复业务场景不存在或不是普通文件：${name}`, { cause: error })
    }
  }
}

function restoreInputs(value) {
  const fields = [
    'bindings',
    'runtimeReceipt',
    'targetPlan',
    'coordinatorDir',
    'verifierSha',
    'runnerSha',
    'python',
  ]
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== fields.sort().join('\0')
  )
    throw new Error('恢复浏览器输入字段缺失或包含未登记内容')
  return value
}

export function realTestSelection(
  restore,
  fixture,
  baseURL,
  root = process.cwd(),
  checkout = verifiedCheckout,
  datasetAuthority = verifyRestoreDatasetAuthority,
) {
  if (restore === undefined) {
    return {
      selection: { testIgnore: ['**/restore-existing.spec.ts'] },
      reporter: undefined,
      worker: undefined,
    }
  }
  const inputs = restoreInputs(restore)
  if (fixture !== 'core') throw new Error('恢复业务证明必须使用完整 core 业务套件')
  let binding, target, runtime, verifierRoot, runnerRoot, authority
  try {
    binding = evidenceFile(inputs.bindings, '恢复绑定收据')
    target = evidenceFile(inputs.targetPlan, '恢复目标计划')
    runtime = evidenceFile(inputs.runtimeReceipt, '恢复运行收据')
    verifierRoot = checkout(inputs.coordinatorDir, inputs.verifierSha, '恢复证明协调后端')
    const { record, manifest } = restoreProofBindings(binding.bytes)
    const expected = restoreRuntimeBinding({
      record,
      manifest,
      targetPlanBytes: target.bytes,
      frontendEndpoint: baseURL,
    })
    inspectRestoreRuntimeReceipt({ bytes: runtime.bytes, bindingsBytes: binding.bytes, expected })
    checkout(expected.roots.frontend, expected.authority.frontend_sha, '恢复产品前端源码')
    runnerRoot = checkout(root, inputs.runnerSha, '恢复测试 runner 源码')
    authority = datasetAuthority({
      bindingsBytes: binding.bytes,
      runtimeReceipt: runtime.path,
      targetPlan: target.path,
      backendRoot: verifierRoot,
      frontendEndpoint: baseURL,
      python: inputs.python,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`恢复浏览器输入无效：${message}`, { cause: error })
  }
  const evidence = {
    binding: { path: binding.path, sha256: sha256(binding.bytes) },
    target: { path: target.path, sha256: sha256(target.bytes) },
    runtime: { path: runtime.path, sha256: sha256(runtime.bytes) },
    sourceGeneration: authority.authority.source_generation,
    datasetLineage: authority.authority.dataset_lineage,
  }
  verifyRestoreSpecs(path.resolve(root))
  for (const [label, item] of Object.entries(evidence)) {
    if (sha256(evidenceFile(item.path, label).bytes) !== item.sha256)
      throw new Error('恢复浏览器输入在配置预检期间发生变化')
  }
  return {
    selection: { testMatch: [...restoreSpecs] },
    reporter: {
      ...evidence,
      verifierRoot,
      verifierSha: inputs.verifierSha,
      python: inputs.python,
      runnerRoot,
      runnerSha: inputs.runnerSha,
      datasetAuthority: authority.authority,
    },
    worker: authority.authority,
  }
}
