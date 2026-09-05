import path from 'node:path'

export const restoreSpecs = [
  'full-stack',
  'session',
  'notice',
  'post-export',
  'product-tenant',
  'config-transfer',
  'user-import',
  'upload-limits',
  'schedule',
  'data-migration',
  'restore-existing',
].map((name) => `**/${name}.spec.ts`)

export function realTestSelection(bindings, fixture) {
  const receipt = typeof bindings === 'string' ? bindings.trim() : ''
  if (!receipt) return { testIgnore: ['**/restore-existing.spec.ts'] }
  if (!path.isAbsolute(receipt)) throw new Error('恢复绑定收据必须使用明确绝对路径')
  if (fixture !== 'core') throw new Error('恢复业务证明必须使用完整 core 业务套件')
  return { testMatch: [...restoreSpecs] }
}
