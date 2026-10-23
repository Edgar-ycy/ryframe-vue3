import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { bindWorkerTool } from '../browser-real/worker-tool.mjs'

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
  excluded_directories: ['target'],
}
let backend: string
let bindingFile: string
let executable: string

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

beforeEach(() => {
  fs.mkdirSync(temporaryRoot, { recursive: true })
  backend = fs.mkdtempSync(path.join(temporaryRoot, '中文 空格-'))
  executable = path.join(backend, 'native tool.exe')
  bindingFile = path.join(backend, '.local-tests/frontend-origin-tool.json')
  sources.forEach((file) => write(path.join(backend, file), file))
  write(path.join(backend, 'xtask/source-inventory.json'), JSON.stringify(policy))
  write(executable, 'executable-fixture')
  write(bindingFile, JSON.stringify(binding()))
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
    const tool = bindWorkerTool(backend)
    expect(tool.executable).toBe(executable)
    tool.verifyUnchanged()
  })

  it.each(['missing', 'duplicate', 'unknown', 'version', 'source-order', 'relative', 'parent'])(
    '拒绝 %s 绑定，禁止猜测工具',
    (mode) => {
      const value = binding()
      if (mode === 'missing') fs.unlinkSync(bindingFile)
      if (mode === 'duplicate') write(bindingFile, '{"format_version":1,"format_version":1}')
      if (mode === 'unknown') write(bindingFile, JSON.stringify({ ...value, private: true }))
      if (mode === 'version') write(bindingFile, JSON.stringify({ ...value, format_version: 2 }))
      if (mode === 'source-order') {
        value.sources.reverse()
        write(bindingFile, JSON.stringify(value))
      }
      if (mode === 'relative' || mode === 'parent') {
        value.executable.path =
          mode === 'relative' ? 'native tool.exe' : `${backend}${path.sep}..${path.sep}tool.exe`
        write(bindingFile, JSON.stringify(value))
      }
      expect(() => bindWorkerTool(backend)).toThrow('正式工具绑定无效或漂移')
    },
  )

  it.each(['source', 'executable', 'binding'])('执行前后 %s 的内容变化均失败关闭', (target) => {
    const file =
      target === 'source'
        ? path.join(backend, sources[0])
        : target === 'executable'
          ? executable
          : bindingFile
    const tool = bindWorkerTool(backend)
    write(file, `${fs.readFileSync(file, 'utf8')} `)
    expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
  })

  it.each(['modified-worker', 'added-worker', 'removed-worker', 'omitted-worker', 'policy-drift'])(
    '完整集合拒绝 %s，旧程序不能继续运行',
    (mode) => {
      const file = path.join(backend, sources.at(-1)!)
      const tool = bindWorkerTool(backend)
      if (mode === 'modified-worker') write(file, 'changed worker')
      if (mode === 'added-worker')
        write(path.join(backend, 'xtask/src/new-worker.rs'), 'new worker')
      if (mode === 'removed-worker') fs.unlinkSync(file)
      if (mode === 'policy-drift') write(path.join(backend, 'xtask/source-inventory.json'), '{}')
      if (mode === 'omitted-worker') {
        const value = binding()
        value.sources.pop()
        write(bindingFile, JSON.stringify(value))
      }
      expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
      expect(() => bindWorkerTool(backend)).toThrow('正式工具绑定无效或漂移')
    },
  )

  it('相同字节程序被替换仍属于身份漂移', () => {
    const tool = bindWorkerTool(backend)
    const bytes = fs.readFileSync(executable)
    fs.renameSync(executable, `${executable}.old`)
    fs.writeFileSync(executable, bytes)
    expect(tool.verifyUnchanged).toThrow('正式工具绑定无效或漂移')
  })

  it('源码摘要或程序摘要过期时在启动前失败', () => {
    write(path.join(backend, sources[0]), 'changed-source')
    expect(() => bindWorkerTool(backend)).toThrow('正式工具绑定无效或漂移')
    write(bindingFile, JSON.stringify(binding()))
    write(executable, 'changed-binary')
    expect(() => bindWorkerTool(backend)).toThrow('正式工具绑定无效或漂移')
  })

  it('祖先目录被替换成 junction 或符号链接时拒绝', () => {
    const xtask = path.join(backend, 'xtask')
    const original = path.join(backend, 'xtask-original')
    fs.renameSync(xtask, original)
    fs.symlinkSync(original, xtask, process.platform === 'win32' ? 'junction' : 'dir')
    expect(() => bindWorkerTool(backend)).toThrow('正式工具绑定无效或漂移')
    fs.unlinkSync(xtask)
  })
})
