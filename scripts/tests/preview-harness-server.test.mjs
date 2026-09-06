import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isPreviewHarnessModulePath,
  parsePreviewHarnessServerArguments,
  PreviewHarnessServerUsageError,
} from '../run-browser-preview-harness-server.mjs'

test('生产预览夹具服务只接受一个合法端口', () => {
  assert.deepEqual(parsePreviewHarnessServerArguments(['4173']), { port: 4173 })
  for (const argv of [[], ['0'], ['65536'], ['4173', 'extra'], ['port']]) {
    assert.throws(() => parsePreviewHarnessServerArguments(argv), PreviewHarnessServerUsageError)
  }
})

test('生产预览夹具服务只转发明确的 Vite 测试模块', () => {
  for (const pathname of [
    '/tests/browser/support/cronBuilderHarness.ts',
    '/src/i18n/index.ts',
    '/@fs/D:/workspace/source.ts',
    '/@id/__x00__virtual:test',
    '/@vite/client',
    '/node_modules/.pnpm/element-plus/style.mjs',
    '/node_modules/.vite/deps/vue.js',
  ])
    assert.equal(isPreviewHarnessModulePath(pathname), true, pathname)

  for (const pathname of ['/login', '/assets/index.js', '/api/v1/auth/login', '/node_modules/x.js'])
    assert.equal(isPreviewHarnessModulePath(pathname), false, pathname)
})
