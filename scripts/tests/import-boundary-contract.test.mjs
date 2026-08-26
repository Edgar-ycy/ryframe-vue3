import assert from 'node:assert/strict'
import test from 'node:test'
import {
  boundaryViolation,
  compareImportBaseline,
  createImportBaseline,
  extractImportSpecifiers,
  moduleArea,
  resolveInternalSpecifier,
  runtimeCycleEdges,
} from '../import-boundary-contract.mjs'

test('区分运行时、类型和动态导入', () => {
  const imports = extractImportSpecifiers(`
    import value from '@/stores/user'
    import type { User } from '@/api/modules/auth'
    import { type Id } from '@/shared/http/types'
    export type { Route } from '@/router/pageRegistry'
    export { type Menu } from '@/api/modules/menu'
    const page = import('@/views/index.vue')
  `)
  assert.deepEqual(imports, [
    { kind: 'runtime', specifier: '@/stores/user' },
    { kind: 'type', specifier: '@/api/modules/auth' },
    { kind: 'type', specifier: '@/shared/http/types' },
    { kind: 'type', specifier: '@/router/pageRegistry' },
    { kind: 'type', specifier: '@/api/modules/menu' },
    { kind: 'dynamic', specifier: '@/views/index.vue' },
  ])
})

test('解析别名、相对路径和目录入口', () => {
  const modules = new Set(['src/stores/user.ts', 'src/app/session/index.ts'])
  assert.equal(
    resolveInternalSpecifier('src/app/a.ts', '@/stores/user', modules),
    'src/stores/user.ts',
  )
  assert.equal(
    resolveInternalSpecifier('src/app/a.ts', './session', modules),
    'src/app/session/index.ts',
  )
  assert.equal(resolveInternalSpecifier('src/app/a.ts', 'vue', modules), undefined)
  assert.equal(moduleArea('src/api/internal.ts'), 'api-core')
  assert.equal(moduleArea('src/api/generated/operations.ts'), 'generated')
})

test('边界规则允许类型 DTO 但拒绝 Store 直接调用 API', () => {
  assert.equal(
    boundaryViolation({
      kind: 'type',
      source: 'src/stores/user.ts',
      target: 'src/api/modules/auth.ts',
    }),
    undefined,
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/stores/user.ts',
      target: 'src/api/modules/auth.ts',
    }),
    'stores 不得直接调用 API 模块',
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/app/session.ts',
      target: 'src/router/index.ts',
    }),
    'app 不得依赖 router',
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/shared/http/client.ts',
      target: 'src/i18n/index.ts',
    }),
    'shared 不得依赖 i18n',
  )
  assert.equal(
    boundaryViolation({
      kind: 'dynamic',
      source: 'src/features/system/pages.ts',
      target: 'src/views/system/user/index.vue',
    }),
    undefined,
  )
})

test('SCC 只统计静态运行时导入', () => {
  const modules = new Set(['src/a.ts', 'src/b.ts', 'src/c.ts'])
  const edges = [
    { kind: 'runtime', source: 'src/a.ts', target: 'src/b.ts' },
    { kind: 'runtime', source: 'src/b.ts', target: 'src/a.ts' },
    { kind: 'dynamic', source: 'src/c.ts', target: 'src/c.ts' },
  ]
  assert.deepEqual(runtimeCycleEdges(modules, edges), edges.slice(0, 2))
})

test('迁移基线只允许债务减少', () => {
  const baseline = createImportBaseline(['old-edge'], ['old-cycle'])
  const reduced = compareImportBaseline(createImportBaseline([], []), baseline)
  assert.deepEqual(reduced.newForbiddenEdges, [])
  assert.deepEqual(reduced.resolvedForbiddenEdges, ['old-edge'])

  const increased = compareImportBaseline(
    createImportBaseline(['new-edge'], ['new-cycle']),
    baseline,
  )
  assert.deepEqual(increased.newForbiddenEdges, ['new-edge'])
  assert.deepEqual(increased.newRuntimeCycleEdges, ['new-cycle'])
})
