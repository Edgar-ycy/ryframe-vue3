import assert from 'node:assert/strict'
import test from 'node:test'
import {
  lineCount,
  scriptLimit,
  sourceLimit,
  sourceLimits,
  sourceSizeAssessment,
  sourceSizeViolation,
} from '../source-size-contract.mjs'

test('所有手写 TypeScript 都会获得规模上限', () => {
  assert.equal(sourceLimits.test, 300)
  assert.equal(sourceLimit('src/stores/settings.ts'), sourceLimits.typescript)
  assert.equal(sourceLimit('src/components/table/render.tsx'), sourceLimits.typescript)
  assert.equal(sourceLimit('src/app/messages/messageSocket.ts'), sourceLimits.typescript)
  assert.equal(sourceLimit('src/views/system/user/composables/model.ts'), sourceLimits.composable)
  assert.equal(sourceLimit('src/views/profile/useProfileManagement.ts'), sourceLimits.composable)
  assert.equal(sourceLimit('src/hooks/useCellRenderer.tsx'), sourceLimits.composable)
  assert.equal(sourceLimit('src/i18n/catalog/system.ts'), sourceLimits.typescript)
  assert.equal(sourceLimit('tests/browser/export-flow.spec.ts'), sourceLimits.test)
  assert.equal(sourceLimit('vite.config.ts'), sourceLimits.typescript)
  assert.equal(sourceLimit('scripts/tooling.mts'), sourceLimits.typescript)
})

test('生成代码和声明文件不计入手写源码门禁', () => {
  assert.equal(sourceLimit('src/api/generated/schema/core.ts'), undefined)
  assert.equal(sourceLimit('src/generated/resources/post/api.ts'), undefined)
  assert.equal(sourceLimit('src/auto-imports.d.ts'), undefined)
  assert.equal(sourceLimit('src/generated-types.d.mts'), undefined)
})

test('Vue、样式和维护脚本使用各自上限', () => {
  assert.equal(sourceLimit('src/views/system/user/index.vue'), sourceLimits.vue)
  assert.equal(sourceLimit('src/styles/page.scss'), sourceLimits.style)
  assert.equal(scriptLimit('scripts/check-source-size.mjs'), sourceLimits.script)
  assert.equal(scriptLimit('scripts/config.ts'), undefined)
})

test('行数统计兼容 LF、CRLF 和末尾换行', () => {
  assert.equal(lineCount(''), 0)
  assert.equal(lineCount('a\n'), 1)
  assert.equal(lineCount('a\r\nb\r\n'), 2)
})

test('达到硬上限即违规，80% 与 90% 分别提示和强警告', () => {
  assert.deepEqual(sourceSizeViolation('src/example.ts', 'a\nb', 2), {
    limit: 2,
    lines: 2,
    path: 'src/example.ts',
    severity: 'error',
  })
  assert.deepEqual(sourceSizeViolation('src/example.ts', 'a\nb\nc', 2), {
    limit: 2,
    lines: 3,
    path: 'src/example.ts',
    severity: 'error',
  })
  assert.equal(sourceSizeAssessment('src/example.ts', 'a\nb\nc', 4), undefined)
  assert.equal(sourceSizeAssessment('src/example.ts', 'a\nb\nc\nd', 5)?.severity, 'notice')
  assert.equal(sourceSizeAssessment('src/example.ts', 'a\nb\nc\nd\ne', 5)?.severity, 'error')
  assert.equal(
    sourceSizeAssessment('src/example.ts', 'a\nb\nc\nd\ne\nf\ng\nh\ni', 10)?.severity,
    'warning',
  )
})
