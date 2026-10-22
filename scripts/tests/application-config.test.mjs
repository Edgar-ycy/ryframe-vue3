import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { loadApplicationConfig } from '../application-config.mjs'
import { child, defaults, fixture, hash, toml, snapshot } from './application-config-fixture.mjs'

test('三环境精确选择与公开投影、来源字节摘要', (t) => {
  const { root, write } = fixture(t)
  for (const environment of ['dev', 'test', 'prod']) {
    write(`config/app.${environment}.toml`, { server: { port: 6000 } })
    const actual = loadApplicationConfig(root, { environment })
    assert.deepEqual(actual, {
      environment,
      publicConfig: { apiOrigin: '' },
      server: { host: 'localhost', port: 6000, proxyTarget: 'http://localhost:8080' },
      files: ['config/app.toml', `config/app.${environment}.toml`].map((file) => ({
        path: file,
        sha256: hash(fs.readFileSync(path.join(root, file))),
      })),
    })
  }
  fs.writeFileSync(path.join(root, 'config/app.prod.toml'), 'PRIVATE-SENTINEL invalid')
  assert.equal(loadApplicationConfig(root, { environment: 'dev' }).environment, 'dev')
})

test('APP_ENV 缺省 dev，旧 VITE 和 env 文件完全不影响显式结果', (t) => {
  const { root } = fixture(t)
  const environment = { ...process.env }
  delete environment.APP_ENV
  const before = child(root, environment)
  assert.equal(before.environment, 'dev')
  for (const name of ['.env', '.env.local', '.env.development', '.env.production']) {
    fs.writeFileSync(path.join(root, name), 'VITE_APP_API_ORIGIN=PRIVATE-SENTINEL\n')
  }
  assert.deepEqual(
    child(root, {
      ...environment,
      APP_ENV: 'dev',
      VITE_APP_API_ORIGIN: 'PRIVATE-SENTINEL',
      VITE_APP_DEV_PORT: 'invalid',
      VITE_PASSWORD: 'PRIVATE-SENTINEL',
    }),
    before,
  )
})

test('公共可缺省，选中环境必须完整且始终必需', (t) => {
  const { root, write } = fixture(t)
  fs.unlinkSync(path.join(root, 'config/app.toml'))
  write('config/app.test.toml', defaults)
  assert.equal(loadApplicationConfig(root, { environment: 'test' }).files.length, 1)
  write('config/app.test.toml', {})
  assert.throws(() => loadApplicationConfig(root, { environment: 'test' }), /必需字段/u)
  fs.unlinkSync(path.join(root, 'config/app.test.toml'))
  assert.throws(
    () => loadApplicationConfig(root, { environment: 'test' }),
    (error) => {
      assert.match(error.message, /app.test.toml.*APP_ENV=test.*ENOENT.*创建/u)
      return true
    },
  )
})

test('逐层合并、URL 规范化、Unicode 空格目录和外部绝对来源', (t) => {
  const { root, write } = fixture(t)
  write('config/app.dev.toml', {
    api_origin: 'https://EXAMPLE.invalid:443/',
    server: { port: 65535 },
  })
  const selected = loadApplicationConfig(root, { environment: 'dev', directory: 'config' })
  assert.equal(selected.publicConfig.apiOrigin, 'https://example.invalid')
  assert.equal(selected.server.host, 'localhost')
  assert.equal(selected.server.port, 65535)
  const outside = fixture(t)
  const result = loadApplicationConfig(root, {
    environment: 'dev',
    directory: path.join(outside.root, 'config'),
  })
  assert.ok(result.files.every((file) => path.isAbsolute(file.path)))
  assert.deepEqual(result.server, {
    host: 'localhost',
    port: 5173,
    proxyTarget: 'http://localhost:8080',
  })
  const relativeRoot = path.relative(process.cwd(), root)
  assert.deepEqual(loadApplicationConfig(relativeRoot, { environment: 'dev' }), selected)
  assert.deepEqual(
    loadApplicationConfig(root, { environment: 'dev', directory: undefined }),
    selected,
  )
})

test('未知字段、凭据和错误结构失败且不回显输入', (t) => {
  const { root, write } = fixture(t)
  const invalid = [
    [],
    null,
    { password: 'PRIVATE-SENTINEL' },
    { server: [] },
    { server: { token: 'PRIVATE-SENTINEL' } },
    { api_origin: 7 },
    { server: { host: 7 } },
    { server: { proxy_target: false } },
  ]
  for (const value of invalid) {
    if (value === null || Array.isArray(value)) {
      fs.writeFileSync(path.join(root, 'config/app.dev.toml'), value === null ? 'null' : '[]')
    } else write('config/app.dev.toml', value)
    assert.throws(
      () => loadApplicationConfig(root, { environment: 'dev' }),
      (error) => {
        assert.ok(!error.message.includes('PRIVATE-SENTINEL'))
        const category = value === null || Array.isArray(value) ? /TOML 语法错误/u : /字段校验/u
        assert.match(error.message, category)
        return true
      },
    )
  }
  write('config/app.toml', { server: { port: 'PRIVATE-SENTINEL' } })
  write('config/app.dev.toml', defaults)
  assert.throws(() => loadApplicationConfig(root, { environment: 'dev' }), /server.port/u)
})

test('端口和 host 边界及非法环境全部拒绝', (t) => {
  const { root, write } = fixture(t)
  for (const port of [0, -1, 65536, 1.5, '5173', null, [], true]) {
    if (port === null) {
      fs.writeFileSync(path.join(root, 'config/app.dev.toml'), '[server]\nport = null\n')
    } else write('config/app.dev.toml', { server: { port } })
    assert.throws(
      () => loadApplicationConfig(root, { environment: 'dev' }),
      port === null ? /TOML 语法错误/u : /server.port/u,
    )
  }
  for (const host of ['', '  ', 'PRIVATE-SENTINEL\0', 'host\n', 'host\r', 'host\t', 'host\u007f']) {
    write('config/app.dev.toml', { server: { host } })
    assert.throws(() => loadApplicationConfig(root, { environment: 'dev' }), /server.host/u)
  }
  write('config/app.dev.toml', { server: { port: 1 } })
  assert.equal(loadApplicationConfig(root, { environment: 'dev' }).server.port, 1)
  for (const environment of ['', 'DEV', 'production', ' dev', 'prod ', null, 1]) {
    assert.throws(() => loadApplicationConfig(root, { environment }), /APP_ENV/u)
  }
  for (const invalid of [undefined, null, 0, {}, '', 'bad\0', 'bad\r', 'bad\n']) {
    assert.throws(() => loadApplicationConfig(invalid), /公开配置目录/u)
  }
  for (const directory of [null, 0, {}, '', 'bad\0', 'bad\r', 'bad\n']) {
    assert.throws(() => loadApplicationConfig(root, { directory }), /公开配置目录/u)
  }
})

test('两种 origin 共用现有 URL 约束，拒绝凭据与路径', (t) => {
  const { root, write } = fixture(t)
  for (const value of [
    'invalid',
    '/api',
    'ftp://example.invalid',
    'https://PRIVATE-SENTINEL:password@example.invalid',
    'https://example.invalid/api',
    'https://example.invalid/?PRIVATE-SENTINEL',
    'https://example.invalid/#PRIVATE-SENTINEL',
  ]) {
    for (const field of ['api_origin', 'proxy_target']) {
      const document =
        field === 'api_origin' ? { api_origin: value } : { server: { proxy_target: value } }
      write('config/app.dev.toml', document)
      assert.throws(
        () => loadApplicationConfig(root, { environment: 'dev' }),
        (error) => {
          assert.ok(!error.message.includes('PRIVATE-SENTINEL'))
          assert.ok(error.message.includes(field))
          return true
        },
      )
    }
  }
  write('config/app.dev.toml', { server: { proxy_target: '' } })
  assert.throws(() => loadApplicationConfig(root, { environment: 'dev' }), /proxy_target/u)
})

test('严格 UTF-8 与 TOML 语法错误保留安全位置，不回显原文', (t) => {
  const { root } = fixture(t)
  const invalid = [Buffer.from([0xff, 0xfe]), Buffer.from('api_origin = "PRIVATE-SENTINEL')]
  for (const bytes of invalid) {
    fs.writeFileSync(path.join(root, 'config/app.dev.toml'), bytes)
    assert.throws(
      () => loadApplicationConfig(root, { environment: 'dev' }),
      (error) => {
        assert.ok(!error.message.includes('PRIVATE-SENTINEL'))
        assert.match(error.message, /UTF-8|line \d+ column/u)
        return true
      },
    )
  }
})

test('普通目录、悬空文件链接和祖先重解析链接均拒绝', (t) => {
  for (const kind of ['directory', 'link', 'valid-link', 'ancestor']) {
    const { root } = fixture(t)
    const common = path.join(root, 'config/app.toml')
    if (kind === 'directory') {
      fs.unlinkSync(common)
      fs.mkdirSync(common)
    } else if (kind === 'link') {
      fs.unlinkSync(common)
      fs.symlinkSync(path.join(root, 'missing-PRIVATE-SENTINEL'), common, 'file')
    } else if (kind === 'valid-link') {
      const target = path.join(root, 'real-common.json')
      fs.renameSync(common, target)
      fs.symlinkSync(target, common, 'file')
    } else {
      fs.renameSync(path.join(root, 'config'), path.join(root, 'real-config'))
      fs.symlinkSync(
        path.join(root, 'real-config'),
        path.join(root, 'config'),
        process.platform === 'win32' ? 'junction' : 'dir',
      )
    }
    assert.throws(() => loadApplicationConfig(root, { environment: 'dev' }), /普通文件|链接/u)
  }
})

test('公共文件权限错误保留 code 且不视为空，不创建缺失目录', (t) => {
  const { root } = fixture(t)
  assert.throws(
    () =>
      loadApplicationConfig(root, {
        environment: 'dev',
        directory: 'missing-config',
      }),
    /ENOENT/u,
  )
  assert.ok(!fs.existsSync(path.join(root, 'missing-config')))
  const stat = fs.lstatSync
  t.mock.method(fs, 'lstatSync', (file, ...args) => {
    if (file === path.join(root, 'config/app.toml')) {
      throw Object.assign(new Error('PRIVATE-SENTINEL'), { code: 'EACCES' })
    }
    return stat(file, ...args)
  })
  assert.throws(
    () => loadApplicationConfig(root, { environment: 'dev' }),
    (error) => {
      assert.match(error.message, /IO EACCES/u)
      assert.ok(!error.message.includes('PRIVATE-SENTINEL'))
      return true
    },
  )
})

test('成功读取不改写输入，不创建目录，来源字节或文件集合漂移拒绝', (t) => {
  const { root } = fixture(t)
  const before = snapshot(path.join(root, 'config'))
  const selected = ['app.toml', 'app.dev.toml'].map((file) => path.join(root, 'config', file))
  try {
    for (const file of selected) fs.chmodSync(file, 0o444)
    loadApplicationConfig(root, { environment: 'dev' })
  } finally {
    for (const file of selected) fs.chmodSync(file, 0o644)
  }
  assert.deepEqual(snapshot(path.join(root, 'config')), before)
  const read = fs.readFileSync
  let changed = false
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    const result = read(file, ...args)
    if (!changed && file === path.join(root, 'config/app.dev.toml')) {
      changed = true
      fs.writeFileSync(file, '[server]\nport = 6001\n')
    }
    return result
  })
  assert.throws(() => loadApplicationConfig(root, { environment: 'dev' }), /漂移/u)
})

test('公共文件在读取期间出现也属于来源集合漂移', (t) => {
  const { root } = fixture(t)
  fs.unlinkSync(path.join(root, 'config/app.toml'))
  fs.writeFileSync(path.join(root, 'config/app.dev.toml'), toml(defaults))
  const read = fs.readFileSync
  let changed = false
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    const result = read(file, ...args)
    if (!changed && file === path.join(root, 'config/app.dev.toml')) {
      changed = true
      fs.writeFileSync(path.join(root, 'config/app.toml'), '# 新出现的公共文件\n')
    }
    return result
  })
  assert.throws(() => loadApplicationConfig(root, { environment: 'dev' }), /漂移/u)
})
