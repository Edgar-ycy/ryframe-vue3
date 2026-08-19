import { createHash } from 'node:crypto'
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const fullShaPattern = /^[0-9a-f]{40}$/iu
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u

function parseArguments(argv) {
  const values = new Map()
  const args = argv[0] === '--' ? argv.slice(1) : argv
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]
    const value = args[index + 1]
    if (!name?.startsWith('--') || value === undefined) {
      throw new Error('用法：consumer:check -- --openapi <文件> --backend-commit <SHA> --backend-repository <owner/repo> --require-pin <true|false>')
    }
    if (values.has(name)) throw new Error(`参数重复：${name}`)
    values.set(name, value)
  }

  const candidate = values.get('--openapi')
  const backendCommit = values.get('--backend-commit')?.toLowerCase()
  const backendRepository = values.get('--backend-repository')
  const requirePin = values.get('--require-pin')
  const allowed = new Set([
    '--openapi',
    '--backend-commit',
    '--backend-repository',
    '--require-pin',
  ])
  for (const name of values.keys()) {
    if (!allowed.has(name)) throw new Error(`未知参数：${name}`)
  }
  if (!candidate || !fullShaPattern.test(backendCommit ?? '')) {
    throw new Error('必须提供候选 OpenAPI 和完整的后端提交 SHA')
  }
  if (!repositoryPattern.test(backendRepository ?? '')) {
    throw new Error('后端仓库必须使用 owner/repository 格式')
  }
  if (requirePin !== 'true' && requirePin !== 'false') {
    throw new Error('--require-pin 只能是 true 或 false')
  }
  return {
    backendCommit,
    backendRepository,
    candidate: path.resolve(candidate),
    requirePin: requirePin === 'true',
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
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
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'ryframe-consumer-contract-'))
  try {
    const temporaryContract = path.join(temporaryRoot, 'openapi.json')
    await copyFile(options.candidate, temporaryContract)
    const [candidateBytes, committedBytes, sourceBytes] = await Promise.all([
      readFile(temporaryContract),
      readFile(path.join(root, 'openapi', 'openapi.json')),
      readFile(path.join(root, 'openapi', 'source.json'), 'utf8'),
    ])
    JSON.parse(candidateBytes.toString('utf8'))
    if (!candidateBytes.equals(committedBytes)) {
      throw new Error('前端提交中的 OpenAPI 与后端候选契约不一致')
    }

    const source = JSON.parse(sourceBytes)
    if (source.backend_repository !== options.backendRepository) {
      throw new Error('openapi/source.json 未指向本次后端仓库')
    }
    if (source.sha256 !== sha256(candidateBytes)) {
      throw new Error('openapi/source.json 的 SHA256 与候选契约不一致')
    }
    if (options.requirePin && source.backend_commit !== options.backendCommit) {
      throw new Error('契约变化时，前端必须精确固定本次后端提交')
    }

    for (const script of [
      'check:contract',
      'check:api-artifacts',
      'check:api-operations',
      'typecheck',
      'test:unit',
    ]) {
      await runPackageScript(script)
    }
    console.log(`消费契约检查通过：${options.backendRepository}@${options.backendCommit}`)
  }
  finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

await main()
