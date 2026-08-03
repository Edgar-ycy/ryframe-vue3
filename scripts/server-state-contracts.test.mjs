import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasRuntimeApiModuleImport,
  runtimeApiImportNames,
  validateServerStateInventory,
  validateServerStateSource,
} from './server-state-contracts.mjs'

test('识别运行时 API 导入但忽略纯类型导入', () => {
  const source = `
    import { computed } from 'vue'
    import { listUser, type UserRecord } from '@/api/modules/user'
    import type { RoleRecord } from '@/api/modules/role'
  `
  assert.deepEqual([...runtimeApiImportNames(source)], ['listUser'])
  assert.equal(hasRuntimeApiModuleImport(source), true)
  assert.equal(hasRuntimeApiModuleImport(
    "import type { UserRecord } from '@/api/modules/user'",
  ), false)
})

test('拒绝缺少 Query/Mutation、手工 pending、挂载直拉和注释式空 catch', () => {
  const source = `
    import { listUser } from '@/api/modules/user'
    const loading = ref(false)
    onMounted(() => fetchData())
    async function fetchData() {
      try { await listUser({}) } catch { /* 已由统一层处理 */ }
    }
  `
  const errors = validateServerStateSource('src/views/system/user/example.vue', source, [
    'useTenantQuery',
    'useTenantMutation',
  ])
  assert.equal(errors.length, 5)
  assert.match(errors.join('\n'), /manual server-state pending ref/u)
  assert.match(errors.join('\n'), /must not be pulled from onMounted/u)
  assert.match(errors.join('\n'), /swallowed by an empty catch/u)
})

test('允许 DOM 生命周期和包含明确处理逻辑的 catch', () => {
  const source = `
    import { useTenantQuery } from '@/shared/query/useTenantQuery'
    onMounted(() => inputRef.value?.focus())
    try { await refresh() } catch (error) { reportError(error) }
  `
  assert.deepEqual(
    validateServerStateSource('src/views/system/example.vue', source, ['useTenantQuery']),
    [],
  )
})

test('拒绝未登记的管理页面 API 入口并保留明确豁免', () => {
  const sources = new Map([
    ['src/views/system/new-page.vue', "import { listUser } from '@/api/modules/user'"],
    ['src/views/login/index.vue', "import { login } from '@/api/modules/auth'"],
    ['src/views/system/type-only.vue', "import type { UserRecord } from '@/api/modules/user'"],
  ])
  const contracts = new Map()
  const exemptions = new Set(['src/views/login/index.vue'])
  assert.deepEqual(validateServerStateInventory(sources, contracts, exemptions), [
    'src/views/system/new-page.vue: runtime API entry is missing a server-state contract',
  ])
})
