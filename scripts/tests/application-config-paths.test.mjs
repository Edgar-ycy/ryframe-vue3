import { stringify } from 'smol-toml'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkApplicationPath, createWindowsAttributeCheck } from '../application-config-paths.mjs'
import { loadApplicationConfig } from '../application-config.mjs'

const repository = fileURLToPath(new URL('../..', import.meta.url))

function fixture(t) {
  const parent = path.join(repository, '.local-tests/application-config-path-tests')
  fs.mkdirSync(parent, { recursive: true })
  const root = fs.mkdtempSync(path.join(parent, '宽字符 中文 😀-'))
  fs.mkdirSync(path.join(root, 'config'))
  fs.writeFileSync(
    path.join(root, 'config/app.toml'),
    stringify({
      api_origin: '',
      server: { host: 'localhost', port: 5173, proxy_target: 'http://localhost:8080' },
    }),
  )
  fs.writeFileSync(path.join(root, 'config/app.dev.toml'), '# 使用公共默认值\n')
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  return root
}

function fakeNative(attributes, lastError = () => 5) {
  const calls = []
  const load = () => {
    calls.push('load')
    return {
      func(signature) {
        calls.push(signature)
        return signature.includes('GetFileAttributesW') ? attributes : lastError
      },
    }
  }
  return { check: createWindowsAttributeCheck(load), calls }
}

test('Native 接口宽字符签名、uint32 协议及只读 DLL 懒缓存', () => {
  const observed = []
  const native = fakeNative((file) => {
    observed.push(file)
    return 0x20
  })
  assert.deepEqual(native.calls, [])
  native.check('D:\\公开 配置\\中文 😀.json', '公开文件')
  native.check('D:\\公开 配置\\第二份.json', '公开文件')
  assert.deepEqual(native.calls, [
    'load',
    'uint32_t __stdcall GetFileAttributesW(str16 path)',
    'uint32_t __stdcall GetLastError()',
  ])
  assert.deepEqual(observed, ['D:\\公开 配置\\中文 😀.json', 'D:\\公开 配置\\第二份.json'])
})

test('任意包含 reparse 位的属性均拒绝，不依赖 Node 将其识别为 symlink', (t) => {
  const root = fixture(t)
  const file = path.join(root, 'config/app.toml')
  assert.ok(!fs.lstatSync(file).isSymbolicLink())
  for (const attributes of [0x400, 0x410, 0x420, 0x80400]) {
    const native = fakeNative(() => attributes)
    assert.throws(() => native.check(file, '公开文件'), /FILE_ATTRIBUTE_REPARSE_POINT/u)
  }
  const native = fakeNative((current) => (current === file ? 0x420 : 0x10))
  assert.throws(() => checkApplicationPath(file, { attributes: native.check }), /重解析/u)
})

test('INVALID_FILE_ATTRIBUTES 立即取得系统错误码，禁止 fallback 或泄密', (t) => {
  const root = fixture(t)
  const events = []
  const native = fakeNative(
    () => {
      events.push('attributes')
      return 0xffffffff
    },
    () => {
      events.push('lastError')
      return 5
    },
  )
  assert.throws(
    () => native.check(path.join(root, 'config/app.toml'), '公开文件'),
    (error) => {
      assert.match(error.message, /GetFileAttributesW.*Win32 error code 5.*禁止降级/u)
      return true
    },
  )
  assert.deepEqual(events, ['attributes', 'lastError'])
  const failed = fakeNative(
    () => 0xffffffff,
    () => 2,
  )
  assert.throws(
    () =>
      checkApplicationPath(path.join(root, 'config/app.toml'), {
        optional: true,
        attributes: failed.check,
      }),
    /Win32 error code 2/u,
  )
  for (const value of [-1, undefined, 'PRIVATE-SENTINEL']) {
    const invalid = fakeNative(() => value)
    assert.throws(
      () => invalid.check('unused', '公开文件'),
      (error) => {
        assert.ok(!error.message.includes('PRIVATE-SENTINEL'))
        assert.match(error.message, /uint32/u)
        return true
      },
    )
  }
})

test('Native 加载及调用失败给安装修复提示，不输出原生错误原文', () => {
  const check = createWindowsAttributeCheck(() => {
    throw new Error('PRIVATE-SENTINEL')
  })
  assert.throws(
    () => check('unused', '公开文件'),
    (error) => {
      assert.match(error.message, /Corepack.*锁文件.*koffi 3.3.2/u)
      assert.ok(!error.message.includes('PRIVATE-SENTINEL'))
      return true
    },
  )
  const native = fakeNative(() => {
    throw new Error('PRIVATE-SENTINEL')
  })
  assert.throws(
    () => native.check('unused', '公开文件'),
    (error) => {
      assert.match(error.message, /禁止降级/u)
      assert.ok(!error.message.includes('PRIVATE-SENTINEL'))
      return true
    },
  )
})

test('只有缺失最终公共文件可缺省，缺祖先或目录不可缺省', (t) => {
  const root = fixture(t)
  assert.equal(
    checkApplicationPath(path.join(root, 'config/absent.json'), {
      optional: true,
    }),
    undefined,
  )
  assert.throws(
    () =>
      checkApplicationPath(`${root}/absent/../config/app.toml`, {
        optional: true,
      }),
    /IO ENOENT/u,
  )
  assert.throws(
    () =>
      checkApplicationPath(path.join(root, 'absent'), {
        directory: true,
        optional: true,
      }),
    /IO ENOENT/u,
  )
})

test('原始 root 与 directory 的 link/.. 不能经 resolve 或 join 绕过', (t) => {
  const root = fixture(t)
  const target = path.join(root, 'real-directory')
  fs.mkdirSync(target)
  const link = path.join(root, 'link')
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir')
  const rawRoot = `${root}${path.sep}link${path.sep}..`
  assert.throws(() => loadApplicationConfig(rawRoot, { environment: 'dev' }), /链接|重解析/u)
  const rawDirectory = `link${path.sep}..${path.sep}config`
  assert.throws(
    () =>
      loadApplicationConfig(root, {
        environment: 'dev',
        directory: rawDirectory,
      }),
    /链接|重解析/u,
  )
  assert.throws(
    () =>
      loadApplicationConfig(root, {
        environment: 'dev',
        directory: `${rawRoot}${path.sep}config`,
      }),
    /链接|重解析/u,
  )
})

test('普通目录的 .. 保持原语义，原始前缀先检查才推进', (t) => {
  const root = fixture(t)
  fs.mkdirSync(path.join(root, 'ordinary'))
  const visited = []
  const file = checkApplicationPath(`${root}/ordinary/../config/app.toml`, {
    attributes: (current) => visited.push(current),
  })
  assert.equal(file, path.join(root, 'config/app.toml'))
  const before = visited.indexOf(path.join(root, 'ordinary'))
  assert.ok(before >= 0)
  assert.equal(visited[before + 1], root)
  assert.deepEqual(
    loadApplicationConfig(`${root}/ordinary/..`, { environment: 'dev' }),
    loadApplicationConfig(root, { environment: 'dev' }),
  )
})

test(
  '非 Windows 默认路径检查不依赖 koffi，仅 Windows 才加载 Native',
  {
    skip: process.platform === 'win32',
  },
  (t) => {
    const root = fixture(t)
    assert.equal(
      checkApplicationPath(path.join(root, 'config/app.toml')),
      path.join(root, 'config/app.toml'),
    )
  },
)

test(
  '真实 Windows Unicode 普通文件与 junction 路径链',
  {
    skip: process.platform !== 'win32',
  },
  (t) => {
    const root = fixture(t)
    const file = path.join(root, 'config/app.toml')
    assert.equal(checkApplicationPath(file), file)
    const link = path.join(root, '目录 链接')
    fs.symlinkSync(path.join(root, 'config'), link, 'junction')
    assert.throws(() => checkApplicationPath(`${link}\\app.toml`), /链接|重解析/u)
    assert.throws(() => checkApplicationPath(`${link}\\..\\config\\app.toml`), /链接|重解析/u)
  },
)
