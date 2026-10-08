import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { sha256 } from '../build-source-inventory.mjs'

function writeDescriptor(directory, name, value) {
  const filename = path.join(directory, name)
  mkdirSync(path.dirname(filename), { recursive: true })
  const bytes = Buffer.from(JSON.stringify(value))
  writeFileSync(filename, bytes)
  return Object.freeze({ path: filename, bytes: bytes.byteLength, sha256: sha256(bytes) })
}

/** 为纯前端测试构造最小 descriptor 链；完整业务 schema 仍由后端 fixture 覆盖。 */
export function restoreLineageFixture(directory, targetPlan, options = {}) {
  const lineage = {
    format_version: 1,
    kind: 'restore-source-derived-dataset-lineage',
    status: 'derived_dataset_verified',
    restore_qualified: false,
  }
  const datasetLineage = writeDescriptor(directory, 'generation/dataset-lineage.json', lineage)
  const alternateLineage = writeDescriptor(directory, 'generation/other-lineage.json', lineage)
  const start = writeDescriptor(directory, 'results/start.json', {
    dataset_lineage: datasetLineage,
    status: 'seed_source_generation_running',
  })
  const sourceRuntime = writeDescriptor(directory, 'generation/verification/source-runtime.json', {
    format_version: 2,
    kind: 'restore-source-runtime',
    status: 'source_runtime_verified',
    source_generation: start,
    dataset_lineage: options.mismatchedRuntime ? alternateLineage : datasetLineage,
  })
  const sourceGeneration = writeDescriptor(directory, 'results/stop.json', {
    status: 'seed_source_generation_published',
    start,
    source_runtime: sourceRuntime,
    dataset_lineage: datasetLineage,
  })
  const alternateGeneration = writeDescriptor(directory, 'results/other-stop.json', {
    status: 'seed_source_generation_published',
  })
  const backup = writeDescriptor(directory, 'backup.json', {
    command: 'backup',
    status: 'completed',
    result: {
      format_version: options.backupVersion ?? 2,
      kind: 'restore-reference-backup',
      source_generation: sourceGeneration,
      source_export: {
        source_generation: options.mismatchedExport ? alternateGeneration : sourceGeneration,
      },
    },
  })
  const plan = structuredClone(targetPlan)
  plan.backup_receipt = backup
  return Object.freeze({
    bytes: Buffer.from(JSON.stringify(plan)),
    datasetLineage,
    lineage,
    sourceGeneration,
    sourceRuntime,
  })
}
