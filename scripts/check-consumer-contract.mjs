import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

import {
  normalizeCommit,
  normalizeRepository,
  verifyLocalContractState,
} from './api-contract-state.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))

export function parseArguments(argv) {
  const values = new Map()
  const args = argv[0] === '--' ? argv.slice(1) : argv
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]
    const value = args[index + 1]
    if (!name?.startsWith('--') || value === undefined) {
      throw new Error(
        '用法：consumer:check -- --mode <candidate|formal> --openapi <文件> ' +
          '--backend-commit <SHA> --backend-repository <owner/repo> --require-pin <true|false>',
      )
    }
    if (values.has(name)) throw new Error(`参数重复：${name}`)
    values.set(name, value)
  }

  const allowed = new Set([
    '--mode',
    '--openapi',
    '--backend-commit',
    '--backend-repository',
    '--require-pin',
  ])
  for (const name of values.keys()) {
    if (!allowed.has(name)) throw new Error(`未知参数：${name}`)
  }
  const mode = values.get('--mode')
  const candidate = values.get('--openapi')
  const requirePin = values.get('--require-pin')
  if (mode !== 'candidate' && mode !== 'formal') {
    throw new Error('--mode 只能是 candidate 或 formal')
  }
  if (!candidate) throw new Error('必须提供 --openapi')
  if (requirePin !== 'true' && requirePin !== 'false') {
    throw new Error('--require-pin 只能是 true 或 false')
  }
  return {
    backendCommit: normalizeCommit(values.get('--backend-commit')),
    backendRepository: normalizeRepository(values.get('--backend-repository')),
    candidate: path.resolve(candidate),
    mode,
    requirePin: requirePin === 'true',
  }
}

export function validateConsumerState(options, local, candidateBytes) {
  if (local.mode !== options.mode) {
    throw new Error(
      `前端契约当前是 ${local.mode} 态，但 consumer:check 请求校验 ${options.mode} 态`,
    )
  }
  if (!candidateBytes.equals(local.bytes)) {
    throw new Error('前端 OpenAPI 与本次后端契约不一致')
  }
  if (local.metadata.backend_repository !== options.backendRepository) {
    throw new Error('openapi/source.json 未指向本次后端仓库')
  }
  if (
    options.mode === 'formal' &&
    options.requirePin &&
    local.metadata.backend_commit !== options.backendCommit
  ) {
    throw new Error('正式契约必须精确固定本次后端提交')
  }
}

async function runPackageScript(name) {
  const packageManager = process.env.npm_execpath
  if (!packageManager) throw new Error('consumer:check 必须通过 pnpm 运行')
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [packageManager, name], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${name} 失败（code=${code ?? 'null'}, signal=${signal ?? 'null'}）`))
    })
  })
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const [local, candidateBytes] = await Promise.all([
    verifyLocalContractState(root),
    readFile(options.candidate),
  ])
  validateConsumerState(options, local, candidateBytes)
  for (const script of [
    'check:contract',
    'check:api-artifacts',
    'check:api-operations',
    'typecheck',
    'test:unit',
  ]) {
    await runPackageScript(script)
  }
  console.log(
    `消费契约 ${options.mode} 态检查通过：` +
      `${options.backendRepository}@${options.backendCommit}`,
  )
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
