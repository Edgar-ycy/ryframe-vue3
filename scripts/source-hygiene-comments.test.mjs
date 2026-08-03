import assert from 'node:assert/strict'
import test from 'node:test'

import { collectComments } from './source-hygiene-comments.mjs'

test('YAML 中的容器 URL 不会被识别为斜线注释', () => {
  const comments = collectComments(
    'uses: docker://rhysd/actionlint@sha256:abc\n# 中文说明\n',
    '.yml',
  )

  assert.deepEqual(comments, [{ body: ' 中文说明', line: 2 }])
})

test('JavaScript 中仍会识别斜线注释', () => {
  const comments = collectComments('const value = 1 // 中文说明\n', '.mjs')

  assert.deepEqual(comments, [{ body: ' 中文说明', line: 1 }])
})
