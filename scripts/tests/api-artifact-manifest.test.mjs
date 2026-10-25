import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { artifactPaths, parseArtifactManifest } from '../api-artifact-manifest.mjs'
import { buildApiArtifacts, ownershipManifestPath } from '../api-artifacts.mjs'
import { fileURLToPath } from 'node:url'
import { createTemporaryDirectory } from '../temporary-directory.mjs'

const frontend = fileURLToPath(new URL('../../', import.meta.url))

async function isolatedGenerator(t) {
  const parent = path.join(frontend, '.local-tests', 'api-artifact-install')
  await mkdir(parent, { recursive: true })
  const directory = await createTemporaryDirectory(path.join(parent, 'attempt-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  let root = directory
  while (root.length < 235) root = path.join(root, 'stage')
  assert(root.length >= 235 && root.length <= 249, '隔离 cwd 必须在 235–249 字符范围内')
  assert(root.length < 260, '子进程 cwd 不触发 Windows 的进程目录长度限制')
  assert(
    path.join(root, 'target', 'api-artifacts-XXXXXX').length > 260,
    '正式生成器的临时目录模板必须实际跨越 Windows 普通路径边界',
  )
  await mkdir(path.join(root, 'src'), { recursive: true })
  const scripts = path.join(frontend, 'scripts')
  await cp(scripts, path.join(root, 'scripts'), {
    recursive: true,
    filter: (file) =>
      !['tests', 'contract-tests'].includes(path.relative(scripts, file).split(path.sep)[0]),
  })
  await cp(path.join(frontend, 'openapi'), path.join(root, 'openapi'), { recursive: true })
  assert(!root.startsWith('\\\\?\\'), '业务工作区保持普通路径')
  return root
}

function runGenerator(root, mode) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'generate-api-artifacts.mjs'), mode],
    { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 },
  )
  assert.ifError(result.error)
  assert.equal(result.signal, null)
  return result
}

async function seedOwnedFiles(root) {
  const original = new Map()
  for (const relative of artifactPaths) {
    const content =
      relative === ownershipManifestPath
        ? JSON.stringify({ version: 1, files: [...artifactPaths] })
        : `原有受管内容：${relative}\n`
    const file = path.join(root, relative)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content)
    original.set(relative, content)
  }
  return original
}

test('派生清单保留路径顺序，所有正式生成物恰有一个清单项', async () => {
  const generated = await buildApiArtifacts(fileURLToPath(new URL('../../', import.meta.url)))
  assert.deepEqual([...generated.keys()].sort(), [...artifactPaths].sort())
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

test('深层工作区正式生成完整 API 产物并清理暂存，保留非受管文件', async (t) => {
  const root = await isolatedGenerator(t)
  await seedOwnedFiles(root)
  const unmanaged = path.join(root, 'src', 'api', 'generated', 'manual.txt')
  await writeFile(unmanaged, '不属于 ownership 的内容\n')
  const expected = await buildApiArtifacts(root)
  const written = runGenerator(root, '--write')
  assert.equal(written.status, 0, '正式生成器应在深层路径安装成功')
  assert.equal(written.stderr, '')
  for (const [relative, content] of expected) {
    assert.equal(await readFile(path.join(root, relative), 'utf8'), content, relative)
  }
  assert.deepEqual(await readdir(path.join(root, 'target')), [])
  assert.equal(await readFile(unmanaged, 'utf8'), '不属于 ownership 的内容\n')
  const checked = runGenerator(root, '--check')
  assert.equal(checked.status, 0, '生成后的同一产物必须通过正式只读检查')
  assert.equal(checked.stderr, '')
})

test('深层工作区备份中途失败恢复原字节并清理暂存，不删除阻塞目录', async (t) => {
  const root = await isolatedGenerator(t)
  const original = await seedOwnedFiles(root)
  const previousOwnership = [
    ownershipManifestPath,
    ...artifactPaths.filter((relative) => relative !== ownershipManifestPath),
  ]
  const blocked = previousOwnership.at(-1)
  assert(blocked !== ownershipManifestPath && previousOwnership.indexOf(blocked) > 0)
  // 按明确的 ownership 顺序先备份普通文件，再遇到最后一项的未知目录。
  const manifest = JSON.stringify({ version: 1, files: previousOwnership })
  await writeFile(path.join(root, ownershipManifestPath), manifest)
  original.set(ownershipManifestPath, manifest)
  await rm(path.join(root, blocked))
  await mkdir(path.join(root, blocked))
  await writeFile(path.join(root, blocked, 'unknown.txt'), '保留未知现场\n')
  const rejected = runGenerator(root, '--write')
  assert.equal(rejected.status, 1)
  assert.match(rejected.stderr, /EISDIR|EPERM|EACCES/)
  assert(rejected.stderr.includes(blocked))
  assert.match(rejected.stderr, /检查文件类型和读取权限/)
  assert.match(rejected.stderr, /保留未知目录及文件现场/)
  assert.equal(rejected.stdout, '')
  for (const [relative, content] of original) {
    if (relative !== blocked) {
      assert.equal(await readFile(path.join(root, relative), 'utf8'), content, relative)
    }
  }
  assert.equal(await readFile(path.join(root, blocked, 'unknown.txt'), 'utf8'), '保留未知现场\n')
  assert.deepEqual(await readdir(path.join(root, blocked)), ['unknown.txt'])
  assert.deepEqual(await readdir(path.join(root, 'target')), [])
})
