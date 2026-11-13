// 与后端固定适配登记共同绑定原产品、完整执行树及组合补丁。
export const b0Adapter = Object.freeze({
  contract: 'legacy-stable-readiness-b0-v1',
  backendProduct: '815c5eafb09d4b493319d255fb7ab88ddd02c8b6',
  backendExecution: 'c9d88b76a3b768da672855f94fd9233779f8878f',
  frontend: '0087ea2ecf62530d042b9e52f5c950fb34c66d78',
  tree: 'dee141b8d481f4cd7fc9da3896c3b311e84cb66c',
  patch: 'xtask/assets/baseline-adapters/stable-readiness-b0-v1.patch',
  patchBytes: 189974,
  patchSha256: 'ed1a97da064e58ffb35c1eeb5a748cbfce7c567f9d19141de907d2cd982f5307',
  paths: Object.freeze([
    'catalog/migrations.lock.toml',
    'crates/ryframe-db/src/entities/background_job.rs',
    'crates/ryframe-db/src/migration/baseline_contract.rs',
    'crates/ryframe-db/src/migration/m20260820_000000_control_baseline/backup.rs',
    'crates/ryframe-db/src/migration/m20260820_000000_control_baseline/base.rs',
    'crates/ryframe-db/src/migration/m20260820_000000_control_baseline/base/tables.rs',
    'crates/ryframe-db/src/migration/m20260820_000000_control_baseline/jobs.rs',
    'crates/ryframe-db/src/migration/m20260820_000000_control_baseline/mod.rs',
    'crates/ryframe-db/src/migration/m20260820_000000_control_baseline/schema.rs',
    'crates/ryframe-db/src/migration/m20261013_000000_password_change.rs',
    'crates/ryframe-db/src/migration/m20261017_000000_data_scope_projection.rs',
    'crates/ryframe-db/src/migration/mod.rs',
    'crates/ryframe-db/src/migration/schema.rs',
    'crates/ryframe-db/src/migration/schema/business_migration_ledger.rs',
    'crates/ryframe-db/src/migration/schema/expected.rs',
    'crates/ryframe-db/src/migration/schema/expected/clauses.rs',
    'crates/ryframe-db/src/migration/schema/inspect.rs',
    'crates/ryframe-db/src/migration/schema/normalize.rs',
    'crates/ryframe-db/src/migration/schema/normalize/check.rs',
    'crates/ryframe-db/src/migration/schema/normalize/check/rules.rs',
    'crates/ryframe-db/src/migration/schema/types.rs',
    'crates/ryframe-db/src/migration/schema/verify.rs',
    'crates/ryframe-db/src/migration/schema/verify/ledger_tests.rs',
    'crates/ryframe-db/src/repositories/background_job_repo/claim.rs',
    'crates/ryframe-db/src/repositories/background_job_repo/enqueue.rs',
    'crates/ryframe-db/tests/mapping_contracts/export_mappings.rs',
    'crates/ryframe-db/tests/mapping_contracts/job_and_file_mappings.rs',
    'crates/ryframe-db/tests/mapping_contracts/migration_contracts.rs',
    'crates/ryframe-tenant-db/src/migration/catalog.rs',
    'crates/ryframe-tenant-db/src/migration/database_adapter.rs',
    'crates/ryframe-tenant-db/src/migration/m20260820_000000_tenant_baseline.rs',
    'crates/ryframe-tenant-db/src/migration/m20261017_000000_data_scope_projection.rs',
    'crates/ryframe-tenant-db/src/migration/mod.rs',
    'crates/ryframe-tenant-db/src/migration/runtime.rs',
    'crates/ryframe-tenant-db/src/migration/schema.rs',
    'crates/ryframe-tenant-db/tests/tenant_mapping_contracts/migration_contracts.rs',
    'sql/ryframe_config.sql',
    'xtask/src/cli.rs',
  ]),
})

export function b0AdapterEvidence() {
  return {
    contract: b0Adapter.contract,
    base_backend_sha: b0Adapter.backendProduct,
    base_frontend_sha: b0Adapter.frontend,
    reference_adapter_sha: b0Adapter.backendExecution,
    adapter_tree: b0Adapter.tree,
    reconstructed_tree: b0Adapter.tree,
    adapter_paths: [...b0Adapter.paths],
    patch: { path: b0Adapter.patch, bytes: b0Adapter.patchBytes, sha256: b0Adapter.patchSha256 },
  }
}

export function isB0Authority(authority) {
  return (
    authority.backend_adapter_contract === b0Adapter.contract &&
    authority.backend_product_sha === b0Adapter.backendProduct &&
    authority.backend_execution_sha === b0Adapter.backendExecution &&
    authority.frontend_sha === b0Adapter.frontend
  )
}
