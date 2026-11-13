import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { datasetDigest } from '../restore-dataset.mjs'
import {
  b0BuildSources,
  legacyB0FrontendBuild,
  restoreRuntimeFixture,
} from './build-receipt-fixture.mjs'

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

export function fixture(options = {}) {
  const directory = temporaryRoot()
  const value = restoreRuntimeFixture({
    directory,
    backupSourceSha: 'a'.repeat(40),
    ...b0BuildSources,
    frontendBuildReceipt: legacyB0FrontendBuild,
  })
  const coordinatorRoot = path.join(directory, 'coordinator')
  const verifierRoot = path.join(directory, 'verifier')
  for (const item of [coordinatorRoot, verifierRoot, value.paths.backendExecutionRoot])
    mkdirSync(item, { recursive: true })
  const lineage = {
    tenants: Array.from({ length: 11 }, (_, index) => ({ tenant_id: `tenant-${index}` })),
    scale: { tenants: 11, post_samples: 33, business_objects: 256 },
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
  const calls = []
  const toolChecks = []
  const tool = {
    root: verifierRoot,
    executable: path.join(verifierRoot, 'registered-xtask'),
    verifyUnchanged: () => toolChecks.push('verify'),
  }
  const execute = (program, args, settings) => {
    toolChecks.push('execute')
    calls.push({ program, args, settings })
    if (options.failure) throw new Error(options.failure)
    return JSON.stringify({ ok: true, result: { value: options.authority ?? authority } })
  }
  const input = {
    bindingsBytes: value.bindingsBytes,
    runtimeReceipt: runtimeFile,
    targetPlan: targetPlanFile,
    backendRoot: coordinatorRoot,
    frontendEndpoint: value.runtime.endpoints.frontend,
    tool,
  }
  return {
    authority,
    calls,
    directory,
    execute,
    input,
    lineage,
    toolChecks,
    value,
    coordinatorRoot,
    verifierRoot,
  }
}
