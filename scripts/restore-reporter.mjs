import { execFileSync } from 'node:child_process'
import { existsSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildRestoreProof, restoreProofBindings } from './restore-proof.mjs'
import { sha256 } from './restore-build.mjs'
import { evidenceDirectory, evidenceFile, verifyRuntime } from './restore-verification.mjs'

function verifiedCheckout(directory, sha) {
  const root = evidenceDirectory(directory, '源码目录')
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true }).trim()
  if (
    realpathSync.native(git('rev-parse', '--show-toplevel')) !== root ||
    git('rev-parse', 'HEAD') !== sha ||
    git('status', '--porcelain', '--untracked-files=all')
  )
    throw new Error('恢复证明要求使用与备份/演练绑定 SHA 一致的干净仓库根目录')
  return root
}

function proofFiles(proof, runtimeBytes, runs) {
  const root = evidenceDirectory(path.resolve('.local-tests/playwright-real'), '恢复证明输出目录')
  const prefix = path.join(root, `restore-${proof.restore_id}`)
  return [
    { path: `${prefix}-runtime.json`, bytes: runtimeBytes },
    { path: `${prefix}-tests.json`, bytes: Buffer.from(JSON.stringify(runs, null, 2) + '\n') },
    { path: `${prefix}.json`, bytes: Buffer.from(JSON.stringify(proof, null, 2) + '\n') },
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

export default class RestoreReporter {
  runs = []

  constructor({ verify = verifyRuntime, checkout = verifiedCheckout, expectedBinding } = {}) {
    this.verify = verify
    this.checkout = checkout
    this.expectedBinding = expectedBinding
  }

  onBegin(config) {
    this.started = Date.now()
    const input = process.env.RYFRAME_RESTORE_BINDINGS
    if (!input || !this.expectedBinding) throw new Error('恢复证明 reporter 未绑定配置预检结果')
    const binding = evidenceFile(input, '恢复绑定收据')
    if (
      binding.path !== this.expectedBinding.bindingPath ||
      sha256(binding.bytes) !== this.expectedBinding.bindingSha256
    )
      throw new Error('恢复绑定收据与配置预检结果不一致')
    const { bindings, record, manifest } = restoreProofBindings(binding.bytes)
    const scope = (process.env.RYFRAME_E2E_SCOPE_ID || process.env.APP_SCOPE_ID)?.trim()
    const backend = process.env.RYFRAME_RESTORE_BACKEND_DIR
    if (!scope || scope !== record.plan.scope_id || !backend)
      throw new Error('恢复验收 scope 或后端源码目录未显式绑定')
    const frontendRoot = this.checkout(process.cwd(), record.plan.frontend_sha)
    const backendRoot = this.checkout(backend, manifest.source_sha)
    const urls = new Set(config.projects.map((project) => project.use.baseURL))
    const receipt = process.env.RYFRAME_RESTORE_RUNTIME_RECEIPT
    if (!receipt || urls.size !== 1 || typeof [...urls][0] !== 'string' || ![...urls][0])
      throw new Error('恢复验收必须绑定运行产物收据与唯一浏览器地址')
    const runtime = evidenceFile(receipt, '运行产物收据')
    this.bindings = bindings
    this.bindingsBytes = binding.bytes
    this.bindingDigest = sha256(binding.bytes)
    this.verification = {
      receipt: runtime.path,
      bindings: binding.path,
      backend: backendRoot,
      frontend: frontendRoot,
      baseURL: [...urls][0],
    }
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
      const digest = this.verify(this.verification)
      const runtime = evidenceFile(this.verification.receipt, '运行产物收据')
      const binding = evidenceFile(this.verification.bindings, '恢复绑定收据')
      if (
        digest !== this.runtimeDigest ||
        sha256(runtime.bytes) !== digest ||
        sha256(binding.bytes) !== this.bindingDigest ||
        !binding.bytes.equals(this.bindingsBytes)
      )
        throw new Error('恢复测试期间源码、运行进程、构建或演练收据发生变化')
      const proof = buildRestoreProof({
        bindingsBytes: binding.bytes,
        runtimeBytes: runtime.bytes,
        verifiedRuntimeDigest: digest,
        started: this.started,
        completed: Date.now(),
        runs: this.runs,
        status: result.status,
      })
      publishProof(proofFiles(proof, runtime.bytes, this.runs))
    } catch (error) {
      console.error(error instanceof Error ? error.message : '恢复证明生成失败')
      return { status: 'failed' }
    }
  }
}
