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
  const binding = put('backend/.local-tests/frontend-origin-tool.json', sentinel)
  const python = put('python.exe', '仅验证入口存在，不运行 Python')
  fs.chmodSync(python, 0o755)
  const openapi = put('backend/openapi.json', '{}')
  put('backend/tools/python/source_domain_contract.py', '# 不执行的测试入口')
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
    python_program: python,
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
  return { root, backend, frontend, binding, python, file, value, save, put }
}
