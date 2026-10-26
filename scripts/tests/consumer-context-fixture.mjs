import fs from 'node:fs'
import path from 'node:path'
import { fileHash } from '../application-config-files.mjs'

export const sentinel = 'PRIVATE-CONSUMER-CONTEXT-SENTINEL'

export function consumerFixture(t) {
  const base = path.join(process.cwd(), '.local-tests/consumer-context-tests')
  fs.mkdirSync(base, { recursive: true })
  const root = fs.mkdtempSync(path.join(base, '中文 '))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const put = (relative, bytes) => {
    const file = path.join(root, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, bytes)
    return file
  }
  const backend = path.join(root, 'backend')
  const frontend = path.join(root, 'frontend')
  fs.mkdirSync(frontend)
  const executable = put('backend/native tool.exe', '仅验证工具绑定，不执行夹具程序')
  const policy = 'xtask/source-inventory.json'
  const source = 'xtask/src/main.rs'
  put(`backend/${source}`, '// 原生来源夹具\n')
  put(
    `backend/${policy}`,
    JSON.stringify({
      format_version: 1,
      files: [policy],
      trees: ['xtask/src'],
      excluded_directories: [],
    }),
  )
  const binding = put(
    'backend/.local-tests/frontend-origin-tool.json',
    JSON.stringify({
      format_version: 1,
      kind: 'frontend-origin-tool',
      executable: { path: executable, sha256: fileHash(fs.readFileSync(executable)) },
      sources: [policy, source].map((relative) => ({
        path: relative,
        sha256: fileHash(fs.readFileSync(path.join(backend, relative))),
      })),
    }),
  )
  const openapi = put('backend/openapi.json', '{}')
  for (const relative of ['config/tools.toml', '.local-tests/tools.toml']) {
    put(`backend/${relative}`, '# 仅绑定字节，不解析凭据\n')
  }
  const value = {
    format_version: 1,
    arguments: [
      '--mode',
      'formal',
      '--openapi',
      openapi,
      '--backend-commit',
      'a'.repeat(40),
      '--backend-repository',
      'example/backend',
      '--require-pin',
      'true',
    ],
    backend_root: backend,
    frontend_root: frontend,
    origin_tool_binding: {
      path: binding,
      bytes: fs.readFileSync(binding).length,
      sha256: fileHash(fs.readFileSync(binding)),
    },
    tool_configuration: ['config/tools.toml', '.local-tests/tools.toml'].map((relative) => ({
      path: relative,
      sha256: fileHash(fs.readFileSync(path.join(backend, relative))),
    })),
  }
  const file = path.join(root, 'consumer.json')
  const save = (document = value) => fs.writeFileSync(file, JSON.stringify(document))
  save()
  return { root, backend, frontend, binding, executable, file, value, save, put }
}
