import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  parseSyncArguments,
  readPinnedSource,
  runSync,
  syncMetadata,
} from '../sync-api-contract.mjs'
import { fixture } from './application-config-fixture.mjs'

const source = fs.readFileSync(new URL('../../openapi/openapi.json', import.meta.url))
const metadata = { backend_repository: 'owner/backend', backend_commit: 'a'.repeat(40) }

test('同步参数只接受完整来源与显式写入，校验禁止替换来源', () => {
  assert.deepEqual(parseSyncArguments([]), { mode: 'sync', write: false })
  assert.equal(parseSyncArguments(['--write']).write, true)
  for (const argv of [
    ['--write', '--write'],
    ['--backend-commit'],
    ['--unknown'],
    ['--verify-local', '--verify-upstream'],
    ['--verify-upstream', '--write'],
    ['--verify-upstream', '--backend-commit', metadata.backend_commit],
  ]) {
    assert.throws(() => parseSyncArguments(argv))
  }
  for (const commit of ['HEAD', 'main', 'a'.repeat(39), 'a'.repeat(41)])
    assert.throws(() => syncMetadata({ ...metadata, backend_commit: commit }))
  for (const value of [
    '../source.json',
    '/source.json',
    'a\\b.json',
    'C:source.json',
    'a/../source.json',
    'a\n.json',
    'a.json?ref=main',
  ])
    assert.throws(() => syncMetadata({ ...metadata, openapi_path: value }))
})

test('本地读取只通过精确 SHA 的 Git 对象，不读工作树文件', async () => {
  const commit = syncMetadata(metadata)
  const root = path.resolve('中文 空格后端')
  const bytes = await readPinnedSource(commit, root, async (command, args, options) => {
    assert.equal(command, 'git')
    assert.deepEqual(args, ['-C', root, 'show', `${metadata.backend_commit}:openapi/openapi.json`])
    assert.equal(options.encoding, 'buffer')
    return { stdout: source }
  })
  assert.deepEqual(bytes, source)
  await assert.rejects(
    readPinnedSource(commit, root, async () => {
      throw new Error('missing object')
    }),
    /Git 对象/u,
  )
})

test('文件配置和 CLI 同源，默认预览不写，显式写入才替换正式来源', async (t) => {
  const { root, write } = fixture(t)
  write('config/tools.json', {
    api_contract: { ...metadata, backend_worktree: path.resolve('后端') },
  })
  const readSource = async (selected, worktree) => {
    assert.equal(selected.backend_commit, metadata.backend_commit)
    assert.equal(worktree, path.resolve('后端'))
    return source
  }
  const original = fs.readFileSync(path.join(root, 'config/tools.json'))
  await runSync(parseSyncArguments([]), root, readSource)
  assert.equal(fs.existsSync(path.join(root, 'openapi')), false)
  assert.deepEqual(fs.readFileSync(path.join(root, 'config/tools.json')), original)
  await runSync(parseSyncArguments(['--write']), root, readSource)
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(root, 'openapi/source.json'))).backend_commit,
    metadata.backend_commit,
  )
  await runSync(parseSyncArguments(['--verify-upstream']), root, readSource)
  const changed = JSON.parse(source)
  changed.info.description = 'Different upstream description'
  await assert.rejects(
    runSync(parseSyncArguments(['--verify-upstream']), root, async () =>
      Buffer.from(JSON.stringify(changed)),
    ),
    /不一致/u,
  )
  await assert.rejects(
    runSync(parseSyncArguments(['--verify-upstream']), root, async () =>
      Buffer.from(source.toString().replace('RyFrame API', 'Different API')),
    ),
    /契约/u,
  )
})

test('写入边界和读取期间的工具漂移在更新正式文件前失败', async (t) => {
  const { root, write } = fixture(t)
  write('config/tools.json', { api_contract: metadata })
  const options = parseSyncArguments(['--write'])
  await assert.rejects(
    runSync(options, root, async () => {
      write('config/tools.json', { api_contract: { ...metadata, backend_commit: 'b'.repeat(40) } })
      return source
    }),
    /漂移/u,
  )
  assert.equal(fs.existsSync(path.join(root, 'openapi')), false)
  fs.writeFileSync(path.join(root, 'openapi'), 'keep-existing-file')
  await assert.rejects(
    runSync(options, root, async () => source),
    /普通目录/u,
  )
  assert.equal(fs.readFileSync(path.join(root, 'openapi'), 'utf8'), 'keep-existing-file')
})

test('旧环境不会补齐缺失元数据，错误配置不回显私密值', async (t) => {
  const { root, write } = fixture(t)
  const previous = process.env.RYFRAME_BACKEND_COMMIT
  process.env.RYFRAME_BACKEND_COMMIT = metadata.backend_commit
  t.after(() => {
    if (previous === undefined) delete process.env.RYFRAME_BACKEND_COMMIT
    else process.env.RYFRAME_BACKEND_COMMIT = previous
  })
  await assert.rejects(runSync(parseSyncArguments([]), root), /backend_repository/u)
  write('config/tools.json', { api_contract: { ...metadata, password: 'PRIVATE-SENTINEL' } })
  await assert.rejects(
    runSync(parseSyncArguments([]), root),
    (error) => /字段无效/u.test(error.message) && !error.message.includes('PRIVATE-SENTINEL'),
  )
})
