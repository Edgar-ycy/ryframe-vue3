import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  generatedArtifactPaths,
  ownershipManifestPath,
  renderNavigationResourceMessages,
} from '../api-artifacts.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const generator = 'scripts/generate-api-artifacts.mjs'

function runGenerator(directory, args = [], readonly = true) {
  const result = spawnSync(
    process.execPath,
    [
      ...(readonly ? ['--permission', '--allow-fs-read=*'] : []),
      path.join(directory, generator),
      ...args,
    ],
    { cwd: directory, encoding: 'utf8', windowsHide: true, shell: false },
  )
  assert.equal(result.error, undefined)
  return result
}

async function fixture(t) {
  const parent = path.join(root, '.local-tests', 'node-unit')
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(path.join(parent, 'API 派生检查 '))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await cp(path.join(root, 'scripts'), path.join(directory, 'scripts'), { recursive: true })
  for (const relative of ['openapi/openapi.json', ...generatedArtifactPaths]) {
    const output = path.join(directory, relative)
    await mkdir(path.dirname(output), { recursive: true })
    await cp(path.join(root, relative), output)
  }
  return directory
}

async function contents(directory) {
  return Promise.all(
    generatedArtifactPaths.map(async (relative) => [
      relative,
      await readFile(path.join(directory, relative), 'utf8'),
    ]),
  )
}

test('默认和 --check 在禁止写文件及派生进程时通过，不创建 staging', async (t) => {
  const directory = await fixture(t)
  const before = await contents(directory)
  for (const args of [[], ['--check']]) {
    const result = runGenerator(directory, args)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /只读校验通过/u)
    await assert.rejects(access(path.join(directory, 'target')), { code: 'ENOENT' })
  }
  assert.deepEqual(await contents(directory), before)
})

test('无参数及显式检查均报告内容、缺失和 ownership 漂移，失败时仍零写入', async (t) => {
  const directory = await fixture(t)
  const [changed, missing] = generatedArtifactPaths
  const obsolete = 'src/api/generated/obsolete.ts'
  await writeFile(path.join(directory, changed), 'drift\n')
  await rm(path.join(directory, missing))
  await writeFile(path.join(directory, obsolete), 'obsolete\n')
  const ownership = JSON.parse(await readFile(path.join(directory, ownershipManifestPath)))
  ownership.files.push(obsolete)
  await writeFile(path.join(directory, ownershipManifestPath), JSON.stringify(ownership))

  for (const args of [[], ['--check']]) {
    const result = runGenerator(directory, args)
    assert.equal(result.status, 1, result.stderr)
    for (const relative of [changed, missing, obsolete]) assert.ok(result.stderr.includes(relative))
    assert.match(result.stderr, /corepack pnpm generate --write/u)
    assert.doesNotMatch(result.stderr, /ERR_ACCESS_DENIED/u)
    assert.equal(await readFile(path.join(directory, changed), 'utf8'), 'drift\n')
    await assert.rejects(access(path.join(directory, missing)), { code: 'ENOENT' })
    await assert.rejects(access(path.join(directory, 'target')), { code: 'ENOENT' })
  }
})

test('未知、重复和互斥参数在任何生成前返回 2', () => {
  for (const args of [
    ['--unknown'],
    ['--check', '--check'],
    ['--write', '--check'],
    ['--check', 'extra'],
  ]) {
    const result = runGenerator(root, args)
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /用法：/u)
    assert.doesNotMatch(result.stderr, /ERR_ACCESS_DENIED/u)
  }
})

test('生成资源的导航文案使用菜单 title key，且缺少对应菜单路由时失败', async () => {
  const document = JSON.parse(await readFile(path.join(root, 'openapi/openapi.json'), 'utf8'))

  const rendered = renderNavigationResourceMessages(document)
  assert.match(rendered, /"post": "岗位管理"/u)
  assert.match(rendered, /"post": "Posts"/u)

  const invalid = structuredClone(document)
  invalid['x-ryframe-menu-routes'].routes = invalid['x-ryframe-menu-routes'].routes.filter(
    (route) => route.route_key !== 'system.post',
  )
  assert.throws(() => renderNavigationResourceMessages(invalid), /post 缺少菜单路由声明/u)
})

test('仅 --write 安装暂存产物，恢复漂移并保持重复生成零差异', async (t) => {
  const directory = await fixture(t)
  const expected = await contents(directory)
  await writeFile(path.join(directory, generatedArtifactPaths[0]), 'drift\n')

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = runGenerator(directory, ['--write'], false)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /已原子安装/u)
    assert.deepEqual(await contents(directory), expected)
    assert.deepEqual(await readdir(path.join(directory, 'target')), [])
  }
  const checked = runGenerator(directory, ['--check'])
  assert.equal(checked.status, 0, checked.stderr)
})
