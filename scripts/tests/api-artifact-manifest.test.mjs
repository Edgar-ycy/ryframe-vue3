import assert from 'node:assert/strict'
import test from 'node:test'
import { artifactPaths, parseArtifactManifest } from '../api-artifact-manifest.mjs'
import { buildApiArtifacts, generatedArtifactPaths } from '../api-artifacts.mjs'
import { fileURLToPath } from 'node:url'

test('派生清单保留路径顺序，所有正式生成物恰有一个清单项', async () => {
  const generated = await buildApiArtifacts(fileURLToPath(new URL('../../', import.meta.url)))
  assert.deepEqual([...generated.keys()].sort(), [...artifactPaths].sort())
  assert.equal(generatedArtifactPaths, artifactPaths)
  assert.ok(Object.isFrozen(artifactPaths))
  assert.deepEqual(parseArtifactManifest('{"format_version":1,"files":["src/b.ts","src/a.ts"]}'), [
    'src/b.ts',
    'src/a.ts',
  ])
})

test('拒绝错误版本、空数组、非字符串、未知字段与重复 JSON 字段', () => {
  for (const manifest of [
    null,
    [],
    {},
    { format_version: 2, files: ['src/a.ts'] },
    { format_version: 1, files: [] },
    { format_version: 1, files: [7] },
    { format_version: 1, files: ['src/a.ts'], extra: true },
  ]) {
    assert.throws(() => parseArtifactManifest(JSON.stringify(manifest)))
  }
  assert.throws(() => parseArtifactManifest('{"format_version":1,"files":["src/a.ts"],"files":[]}'))
  assert.throws(() =>
    parseArtifactManifest('{"format_version":1,"format_version":1,"files":["src/a.ts"]}'),
  )
  assert.throws(() => parseArtifactManifest('not-json'))
})

test('拒绝重复路径、越界、绝对路径、别名、流名称与控制字符', () => {
  for (const file of [
    '../outside.ts',
    '/src/a.ts',
    'src/../a.ts',
    'src//a.ts',
    'src/./a.ts',
    'src/a:stream.ts',
    'src/a\\b.ts',
    'src/a\nb.ts',
    'src/a\0b.ts',
    'other/a.ts',
  ]) {
    assert.throws(() => parseArtifactManifest(JSON.stringify({ format_version: 1, files: [file] })))
  }
  assert.throws(() =>
    parseArtifactManifest(
      JSON.stringify({
        format_version: 1,
        files: ['src/a.ts', 'src/a.ts'],
      }),
    ),
  )
})
