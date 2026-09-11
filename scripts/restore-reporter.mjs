import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { buildRestoreEvidence, restoreProofBindings } from './restore-proof.mjs'
import { sha256 } from './build-source-inventory.mjs'
import { restoredDatasetLineage } from './restore-dataset.mjs'
import { restoreRuntimeBinding } from './restore-runtime-receipt.mjs'
import {
  evidenceDirectory,
  evidenceFile,
  verifiedCheckout,
  verifyRuntime,
} from './restore-verification.mjs'

function proofPaths(restoreId) {
  const root = evidenceDirectory(path.resolve('.local-tests/playwright-real'), '恢复证明输出目录')
  const prefix = path.join(root, `restore-${restoreId}`)
  return {
    proof: `${prefix}.json`,
    runtime: `${prefix}-runtime.json`,
    tests: `${prefix}-tests.json`,
  }
}

function proofFiles(paths, proof, runtimeBytes, testsBytes) {
  return [
    { path: paths.runtime, bytes: runtimeBytes },
    { path: paths.tests, bytes: testsBytes },
    { path: paths.proof, bytes: Buffer.from(JSON.stringify(proof, null, 2) + '\n') },
  ]
}

function publishProof(files) {
  if (files.some((file) => existsSync(file.path)))
    throw new Error('恢复证明输出必须使用全新的演练 ID')
  const created = []
  try {
    for (const file of files) {
      writeFileSync(file.path, file.bytes, { flag: 'wx' })
      created.push(file.path)
    }
  } catch (error) {
    for (const file of created.reverse()) unlinkSync(file)
    throw error
  }
}

function boundEvidence(environmentName, expected, label) {
  if (
    !expected ||
    typeof expected !== 'object' ||
    Object.keys(expected).sort().join('\0') !== 'path\0sha256'
  )
    throw new Error(`恢复证明 reporter 缺少${label}预检结果`)
  const configured = process.env[environmentName]
  const evidence = evidenceFile(configured, label)
  if (evidence.path !== expected.path || sha256(evidence.bytes) !== expected.sha256)
    throw new Error(`${label}与配置预检结果不一致`)
  return evidence
}

export default class RestoreReporter {
  runs = []

  constructor({ verify = verifyRuntime, checkout = verifiedCheckout, expectedRestore } = {}) {
    this.verify = verify
    this.checkout = checkout
    this.expectedRestore = expectedRestore
  }

  onBegin(config) {
    this.started = Date.now()
    const expected = this.expectedRestore
    if (!expected) throw new Error('恢复证明 reporter 未绑定配置预检结果')
    const binding = boundEvidence('RYFRAME_RESTORE_BINDINGS', expected.binding, '恢复绑定收据')
    const target = boundEvidence('RYFRAME_RESTORE_TARGET_PLAN', expected.target, '恢复目标计划')
    const runtime = boundEvidence(
      'RYFRAME_RESTORE_RUNTIME_RECEIPT',
      expected.runtime,
      '恢复运行收据',
    )
    const lineage = restoredDatasetLineage(target.bytes)
    if (
      !isDeepStrictEqual(lineage.sourceGeneration, expected.sourceGeneration) ||
      !isDeepStrictEqual(lineage.datasetLineage, expected.datasetLineage)
    )
      throw new Error('恢复数据血缘与配置预检结果不一致')
    const { bindings, record, manifest } = restoreProofBindings(binding.bytes)
    const scope = (process.env.RYFRAME_E2E_SCOPE_ID || process.env.APP_SCOPE_ID)?.trim()
    if (!scope || scope !== record.plan.scope_id)
      throw new Error('恢复验收 scope 或后端源码目录未显式绑定')
    const configuredVerifierSha = process.env.RYFRAME_RESTORE_VERIFIER_SHA
    const verifierRoot = this.checkout(
      process.env.RYFRAME_RESTORE_BACKEND_DIR,
      configuredVerifierSha,
      '恢复证明协调后端',
    )
    if (configuredVerifierSha !== expected.verifierSha || verifierRoot !== expected.verifierRoot)
      throw new Error('恢复证明协调后端与配置预检结果不一致')
    const urls = new Set(config.projects.map((project) => project.use.baseURL))
    if (urls.size !== 1 || typeof [...urls][0] !== 'string' || ![...urls][0])
      throw new Error('恢复验收必须绑定运行产物收据与唯一浏览器地址')
    const baseURL = [...urls][0]
    const runtimeBinding = restoreRuntimeBinding({
      record,
      manifest,
      targetPlanBytes: target.bytes,
      frontendEndpoint: baseURL,
    })
    const frontendRoot = this.checkout(
      runtimeBinding.roots.frontend,
      runtimeBinding.authority.frontend_sha,
      '恢复产品前端源码',
    )
    const configuredRunnerSha = process.env.RYFRAME_RESTORE_RUNNER_SHA
    const runnerRoot = this.checkout(process.cwd(), configuredRunnerSha, '恢复测试 runner 源码')
    if (configuredRunnerSha !== expected.runnerSha || runnerRoot !== expected.runnerRoot)
      throw new Error('恢复测试 runner 与配置预检结果不一致')
    this.bindings = bindings
    this.bindingsBytes = binding.bytes
    this.bindingDigest = sha256(binding.bytes)
    this.targetPlanBytes = target.bytes
    this.targetPlanDigest = sha256(target.bytes)
    this.sourceGeneration = lineage.sourceGeneration
    this.datasetLineage = lineage.datasetLineage
    this.verification = {
      receipt: runtime.path,
      bindings: binding.path,
      targetPlan: target.path,
      backend: verifierRoot,
      frontend: frontendRoot,
      baseURL,
    }
    this.runnerRoot = runnerRoot
    this.runnerSha = configuredRunnerSha
    this.verifierRoot = verifierRoot
    this.verifierSha = configuredVerifierSha
    this.restoreId = record.plan.id
    this.runtimeDigest = this.verify(this.verification)
    if (this.runtimeDigest !== sha256(runtime.bytes))
      throw new Error('运行产物核验摘要与实际收据不一致')
  }

  onTestEnd(test, result) {
    if (!this.bindings) return
    this.runs.push({
      title: test.titlePath(),
      status: result.status,
      retry: result.retry,
      scenarios: test.annotations
        .filter((item) => item.type === 'restore-scenario')
        .map((item) => item.description),
    })
  }

  onEnd(result) {
    if (!this.bindings) return
    try {
      this.checkout(this.runnerRoot, this.runnerSha, '恢复测试 runner 源码')
      this.checkout(this.verifierRoot, this.verifierSha, '恢复证明协调后端')
      const digest = this.verify(this.verification)
      const runtime = evidenceFile(this.verification.receipt, '运行产物收据')
      const binding = evidenceFile(this.verification.bindings, '恢复绑定收据')
      const target = evidenceFile(this.verification.targetPlan, '恢复目标计划')
      const lineage = restoredDatasetLineage(target.bytes)
      if (
        digest !== this.runtimeDigest ||
        sha256(runtime.bytes) !== digest ||
        sha256(binding.bytes) !== this.bindingDigest ||
        !binding.bytes.equals(this.bindingsBytes) ||
        sha256(target.bytes) !== this.targetPlanDigest ||
        !target.bytes.equals(this.targetPlanBytes) ||
        !isDeepStrictEqual(lineage.sourceGeneration, this.sourceGeneration) ||
        !isDeepStrictEqual(lineage.datasetLineage, this.datasetLineage)
      )
        throw new Error('恢复测试期间源码、运行进程、构建或演练收据发生变化')
      const outputs = proofPaths(this.restoreId)
      const evidence = buildRestoreEvidence({
        bindingsBytes: binding.bytes,
        runtimeBytes: runtime.bytes,
        targetPlanBytes: target.bytes,
        verifiedRuntimeDigest: digest,
        frontendEndpoint: this.verification.baseURL,
        runtimeEvidencePath: outputs.runtime,
        targetPlanPath: target.path,
        sourceGeneration: lineage.sourceGeneration,
        datasetLineage: lineage.datasetLineage,
        runnerRoot: this.runnerRoot,
        runnerSha: this.runnerSha,
        verifierRoot: this.verifierRoot,
        verifierSha: this.verifierSha,
        started: this.started,
        completed: Date.now(),
        runs: this.runs,
        status: result.status,
      })
      publishProof(proofFiles(outputs, evidence.proof, runtime.bytes, evidence.testsBytes))
    } catch (error) {
      console.error(error instanceof Error ? error.message : '恢复证明生成失败')
      return { status: 'failed' }
    }
  }
}
