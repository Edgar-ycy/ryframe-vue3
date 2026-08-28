import assert from 'node:assert/strict'
import test from 'node:test'
import {
  boundaryViolation,
  containsDefineStoreCall,
  externalPackageTarget,
  extractImportSpecifiers,
  moduleArea,
  resolveImportTarget,
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
  assert.equal(externalPackageTarget('@tanstack/vue-query'), 'package:@tanstack/vue-query')
  assert.equal(externalPackageTarget('vue-router/dist/foo'), 'package:vue-router')
  assert.equal(resolveImportTarget('src/app/a.ts', 'pinia', modules), 'package:pinia')
  assert.equal(moduleArea('src/api/internal.ts'), 'api-core')
  assert.equal(moduleArea('src/api/generated/operations/system.ts'), 'generated')
})

test('边界规则要求 Store 只依赖中立类型并拒绝直接依赖 API', () => {
  assert.equal(
    boundaryViolation({
      kind: 'type',
      source: 'src/stores/user.ts',
      target: 'src/api/modules/auth.ts',
    }),
    'stores 不得依赖 api-modules',
  )
  assert.equal(
    boundaryViolation({
      kind: 'type',
      source: 'src/stores/user.ts',
      target: 'src/shared/session/contracts.ts',
    }),
    undefined,
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/stores/user.ts',
      target: 'src/stores/permission.ts',
    }),
    'stores 不得跨 Store 编排',
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/stores/user.ts',
      target: 'package:element-plus',
    }),
    'stores 不得依赖运行时包 element-plus',
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/api/modules/user.ts',
      target: 'package:@tanstack/vue-query',
    }),
    'api-modules 不得直接依赖外部包 @tanstack/vue-query',
  )
  assert.equal(
    boundaryViolation({
      kind: 'type',
      source: 'src/api/modules/user.ts',
      target: 'package:axios',
    }),
    'api-modules 不得直接依赖外部包 axios',
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/api/modules/user.ts',
      target: 'src/api/operationRequest.ts',
    }),
    'operationRequest 只能由生成 caller 调用',
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/shared/http/client.ts',
      target: 'package:element-plus',
    }),
    'shared/http 不得依赖外部包 element-plus',
  )
  assert.equal(
    boundaryViolation({
      kind: 'runtime',
      source: 'src/shared/http/client.ts',
      target: 'package:axios',
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
      source: 'src/router/index.ts',
      target: 'src/app/session.ts',
    }),
    'router 不得依赖 app',
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

test('识别 Store 定义，供目录门禁拒绝目录外定义', () => {
  assert.equal(containsDefineStoreCall(`const store = defineStore('user', {})`), true)
  assert.equal(
    containsDefineStoreCall(
      `import { defineStore as createStore } from 'pinia'; createStore('user', {})`,
    ),
    true,
  )
  assert.equal(containsDefineStoreCall(`pinia.defineStore('user', {})`), true)
  assert.equal(containsDefineStoreCall(`const defineStoreName = 'defineStore'`), false)
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
