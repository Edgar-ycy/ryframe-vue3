import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { bindWorkerTool } from '../../scripts/worker-tool.mjs'
import type { WorkerTool } from '../../scripts/real-browser-environment.mjs'

const native = vi.hoisted(() => ({ verify: vi.fn() }))
vi.mock('node:child_process', () => ({ execFileSync: native.verify }))

const temporaryRoot = path.resolve('.local-tests/worker-tool-tests')
const sources = [
  'Cargo.lock',
  'Cargo.toml',
  'xtask/source-inventory.json',
  'xtask/src/frontend_origin.rs',
  'xtask/src/main.rs',
  'xtask/src/recovery/full_stack/worker/controller.rs',
]
const policy = {
  format_version: 1,
  files: ['Cargo.lock', 'Cargo.toml', 'xtask/source-inventory.json'],
  trees: ['xtask/src'],
  excluded_directories: [],
}
let backend: string
let bindingFile: string
let executable: string
let workerTool: WorkerTool

function write(file: string, bytes: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, bytes)
}

function digest(file: string) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function binding() {
  return {
    format_version: 1,
    kind: 'frontend-origin-tool',
    executable: { path: executable, sha256: digest(executable) },
    sources: sources.map((file) => ({ path: file, sha256: digest(path.join(backend, file)) })),
  }
}

function publishText(text: string) {
  write(bindingFile, text)
  workerTool = {
    root: backend,
    binding: { path: bindingFile, bytes: Buffer.byteLength(text), sha256: digest(bindingFile) },
  }
}

function publish(value: unknown) {
  const text = JSON.stringify(value)
  if (typeof text !== 'string') throw new Error('绑定夹具必须可编码为 JSON')
  publishText(text)
}

function token(count: number) {
  return {
    format_version: 1,
    kind: 'frontend-origin-source-snapshot',
    source_count: count,
    sha256: 'a'.repeat(64),
  }
}

beforeEach(() => {
  native.verify.mockReset()
  native.verify.mockImplementation((_file, _args, options) =>
    JSON.stringify(token(JSON.parse(options.input).sources.length)),
  )
  fs.mkdirSync(temporaryRoot, { recursive: true })
  backend = fs.mkdtempSync(path.join(temporaryRoot, '中文 空格-'))
  executable = path.join(backend, 'native tool.exe')
  bindingFile = path.join(backend, '.local-tests/frontend-origin-tool.json')
  sources.forEach((file) => write(path.join(backend, file), file))
  write(path.join(backend, 'xtask/source-inventory.json'), JSON.stringify(policy))
  write(executable, 'executable-fixture')
  publish(binding())
})

afterEach(() => {
  const resolved = fs.realpathSync.native(backend)
  if (path.dirname(resolved) !== fs.realpathSync.native(temporaryRoot)) {
    throw new Error('拒绝清理越界夹具')
  }
  fs.rmSync(resolved, { recursive: true })
})

describe('Worker 跨仓正式工具绑定', () => {
  it('接受完整来源绑定并支持中文、空格路径', () => {
    const tool = bindWorkerTool(workerTool)
    expect(tool.executable).toBe(executable)
    expect(native.verify).toHaveBeenCalledWith(
      executable,
      ['__frontend-origin', 'verify-sources'],
      expect.objectContaining({
        cwd: backend,
        timeout: 60_000,
        maxBuffer: 4096,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({ APP_ENV: 'test' }),
      }),
    )
    expect(JSON.parse(native.verify.mock.calls[0][2].input)).toEqual({
      format_version: 1,
      root: backend,
      sources: binding().sources,
    })
    expect(native.verify).toHaveBeenCalledOnce()
    tool.verifyUnchanged()
    expect(native.verify).toHaveBeenCalledTimes(2)
  })

  it('拒绝目录排除策略，即使绑定包含该策略的当前摘要', () => {
    write(
      path.join(backend, 'xtask/source-inventory.json'),
      JSON.stringify({ ...policy, excluded_directories: ['target'] }),
    )
    publish(binding())
    expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
  })

  it('名为 target 的嵌套目录也必须进入完整来源绑定', () => {
    const tool = bindWorkerTool(workerTool)
    const relative = 'xtask/src/target/control.rs'
    write(path.join(backend, relative), 'nested source')
    expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
    const value = binding()
    value.sources.push({ path: relative, sha256: digest(path.join(backend, relative)) })
    value.sources.sort((left, right) =>
      Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)),
    )
    publish(value)
    bindWorkerTool(workerTool).verifyUnchanged()
  })

  it.each(['missing', 'duplicate', 'unknown', 'version', 'source-order', 'relative', 'parent'])(
    '拒绝 %s 绑定，禁止猜测工具',
    (mode) => {
      const value = binding()
      if (mode === 'missing') fs.unlinkSync(bindingFile)
      if (mode === 'duplicate') publishText('{"format_version":1,"format_version":1}')
      if (mode === 'unknown') publish({ ...value, private: true })
      if (mode === 'version') publish({ ...value, format_version: 2 })
      if (mode === 'source-order') {
        value.sources.reverse()
        publish(value)
      }
      if (mode === 'relative' || mode === 'parent') {
        value.executable.path =
          mode === 'relative' ? 'native tool.exe' : `${backend}${path.sep}..${path.sep}tool.exe`
        publish(value)
      }
      expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
    },
  )

  it.each(['source', 'executable', 'binding'])('执行前后 %s 的内容变化均失败关闭', (target) => {
    const file =
      target === 'source'
        ? path.join(backend, sources[0])
        : target === 'executable'
          ? executable
          : bindingFile
    const tool = bindWorkerTool(workerTool)
    write(file, `${fs.readFileSync(file, 'utf8')} `)
    expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
  })

  it.each(['modified-worker', 'added-worker', 'removed-worker', 'omitted-worker', 'policy-drift'])(
    '完整集合拒绝 %s，旧程序不能继续运行',
    (mode) => {
      const file = path.join(backend, sources.at(-1)!)
      const tool = bindWorkerTool(workerTool)
      if (mode === 'modified-worker') write(file, 'changed worker')
      if (mode === 'added-worker')
        write(path.join(backend, 'xtask/src/new-worker.rs'), 'new worker')
      if (mode === 'removed-worker') fs.unlinkSync(file)
      if (mode === 'policy-drift') write(path.join(backend, 'xtask/source-inventory.json'), '{}')
      if (mode === 'omitted-worker') {
        const value = binding()
        value.sources.pop()
        publish(value)
      }
      expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
      expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
    },
  )

  it('相同字节程序被替换仍属于身份漂移', () => {
    const tool = bindWorkerTool(workerTool)
    const bytes = fs.readFileSync(executable)
    fs.renameSync(executable, `${executable}.old`)
    fs.writeFileSync(executable, bytes)
    expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
  })

  it('源码摘要或程序摘要过期时在启动前失败', () => {
    write(path.join(backend, sources[0]), 'changed-source')
    expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
    publish(binding())
    write(executable, 'changed-binary')
    expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
  })

  it('固定绑定的描述须匹配实际原始字节和摘要，配置不能替换根或位置', () => {
    for (const changes of [
      { bytes: workerTool.binding.bytes + 1 },
      { sha256: '0'.repeat(64) },
      { path: executable },
    ]) {
      const selected = { ...workerTool, binding: { ...workerTool.binding, ...changes } }
      expect(() => bindWorkerTool(selected)).toThrow('正式工具绑定无效或漂移')
    }
    const tool = bindWorkerTool(workerTool)
    fs.renameSync(bindingFile, bindingFile + '.old')
    write(bindingFile, fs.readFileSync(bindingFile + '.old', 'utf8'))
    expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
  })

  it('原生编译根拒绝或传输失败不会泄露响应，也不回退其他工具', () => {
    native.verify.mockImplementation(() => {
      throw Object.assign(new Error('PRIVATE-SENTINEL'), {
        stdout: 'PRIVATE-SENTINEL',
        stderr: 'PRIVATE-SENTINEL',
      })
    })
    expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
    expect(() => bindWorkerTool(workerTool)).not.toThrow('PRIVATE-SENTINEL')
  })

  it('严格核对原生 token 的字段、计数和摘要，不能把错误或截断当成功', () => {
    for (const value of [
      {},
      { ...token(sources.length), extra: true },
      { ...token(sources.length), format_version: 2 },
      { ...token(sources.length), kind: 'frontend-origin-source-error' },
      ...[true, 0, sources.length + 1].map((source_count) => ({
        ...token(sources.length),
        source_count,
      })),
      { ...token(sources.length), sha256: 'PRIVATE-SENTINEL' },
      '{"format_version":1,"format_version":1}',
      'truncated',
    ]) {
      native.verify.mockReturnValue(typeof value === 'string' ? value : JSON.stringify(value))
      expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
    }
  })

  it('原生核验期间文件漂移和控制后 token 变化均不能返回成功', () => {
    native.verify.mockImplementationOnce(() => {
      write(path.join(backend, sources[0]), 'changed during native verification')
      return JSON.stringify(token(sources.length))
    })
    expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
    write(path.join(backend, sources[0]), sources[0])
    const tool = bindWorkerTool(workerTool)
    native.verify.mockReturnValueOnce(
      JSON.stringify({ ...token(sources.length), sha256: 'c'.repeat(64) }),
    )
    expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
  })

  it('祖先目录被替换成 junction 或符号链接时拒绝', () => {
    const xtask = path.join(backend, 'xtask')
    const original = path.join(backend, 'xtask-original')
    fs.renameSync(xtask, original)
    fs.symlinkSync(original, xtask, process.platform === 'win32' ? 'junction' : 'dir')
    expect(() => bindWorkerTool(workerTool)).toThrow('正式工具绑定无效或漂移')
    fs.unlinkSync(xtask)
  })
})
