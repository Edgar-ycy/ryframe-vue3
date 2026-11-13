import { b0Adapter, b0AdapterEvidence } from '../restore-b0-adapter.mjs'
import path from 'node:path'

import { canonicalDigest, sha256 } from '../build-source-inventory.mjs'

const emptyGroup = () => ({ sha256: canonicalDigest([]), files: [] })

function inventory(head) {
  return {
    source: {
      snapshot: { head, patch_sha256: 'd'.repeat(64), files: [], clean: true },
      worktree_fingerprint: `sha256:${'1'.repeat(64)}`,
    },
    files: [],
    guard: { head, index_sha256: '2'.repeat(64), modes_sha256: '3'.repeat(64) },
  }
}

const backendBuildJobs = '1'

function backendCommand(role) {
  const [feature, name] = role === 'api' ? ['bin-api', 'ryframe'] : ['bin-worker', 'ryframe-worker']
  return [
    'cargo',
    'build',
    '--locked',
    '-p',
    'ryframe',
    '--no-default-features',
    '--features',
    feature,
    '--bin',
    name,
    '--jobs',
    backendBuildJobs,
    '--message-format=json',
  ]
}

export function backendBuild(head, artifact) {
  return {
    format_version: 2,
    kind: 'restore-backend-build',
    sources: {
      product: { api: emptyGroup(), worker: emptyGroup() },
      tools: emptyGroup(),
      full: inventory(head),
    },
    build: {
      commands: { api: backendCommand('api'), worker: backendCommand('worker') },
      profile: 'dev',
      target: 'x86_64-pc-windows-msvc',
      jobs: backendBuildJobs,
      toolchain: { cargo: 'cargo 1.91.0', rustc: 'rustc 1.91.0\nhost: x86_64-pc-windows-msvc' },
      environment: { variables: [], sha256: canonicalDigest([]) },
    },
    artifacts: {
      api: artifact('api', '3'.repeat(64)),
      worker: artifact('worker', '4'.repeat(64)),
    },
  }
}

export function frontendBuild(head, files) {
  return {
    format_version: 3,
    kind: 'restore-frontend-build',
    sources: {
      product: { frontend: emptyGroup() },
      tools: emptyGroup(),
      full: inventory(head),
    },
    build: {
      command: ['vite', 'build'],
      mode: 'production',
      target: 'vite-default',
      toolchain: {
        node: 'v24.0.0',
        pnpm: { pinned: '11.20.0', observed: '11.20.0' },
        vite: '7.1.7',
      },
      configuration: {
        environment: 'test',
        directory: 'config',
        files: [{ path: 'config/app.test.toml', sha256: '6'.repeat(64) }],
        tools: [],
      },
      identity: {
        frontend_commit: head,
        source_file: { path: '.local-tests/build/source.json', sha256: '7'.repeat(64) },
      },
    },
    files,
  }
}

export function artifactFactory(directory = process.cwd()) {
  return (role, digest) => ({
    executable: path.resolve(directory, `${role}.exe`),
    command: backendCommand(role),
    bytes: 1,
    sha256: digest,
  })
}

export const jsonBytes = (value) => Buffer.from(JSON.stringify(value))

export const b0BuildSources = {
  backendProductSha: b0Adapter.backendProduct,
  backendExecutionSha: b0Adapter.backendExecution,
  frontendSha: b0Adapter.frontend,
}

export function legacyB0FrontendBuild(head, files) {
  const file = { path: path.resolve('fixture-tool'), bytes: 1, sha256: '0'.repeat(64) }
  return {
    format_version: 1,
    kind: 'restore-legacy-b0-frontend-build',
    adapter: { contract: 'legacy-stable-readiness-b0-frontend-v1', sources: [], program: file },
    sources: frontendBuild(head, files).sources,
    build: {
      command: ['corepack', 'pnpm', 'build'],
      mode: 'production',
      toolchain: {
        node: { version: 'v24.15.0', file },
        corepack: { version: '0.36.0', entry: file, implementation: file, package: file },
        pnpm: {
          version: '11.20.0',
          home: path.resolve('fixture-corepack-home'),
          package: file,
          entry: file,
          implementation: file,
          installation: [],
        },
        vite: { version: '8.1.5', package: file, entry: file },
      },
      configuration: {
        api_origin: 'same-origin',
        frontend_tree: '52fed4e1321ab4b4c04839a3a165c6bd1645e4b6',
        inputs: [],
        dependency_state: [],
      },
      identity: { frontend_commit: head, source_file: null },
    },
    files,
  }
}

export function restoreRuntimeFixture({
  directory = process.cwd(),
  id = 'restore-v3',
  backupId = 'backup-v3',
  scopeId = 'target-v3',
  backupSourceSha = 'a'.repeat(40),
  backendProductSha = backupSourceSha,
  backendExecutionSha = backendProductSha,
  frontendSha = 'b'.repeat(40),
  frontendBuildReceipt = frontendBuild,
  dataVerifiedAt = '2026-09-06T00:10:00Z',
} = {}) {
  const candidate = backendProductSha === backendExecutionSha
  const executionRoot = path.resolve(directory, candidate ? 'backend' : 'backend-execution')
  const productRoot = candidate ? executionRoot : path.resolve(directory, 'backend-product')
  const frontendRoot = path.resolve(directory, 'frontend')
  const plan = {
    id,
    backup_id: backupId,
    scope_id: scopeId,
    fault_at: '2026-09-06T00:00:00Z',
    databases: [
      {
        source_key: 'control',
        target_key: 'control',
        server_uuid: 'server-one',
        database: 'restore_control',
      },
    ],
    object_endpoint: 'http://127.0.0.1:9000',
    object_prefix: `${scopeId}/`,
    api_ready_url: 'http://127.0.0.1:8080/readyz',
    worker_ready_url: 'http://127.0.0.1:9091/readyz',
    frontend_sha: frontendSha,
  }
  const binding = {
    record: {
      status: 'data_verified',
      plan_hash: sha256(jsonBytes(plan)),
      data_verified_at: dataVerifiedAt,
      plan,
    },
    manifest: { id: backupId, scope_id: 'source-v3', source_sha: backupSourceSha },
  }
  const bindingsBytes = jsonBytes(binding)
  const artifacts = artifactFactory(directory)
  const backend = backendBuild(backendExecutionSha, artifacts)
  const frontendFiles = [
    { path: '.vite/manifest.json', bytes: 1, sha256: '5'.repeat(64) },
    { path: 'index.html', bytes: 1, sha256: '6'.repeat(64) },
  ]
  const frontend = frontendBuildReceipt(frontendSha, frontendFiles)
  const paths = {
    backendProductRoot: productRoot,
    backendExecutionRoot: executionRoot,
    frontendRoot,
    runtimeDir: path.resolve(directory, 'runtime'),
    bindings: path.resolve(directory, 'bindings.json'),
    backendBuild: path.resolve(directory, 'backend-build.json'),
    frontendBuild: path.resolve(directory, 'frontend-build.json'),
    launch: path.resolve(directory, 'runtime-launch.json'),
  }
  const digests = {
    bindings: sha256(bindingsBytes),
    backendBuild: 'd'.repeat(64),
    frontendBuild: 'e'.repeat(64),
    launch: 'f'.repeat(64),
  }
  const adapter = candidate ? null : b0AdapterEvidence()
  const targetPlan = {
    format_version: 1,
    kind: 'restore-reference-target-plan',
    target_side: candidate ? 'candidate' : 'base',
    reference_plan_sha256: '4'.repeat(64),
    backup_receipt: {},
    comparison_sources: {},
    comparison_arm: candidate ? 'b1' : 'b0',
    comparison_arm_sha256: '5'.repeat(64),
    arm_input: {},
    fresh_target: {},
    maintenance_execution: {},
    product_execution: {
      roots: {
        source_backend: productRoot,
        execution_backend: executionRoot,
        frontend: frontendRoot,
      },
      backend_product_sha: backendProductSha,
      backend_execution_sha: backendExecutionSha,
      frontend_sha: frontendSha,
      builds: {
        backend: { path: paths.backendBuild, bytes: 1, sha256: digests.backendBuild },
        frontend: { path: paths.frontendBuild, bytes: 1, sha256: digests.frontendBuild },
      },
      adapter,
    },
    product_plan_file: {},
    product_plan: plan,
    product_plan_sha256: canonicalDigest(plan),
  }
  const process = (role, index) => ({
    receipt_path: path.resolve(paths.runtimeDir, `${role}.json`),
    receipt_sha256: String(index).repeat(64),
    identity: {
      pid: 100 + index,
      started: `${role}-started`,
      executable:
        role === 'frontend'
          ? path.resolve(directory, 'python.exe')
          : artifacts(role, '').executable,
    },
  })
  const runtime = {
    format_version: 3,
    kind: 'restore-runtime',
    restore: {
      id,
      backup_id: backupId,
      plan_hash: binding.record.plan_hash,
      scope_id: scopeId,
      data_verified_at: dataVerifiedAt,
    },
    paths: {
      backend_product_root: productRoot,
      backend_execution_root: executionRoot,
      frontend_root: frontendRoot,
      runtime_dir: paths.runtimeDir,
      bindings: paths.bindings,
      backend_build: paths.backendBuild,
      frontend_build: paths.frontendBuild,
      launch: paths.launch,
    },
    digests: {
      bindings: digests.bindings,
      backend_build: digests.backendBuild,
      frontend_build: digests.frontendBuild,
      launch: digests.launch,
    },
    source: {
      backup_source_sha: backupSourceSha,
      backend_product_sha: backendProductSha,
      backend_execution_sha: backendExecutionSha,
      backend_adapter_contract: adapter?.contract ?? null,
      frontend_sha: frontendSha,
    },
    endpoints: {
      api: plan.api_ready_url,
      worker: plan.worker_ready_url,
      frontend: 'http://127.0.0.1:4174',
    },
    backend,
    frontend,
    processes: {
      api: process('api', 1),
      worker: process('worker', 2),
      frontend: process('frontend', 3),
    },
  }
  return {
    adapter,
    binding,
    bindings: binding,
    bindingsBytes,
    frontendFiles,
    paths,
    runtime,
    runtimeBytes: jsonBytes(runtime),
    targetPlan,
    targetPlanBytes: jsonBytes(targetPlan),
  }
}
