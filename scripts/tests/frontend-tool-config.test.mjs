import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { loadFrontendConfiguration, loadFrontendToolConfig } from '../frontend-tool-config.mjs'
import { defaults, fixture, hash } from './application-config-fixture.mjs'

test('工具配置可缺省、局部合并且本机优先，来源只包含真实读取文件', (t) => {
  const { root, write } = fixture(t)
  assert.deepEqual(loadFrontendToolConfig(root).files, [])
  fs.mkdirSync(path.join(root, '.local-tests'))
  fs.mkdirSync(path.join(root, '公开 配置'))
  write('公开 配置/app.test.toml', defaults)
  write('config/tools.json', { application_config_dir: 'config' })
  write('.local-tests/frontend-tools.json', { application_config_dir: '公开 配置' })
  const actual = loadFrontendConfiguration(root, 'test')
  assert.equal(actual.configuration.directory, '公开 配置')
  assert.deepEqual(
    actual.configuration.files.map((file) => file.path),
    ['公开 配置/app.test.toml'],
  )
  assert.deepEqual(
    actual.configuration.tools,
    ['config/tools.json', '.local-tests/frontend-tools.json'].map((file) => ({
      path: file,
      sha256: hash(fs.readFileSync(path.join(root, file))),
    })),
  )
  write('.local-tests/frontend-tools.json', {})
  assert.equal(loadFrontendConfiguration(root, 'dev').configuration.directory, 'config')
})

test('绝对外部目录保留真实绝对来源，不伪造 root 相对路径', (t) => {
  const { root, write } = fixture(t)
  const { root: outside } = fixture(t)
  write('config/tools.json', { application_config_dir: path.join(outside, 'config') })
  const actual = loadFrontendConfiguration(root, 'prod')
  assert.equal(actual.configuration.directory, path.join(outside, 'config').replaceAll('\\', '/'))
  assert.ok(actual.files.every((file) => path.isAbsolute(file.path)))
})

test('已存在的工具文件类型、编码、JSON 和未知私有字段错误拒绝且脱敏', (t) => {
  const { root, write } = fixture(t)
  const file = path.join(root, 'config/tools.json')
  for (const value of [
    [],
    null,
    { password: 'PRIVATE-SENTINEL' },
    { application_config_dir: '' },
    { application_config_dir: 42 },
    { application_config_dir: 'PRIVATE-SENTINEL\n' },
  ]) {
    write('config/tools.json', value)
    assert.throws(
      () => loadFrontendToolConfig(root),
      (error) => {
        assert.doesNotMatch(error.message, /PRIVATE-SENTINEL/u)
        return /工具配置/u.test(error.message)
      },
    )
  }
  for (const bytes of [
    Buffer.from([0xff]),
    Buffer.from('{"PRIVATE-SENTINEL":'),
    Buffer.from('{"application_config_dir":"config","application_config_dir":"config"}'),
  ]) {
    fs.writeFileSync(file, bytes)
    assert.throws(() => loadFrontendToolConfig(root), /合法 UTF-8 JSON/u)
  }
  fs.rmSync(file)
  fs.mkdirSync(file)
  assert.throws(() => loadFrontendToolConfig(root), /普通文件/u)
})

test('工具路径保留 .. 检查，缺省与读取都不写输入文件', (t) => {
  const { root, write } = fixture(t)
  const before = fs.readFileSync(path.join(root, 'config/app.toml'))
  const link = path.join(root, 'linked')
  fs.symlinkSync(path.join(root, 'config'), link, process.platform === 'win32' ? 'junction' : 'dir')
  write('config/tools.json', { application_config_dir: 'linked/../config' })
  assert.throws(() => loadFrontendConfiguration(root, 'dev'), /链接|重解析/u)
  write('config/tools.json', {})
  const tools = fs.readFileSync(path.join(root, 'config/tools.json'))
  loadFrontendConfiguration(root, 'dev')
  assert.deepEqual(fs.readFileSync(path.join(root, 'config/app.toml')), before)
  assert.deepEqual(fs.readFileSync(path.join(root, 'config/tools.json')), tools)
})

test('工具读取期间来源字节改变拒绝', (t) => {
  const { root, write } = fixture(t)
  write('config/tools.json', {})
  const read = fs.readFileSync
  let changed = false
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    const result = read(file, ...args)
    if (!changed && file === path.join(root, 'config/tools.json')) {
      changed = true
      fs.writeFileSync(file, '{ }\n')
    }
    return result
  })
  assert.throws(() => loadFrontendToolConfig(root), /漂移/u)
})

test('读取期间新增本机工具文件不得从可缺省集合中漏过', (t) => {
  const { root, write } = fixture(t)
  write('config/tools.json', {})
  fs.mkdirSync(path.join(root, '.local-tests'))
  const read = fs.readFileSync
  let reads = 0
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    const result = read(file, ...args)
    if (file === path.join(root, 'config/tools.json') && ++reads === 2) {
      write('.local-tests/frontend-tools.json', {})
    }
    return result
  })
  assert.throws(() => loadFrontendToolConfig(root), /漂移/u)
})

test('公开配置读完后工具复核期间的应用配置漂移也拒绝', (t) => {
  const { root, write } = fixture(t)
  write('config/tools.json', {})
  const read = fs.readFileSync
  let reads = 0
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    const result = read(file, ...args)
    if (file === path.join(root, 'config/tools.json') && ++reads === 3) {
      write('config/app.dev.toml', { server: { port: 6400 } })
    }
    return result
  })
  assert.throws(() => loadFrontendConfiguration(root, 'dev'), /漂移/u)
})
