import assert from 'node:assert/strict'
import test from 'node:test'
import {
  businessCatalogImportViolation,
  businessCatalogIsolationFailures,
  collectInitialGraph,
  findNamedChunk,
  findOptionalNamedChunk,
} from '../bundle-manifest-policy.mjs'

const businessCatalogSources = [
  'src/i18n/catalog/system.ts',
  'src/i18n/catalog/system/en-US.ts',
  'src/i18n/catalog/system/messages/zh-CN.ts',
]

function manifestWithInitialImports(imports) {
  return {
    'index.html': { file: 'assets/index.js', isEntry: true, imports },
    '_api-core.js': { file: 'assets/api-core.js', name: 'api-core' },
    '_api-system.js': { file: 'assets/api-system.js', name: 'api-system' },
    '_i18n-core.js': { file: 'assets/i18n-core.js', name: 'i18n-core' },
    'src/i18n/catalog/core.ts': {
      file: 'assets/i18n-core.js',
      src: 'src/i18n/catalog/core.ts',
    },
    'src/i18n/catalog/system.ts': {
      file: 'assets/system.js',
      src: 'src/i18n/catalog/system.ts',
      isDynamicEntry: true,
    },
  }
}

test('initial graph permits only synchronous i18n catalogs', () => {
  const manifest = manifestWithInitialImports(['_i18n-core.js'])
  const graph = collectInitialGraph(manifest)

  assert.deepEqual(businessCatalogIsolationFailures(manifest, graph, businessCatalogSources), [])
  assert.equal(findNamedChunk(manifest, 'i18n-core').file, 'assets/i18n-core.js')
  assert.equal(findNamedChunk(manifest, 'api-core').file, 'assets/api-core.js')
  assert.equal(findOptionalNamedChunk(manifest, 'api-agent'), undefined)
})

test('initial graph rejects a business catalog chunk', () => {
  const manifest = manifestWithInitialImports(['_i18n-core.js', 'src/i18n/catalog/system.ts'])
  const graph = collectInitialGraph(manifest)

  assert.deepEqual(businessCatalogIsolationFailures(manifest, graph, businessCatalogSources), [
    'business catalog entered initial graph: src/i18n/catalog/system.ts',
  ])
})

test('business catalogs must remain isolated dynamic entries', () => {
  const manifest = manifestWithInitialImports(['_i18n-core.js'])
  delete manifest['src/i18n/catalog/system.ts']
  const graph = collectInitialGraph(manifest)

  assert.deepEqual(businessCatalogIsolationFailures(manifest, graph, businessCatalogSources), [
    'business catalog is not an isolated dynamic entry: src/i18n/catalog/system.ts',
  ])
})

test('business catalog children are owned by their top-level entry recursively', () => {
  assert.equal(
    businessCatalogImportViolation({
      kind: 'runtime',
      source: 'src/i18n/catalog/system.ts',
      target: 'src/i18n/catalog/system/messages/zh-CN.ts',
    }),
    undefined,
  )
  assert.equal(
    businessCatalogImportViolation({
      kind: 'runtime',
      source: 'src/i18n/messages.ts',
      target: 'src/i18n/catalog/system/messages/zh-CN.ts',
    }),
    'business catalog child must be statically imported by src/i18n/catalog/system.ts: src/i18n/catalog/system/messages/zh-CN.ts',
  )
})

test('business catalog owners must statically import children while core remains exempt', () => {
  assert.equal(
    businessCatalogImportViolation({
      kind: 'dynamic',
      source: 'src/i18n/catalog/system.ts',
      target: 'src/i18n/catalog/system/en-US.ts',
    }),
    'business catalog child must be statically imported by src/i18n/catalog/system.ts: src/i18n/catalog/system/en-US.ts',
  )
  assert.equal(
    businessCatalogImportViolation({
      kind: 'runtime',
      source: 'src/i18n/messages.ts',
      target: 'src/i18n/catalog/core/en-US.ts',
    }),
    undefined,
  )
})

test('manifest imports must resolve to a known chunk', () => {
  const manifest = manifestWithInitialImports(['missing.js'])
  assert.throws(() => collectInitialGraph(manifest), /Manifest import is missing/)
})
