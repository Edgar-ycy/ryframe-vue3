import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { buildRestoreEvidence, restoreProofBindings } from './restore-proof.mjs'
import { sha256 } from './build-source-inventory.mjs'
import { verifyRestoreDatasetAuthority } from './restore-dataset.mjs'
import { restoreRuntimeBinding } from './restore-runtime-receipt.mjs'
import {
  evidenceDirectory,
  evidenceFile,
  verifiedCheckout,
  verifyRuntime,
} from './restore-verification.mjs'
import { bindWorkerTool } from './worker-tool.mjs'

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

function samePath(left, right) {
  const normalize = (value) => {
    const resolved = path.normalize(path.resolve(value))
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
  }
  return normalize(left) === normalize(right)
}

function boundEvidence(configured, expected, label) {
  if (
    !expected ||
    typeof expected !== 'object' ||
    Object.keys(expected).sort().join('\0') !== 'path\0sha256'
  )
    throw new Error(`恢复证明 reporter 缺少${label}预检结果`)
  const evidence = evidenceFile(configured, label)
  if (!samePath(evidence.path, expected.path) || sha256(evidence.bytes) !== expected.sha256)
    throw new Error(`${label}与配置预检结果不一致`)
  return evidence
}

export default class RestoreReporter {
  runs = []

  constructor({
    verify = verifyRuntime,
    checkout = verifiedCheckout,
    datasetAuthority = verifyRestoreDatasetAuthority,
    bindTool = bindWorkerTool,
    expectedRestore,
    browserBinding,
  } = {}) {
    this.verify = verify
    this.checkout = checkout
    this.datasetAuthority = datasetAuthority
    this.bindTool = bindTool
    this.expectedRestore = expectedRestore
    this.browserBinding = browserBinding
  }

  onBegin(config) {
    this.started = Date.now()
    const expected = this.expectedRestore
    const browser = this.browserBinding
    if (!browser?.restore) throw new Error('恢复证明 reporter 缺少浏览器文件配置绑定')
    if (!expected) throw new Error('恢复证明 reporter 未绑定配置预检结果')
    const binding = boundEvidence(browser.restore.bindings, expected.binding, '恢复绑定收据')
    const target = boundEvidence(browser.restore.targetPlan, expected.target, '恢复目标计划')
    const runtime = boundEvidence(browser.restore.runtimeReceipt, expected.runtime, '恢复运行收据')
    const { bindings, record, manifest } = restoreProofBindings(binding.bytes)
    const scope = browser.scopeId
    if (!scope || scope !== record.plan.scope_id)
      throw new Error('恢复验收 scope 或后端源码目录未显式绑定')
    const configuredCoordinatorSha = browser.restore.coordinatorSha
    const coordinatorRoot = this.checkout(
      browser.restore.coordinatorDir,
      configuredCoordinatorSha,
      '恢复证明协调后端',
    )
    if (
      configuredCoordinatorSha !== expected.coordinatorSha ||
      coordinatorRoot !== expected.coordinatorRoot
    )
      throw new Error('恢复证明协调后端与配置预检结果不一致')
    const configuredVerifierSha = browser.restore.verifierSha
    const verifierRoot = this.checkout(
      browser.restore.verifierDir,
      configuredVerifierSha,
      '恢复证明核验源码',
    )
    if (configuredVerifierSha !== expected.verifierSha || verifierRoot !== expected.verifierRoot)
      throw new Error('恢复证明核验源码与配置预检结果不一致')
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
    const configuredRunnerSha = browser.restore.runnerSha
    const runnerRoot = this.checkout(process.cwd(), configuredRunnerSha, '恢复测试 runner 源码')
    if (configuredRunnerSha !== expected.runnerSha || runnerRoot !== expected.runnerRoot)
      throw new Error('恢复测试 runner 与配置预检结果不一致')
    const tool = this.bindTool(browser.workerTool)
    if (evidenceDirectory(tool.root, '恢复核验工具来源') !== verifierRoot)
      throw new Error('恢复核验源码目录与 Worker 工具来源根不同')
    const datasetInputs = {
      bindingsBytes: binding.bytes,
      runtimeReceipt: runtime.path,
      targetPlan: target.path,
      backendRoot: coordinatorRoot,
      frontendEndpoint: baseURL,
    }
    const dataset = this.datasetAuthority(
      { ...datasetInputs, tool },
      { expected: expected.datasetAuthority },
    )
    if (
      !isDeepStrictEqual(dataset.authority.source_generation, expected.sourceGeneration) ||
      !isDeepStrictEqual(dataset.authority.dataset_lineage, expected.datasetLineage)
    )
      throw new Error('恢复数据血缘与配置预检结果不一致')
    this.bindings = bindings
    this.bindingsBytes = binding.bytes
    this.bindingDigest = sha256(binding.bytes)
    this.targetPlanBytes = target.bytes
    this.targetPlanDigest = sha256(target.bytes)
    this.sourceGeneration = dataset.authority.source_generation
    this.datasetLineage = dataset.authority.dataset_lineage
    this.datasetAuthorityRecord = dataset.authority
    this.datasetInputs = datasetInputs
    this.verification = {
      receipt: runtime.path,
      bindings: binding.path,
      targetPlan: target.path,
      backend: coordinatorRoot,
      frontend: frontendRoot,
      baseURL,
    }
    this.runnerRoot = runnerRoot
    this.runnerSha = configuredRunnerSha
    this.coordinatorRoot = coordinatorRoot
    this.coordinatorSha = configuredCoordinatorSha
    this.verifierRoot = verifierRoot
    this.verifierSha = configuredVerifierSha
    this.restoreId = record.plan.id
    this.runtimeDigest = this.verify({ ...this.verification, tool })
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
      this.checkout(this.coordinatorRoot, this.coordinatorSha, '恢复证明协调后端')
      this.checkout(this.verifierRoot, this.verifierSha, '恢复证明核验源码')
      const tool = this.bindTool(this.browserBinding.workerTool)
      if (evidenceDirectory(tool.root, '恢复核验工具来源') !== this.verifierRoot)
        throw new Error('恢复核验源码目录与 Worker 工具来源根不同')
      const digest = this.verify({ ...this.verification, tool })
      const runtime = evidenceFile(this.verification.receipt, '运行产物收据')
      const binding = evidenceFile(this.verification.bindings, '恢复绑定收据')
      const target = evidenceFile(this.verification.targetPlan, '恢复目标计划')
      const dataset = this.datasetAuthority(
        { ...this.datasetInputs, tool },
        {
          expected: this.datasetAuthorityRecord,
        },
      )
      if (
        digest !== this.runtimeDigest ||
        sha256(runtime.bytes) !== digest ||
        sha256(binding.bytes) !== this.bindingDigest ||
        !binding.bytes.equals(this.bindingsBytes) ||
        sha256(target.bytes) !== this.targetPlanDigest ||
        !target.bytes.equals(this.targetPlanBytes) ||
        !isDeepStrictEqual(dataset.authority.source_generation, this.sourceGeneration) ||
        !isDeepStrictEqual(dataset.authority.dataset_lineage, this.datasetLineage)
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
        sourceGeneration: dataset.authority.source_generation,
        datasetLineage: dataset.authority.dataset_lineage,
        runnerRoot: this.runnerRoot,
        runnerSha: this.runnerSha,
        coordinatorRoot: this.coordinatorRoot,
        coordinatorSha: this.coordinatorSha,
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
