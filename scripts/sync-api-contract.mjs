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

import { pathToFileURL } from 'node:url'
import { loadToolInputs, toolObject } from './tool-inputs.mjs'
import { optionalManagedFile } from './application-config-files.mjs'

const execFileAsync = promisify(execFile)

function sourceUrl(metadata) {
  return `https://raw.githubusercontent.com/${metadata.backend_repository}/${metadata.backend_commit}/${metadata.openapi_path}`
}

function contentsApiUrl(metadata) {
  const sourcePath = metadata.openapi_path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
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
  } catch (rawError) {
    const apiUrl = contentsApiUrl(metadata)
    try {
      return await fetchRemoteSource(apiUrl, {
        Accept: 'application/vnd.github.raw+json',
        'User-Agent': 'ryframe-api-contract-check',
        'X-GitHub-Api-Version': '2022-11-28',
      })
    } catch (apiError) {
      throw new Error(
        `无法从 GitHub Raw（${rawError.message}）或 Contents API（${apiError.message}）` +
          '读取固定的 OpenAPI 契约',
        { cause: apiError },
      )
    }
  }
}

export async function readPinnedSource(metadata, backendWorktree, execute = execFileAsync) {
  if (!backendWorktree) return readRemoteSource(metadata)

  const objectName = `${metadata.backend_commit}:${metadata.openapi_path}`
  try {
    const { stdout } = await execute(
      'git',
      ['-C', path.resolve(backendWorktree), 'show', objectName],
      { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 },
    )
    return Buffer.from(stdout)
  } catch (error) {
    throw new Error(
      `无法从后端 Git 对象 ${objectName} 读取 OpenAPI；请确认工作区和提交 SHA 正确：${error.message}`,
      { cause: error },
    )
  }
}

function pinnedSourceLabel(metadata, backendWorktree) {
  return backendWorktree
    ? `${path.resolve(backendWorktree)} Git 对象 ${metadata.backend_commit}:${metadata.openapi_path}`
    : sourceUrl(metadata)
}

export function parseSyncArguments(argv) {
  const options = { mode: 'sync', write: false }
  const fields = {
    '--backend-repository': 'backend_repository',
    '--backend-commit': 'backend_commit',
    '--openapi-path': 'openapi_path',
    '--backend-worktree': 'backend_worktree',
  }
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === '--write') {
      if (options.write) throw new Error('--write 不能重复')
      options.write = true
    } else if (['--verify-local', '--verify-upstream'].includes(flag)) {
      if (options.mode !== 'sync') throw new Error('校验模式不能重复或混用')
      options.mode = flag
    } else if (fields[flag]) {
      const value = argv[++index]
      if (!value || value.startsWith('--') || options[fields[flag]] !== undefined)
        throw new Error('契约同步参数缺少值或重复')
      options[fields[flag]] = value
    } else throw new Error('契约同步参数无效；请核对 CLI 参数')
  }
  if (
    options.mode !== 'sync' &&
    (options.write ||
      ['backend_repository', 'backend_commit', 'openapi_path'].some(
        (key) => options[key] !== undefined,
      ))
  )
    throw new Error('校验模式不能修改来源或写入契约')
  if (options.mode === '--verify-local' && options.backend_worktree !== undefined)
    throw new Error('本地校验不接受后端工作树')
  return options
}

export function syncMetadata(options) {
  const metadata = {
    schema_version: 1,
    backend_repository: normalizeRepository(options.backend_repository),
    backend_commit: normalizeCommit(options.backend_commit),
    openapi_path: normalizeOpenApiPath(options.openapi_path),
  }
  if (/[\\:\0\r\n?#]/u.test(metadata.openapi_path))
    throw new Error('openapi_path 必须是无控制字符的仓库相对 JSON 路径')
  return metadata
}

async function sync(root, options, readSource) {
  const metadata = syncMetadata(options)
  const source = pinnedSourceLabel(metadata, options.backend_worktree)
  const document = parseContract(await readSource(metadata, options.backend_worktree), source)
  if (!options.write) {
    console.log(
      `预览通过：${metadata.backend_repository}@${metadata.backend_commit}；显式 --write 才更新正式契约`,
    )
    return
  }
  for (const file of ['openapi/openapi.json', 'openapi/source.json', 'openapi/candidate.json'])
    optionalManagedFile(root, file, '正式契约写入路径')
  const sourceMetadata = await writeFormalContract(root, document, metadata)
  console.log(
    `已从 ${sourceMetadata.backend_repository}@${sourceMetadata.backend_commit} 同步正式 OpenAPI 契约`,
  )
}

async function verifyUpstream(root, options, readSource) {
  const local = await verifyLocalContractState(root)
  if (local.mode !== 'formal') {
    throw new Error(
      '候选契约不能执行 --verify-upstream；请先运行 cargo xtask generate api --commit <提交> --write',
    )
  }
  syncMetadata(local.metadata)
  const source = pinnedSourceLabel(local.metadata, options.backend_worktree)
  const upstream = parseContract(await readSource(local.metadata, options.backend_worktree), source)
  const upstreamBytes = Buffer.from(canonicalJson(upstream), 'utf8')
  if (!upstreamBytes.equals(local.bytes)) {
    throw new Error('固定的上游 OpenAPI 与 openapi/openapi.json 不一致；请重新正式同步')
  }
  console.log(
    `上游 OpenAPI 与 ${local.metadata.backend_repository}@${local.metadata.backend_commit} 一致`,
  )
}

export async function runSync(options, root = process.cwd(), readSource = readPinnedSource) {
  if (options.mode === '--verify-local') {
    const local = await verifyLocalContractState(root)
    console.log(`本地 OpenAPI ${local.mode === 'candidate' ? '候选态' : '正式态'}校验通过`)
    return
  }
  const tools = loadToolInputs(root)
  const configured = tools.value.api_contract ?? {}
  toolObject(
    configured,
    ['backend_repository', 'backend_commit', 'openapi_path', 'backend_worktree'],
    'api_contract',
  )
  const selected = { ...configured, ...options }
  if (
    selected.backend_worktree !== undefined &&
    (typeof selected.backend_worktree !== 'string' ||
      !path.isAbsolute(selected.backend_worktree) ||
      /[\0\r\n]/u.test(selected.backend_worktree))
  )
    throw new Error('backend_worktree 必须是明确的绝对路径')
  const checkedSource = async (...args) => {
    const bytes = await readSource(...args)
    if (JSON.stringify(tools.files) !== JSON.stringify(loadToolInputs(root).files))
      throw new Error('契约同步期间工具配置漂移；请稳定配置后重试')
    return bytes
  }
  if (options.mode === 'sync') await sync(root, selected, checkedSource)
  else await verifyUpstream(root, selected, checkedSource)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runSync(parseSyncArguments(process.argv.slice(2))).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
