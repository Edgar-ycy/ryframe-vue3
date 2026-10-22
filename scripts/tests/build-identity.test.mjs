import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { identitySourcePath, prepareBuildIdentity, readBuildIdentity } from '../build-identity.mjs'
import { fixture, buildEnvironment } from './restore-build-fixture.mjs'
import { runBuild } from '../build.mjs'
import { loadFrontendConfiguration } from '../frontend-tool-config.mjs'

test('身份缺省 development，普通构建原子写受管文件并清除先前正式值', (t) => {
  const root = fixture(t)
  assert.deepEqual(readBuildIdentity(root), { frontend_commit: 'development', source_file: null })
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const formal = prepareBuildIdentity(root, head)
  assert.equal(formal.frontend_commit, head)
  assert.equal(formal.source_file.path, identitySourcePath)
  const ordinary = prepareBuildIdentity(root)
  assert.equal(ordinary.frontend_commit, 'development')
  assert.notEqual(ordinary.source_file.sha256, formal.source_file.sha256)
  assert.deepEqual(fs.readdirSync(path.join(root, '.local-tests/build')), ['source.json'])
})

test('正式 SHA 不匹配和脏目标在任何身份写入前拒绝', (t) => {
  const root = fixture(t)
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  assert.throws(() => prepareBuildIdentity(root, 'a'.repeat(40)), /精确干净/u)
  assert.equal(fs.existsSync(path.join(root, '.local-tests')), false)
  fs.writeFileSync(path.join(root, 'dirty.ts'), 'export const changed = true')
  assert.throws(() => prepareBuildIdentity(root, head), /精确干净/u)
  assert.equal(fs.existsSync(path.join(root, '.local-tests')), false)
})

test('身份坏文件、未知字段、非法 UTF-8、旧 env 形状及链接均拒绝而不覆盖', (t) => {
  const root = fixture(t)
  prepareBuildIdentity(root)
  const file = path.join(root, identitySourcePath)
  for (const value of [
    { format_version: 2, frontend_commit: 'development' },
    { format_version: 1, frontend_commit: ['a'.repeat(40)] },
    { format_version: 1, frontend_commit: 'development', password: 'PRIVATE-SENTINEL' },
    { VITE_APP_BUILD_COMMIT: 'PRIVATE-SENTINEL' },
  ]) {
    fs.writeFileSync(file, JSON.stringify(value))
    const before = fs.readFileSync(file)
    assert.throws(
      () => prepareBuildIdentity(root),
      (error) => {
        assert.doesNotMatch(error.message, /PRIVATE-SENTINEL/u)
        return /身份/u.test(error.message)
      },
    )
    assert.deepEqual(fs.readFileSync(file), before)
  }
  fs.writeFileSync(file, Buffer.from([0xff]))
  assert.throws(() => readBuildIdentity(root), /UTF-8 JSON/u)
  fs.rmSync(file)
  fs.symlinkSync(path.join(root, 'app.js'), file, 'file')
  assert.throws(() => readBuildIdentity(root), /链接|重解析/u)
})

test('real 非空 origin 在身份、类型检查、构建和收据副作用前拒绝', (t) => {
  const root = fixture(t)
  fs.writeFileSync(
    path.join(root, 'config/app.test.toml'),
    'api_origin = "https://public.example.invalid"\n',
  )
  const forbidden = () => {
    throw new Error('不应执行')
  }
  assert.throws(
    () =>
      runBuild(
        root,
        { real: true },
        {
          environment: { APP_ENV: 'test' },
          configure: loadFrontendConfiguration,
          identify: forbidden,
          execute: forbidden,
          capture: forbidden,
          publish: forbidden,
        },
      ),
    /api_origin.*为空/u,
  )
  assert.equal(fs.existsSync(path.join(root, '.local-tests/build')), false)
})

test('普通 wrapper 在实际任务前写 development，APP_ENV 不从 production mode 推导', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const tasks = []
  runBuild(
    root,
    { real: false, plan: false },
    {
      environment: { ...environment, APP_ENV: 'test' },
      execute: (directory, task) => {
        assert.equal(readBuildIdentity(directory).frontend_commit, 'development')
        tasks.push(task.name)
      },
    },
  )
  assert.deepEqual(tasks, ['app-types', 'production-build'])
})

test('构建入口在任务执行前拒绝缺失、非法及混入私有字段的所选文件', (t) => {
  const root = fixture(t)
  const selected = path.join(root, 'config/app.test.toml')
  const forbidden = () => {
    throw new Error('输入非法时禁止副作用')
  }
  const options = {
    environment: { APP_ENV: 'test' },
    identify: forbidden,
    execute: forbidden,
    capture: forbidden,
    publish: forbidden,
  }
  fs.rmSync(selected)
  assert.throws(() => runBuild(root, { real: true }, options), /APP_ENV=test.*ENOENT/u)
  for (const value of ['PRIVATE-SENTINEL invalid', 'password = "PRIVATE-SENTINEL"', '[]']) {
    fs.writeFileSync(selected, value)
    assert.throws(
      () => runBuild(root, { real: true }, options),
      (error) => {
        assert.doesNotMatch(error.message, /PRIVATE-SENTINEL|禁止副作用/u)
        return /公开配置/u.test(error.message)
      },
    )
  }
  assert.equal(fs.existsSync(path.join(root, '.local-tests/build')), false)
})

test('原子身份写入失败保留目标前像与临时现场，错误不回显原生文本', (t) => {
  const root = fixture(t)
  prepareBuildIdentity(root)
  const target = path.join(root, identitySourcePath)
  const before = fs.readFileSync(target)
  t.mock.method(fs, 'renameSync', () => {
    throw Object.assign(new Error('PRIVATE-SENTINEL'), { code: 'EACCES' })
  })
  assert.throws(
    () => prepareBuildIdentity(root),
    (error) => {
      assert.match(error.message, /IO EACCES.*现场/u)
      assert.doesNotMatch(error.message, /PRIVATE-SENTINEL/u)
      return true
    },
  )
  assert.deepEqual(fs.readFileSync(target), before)
  assert.equal(
    fs.readdirSync(path.dirname(target)).filter((file) => file.endsWith('.tmp')).length,
    1,
  )
})
