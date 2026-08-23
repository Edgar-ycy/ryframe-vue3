import { execFile } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

import {
  canonicalJson,
  normalizeCommit,
  normalizeOpenApiPath,
  normalizeRepository,
  parseContract,
  verifyLocalContractState,
  writeFormalContract,
} from './api-contract-state.mjs'

const mode = process.argv[2] ?? 'sync'
const allowedModes = new Set(['sync', '--verify-local', '--verify-upstream'])
if (!allowedModes.has(mode) || process.argv.length > 3) {
  throw new Error('用法：sync-api-contract.mjs [--verify-local|--verify-upstream]')
}

const root = process.cwd()
const execFileAsync = promisify(execFile)

function sourceUrl(metadata) {
  return `https://raw.githubusercontent.com/${metadata.backend_repository}/${metadata.backend_commit}/${metadata.openapi_path}`
}

function contentsApiUrl(metadata) {
  const sourcePath = metadata.openapi_path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
  return `https://api.github.com/repos/${metadata.backend_repository}/contents/${sourcePath}?ref=${metadata.backend_commit}`
}

async function fetchRemoteSource(value, headers) {
  const response = await fetch(value, { headers, redirect: 'error' })
  if (!response.ok) {
    throw new Error(`读取 OpenAPI 契约失败：${response.status} ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function readRemoteSource(metadata) {
  const rawUrl = sourceUrl(metadata)
  try {
    return await fetchRemoteSource(rawUrl)
  }
  catch (rawError) {
    const apiUrl = contentsApiUrl(metadata)
    try {
      return await fetchRemoteSource(apiUrl, {
        Accept: 'application/vnd.github.raw+json',
        'User-Agent': 'ryframe-api-contract-check',
        'X-GitHub-Api-Version': '2022-11-28',
      })
    }
    catch (apiError) {
      throw new Error(
        `无法从 GitHub Raw（${rawError.message}）或 Contents API（${apiError.message}）`
        + '读取固定的 OpenAPI 契约',
      )
    }
  }
}

async function readPinnedSource(metadata) {
  const backendWorktree = process.env.RYFRAME_BACKEND_WORKTREE?.trim()
  if (!backendWorktree) return readRemoteSource(metadata)

  const objectName = `${metadata.backend_commit}:${metadata.openapi_path}`
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', path.resolve(backendWorktree), 'show', objectName],
      { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 },
    )
    return Buffer.from(stdout)
  }
  catch (error) {
    throw new Error(
      `无法从后端 Git 对象 ${objectName} 读取 OpenAPI；请确认工作区和提交 SHA 正确：${error.message}`,
    )
  }
}

function requireSyncMetadata() {
  return {
    schema_version: 1,
    backend_repository: normalizeRepository(process.env.RYFRAME_BACKEND_REPOSITORY),
    backend_commit: normalizeCommit(process.env.RYFRAME_BACKEND_COMMIT),
    openapi_path: normalizeOpenApiPath(process.env.RYFRAME_OPENAPI_PATH),
  }
}

async function sync() {
  let metadata
  try {
    metadata = requireSyncMetadata()
  }
  catch (error) {
    throw new Error(
      `${error.message}。api:sync 需要 RYFRAME_BACKEND_REPOSITORY 和 RYFRAME_BACKEND_COMMIT。`,
    )
  }

  const source = process.env.RYFRAME_BACKEND_WORKTREE?.trim()
    ? `${path.resolve(process.env.RYFRAME_BACKEND_WORKTREE)} Git 对象 ${metadata.backend_commit}:${metadata.openapi_path}`
    : sourceUrl(metadata)
  const document = parseContract(await readPinnedSource(metadata), source)
  const sourceMetadata = await writeFormalContract(root, document, metadata)
  console.log(
    `已从 ${sourceMetadata.backend_repository}@${sourceMetadata.backend_commit} 同步正式 OpenAPI 契约`,
  )
}

async function verifyUpstream() {
  const local = await verifyLocalContractState(root)
  if (local.mode !== 'formal') {
    throw new Error('候选契约不能执行 --verify-upstream；请先运行 cargo api-sync --commit <提交>')
  }
  const upstream = parseContract(
    await readRemoteSource(local.metadata),
    sourceUrl(local.metadata),
  )
  const upstreamBytes = Buffer.from(canonicalJson(upstream), 'utf8')
  if (!upstreamBytes.equals(local.bytes)) {
    throw new Error('固定的上游 OpenAPI 与 openapi/openapi.json 不一致；请重新正式同步')
  }
  console.log(
    `上游 OpenAPI 与 ${local.metadata.backend_repository}@${local.metadata.backend_commit} 一致`,
  )
}

if (mode === 'sync') await sync()
else if (mode === '--verify-local') {
  const local = await verifyLocalContractState(root)
  console.log(`本地 OpenAPI ${local.mode === 'candidate' ? '候选态' : '正式态'}校验通过`)
}
else await verifyUpstream()
