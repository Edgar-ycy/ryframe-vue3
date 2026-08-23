import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { requireApiPrefixContract } from './api-prefix-contract.mjs'
import { requirePermissionCatalog } from './permission-catalog-contract.mjs'

export const candidateMarkerRelativePath = 'openapi/candidate.json'
export const defaultOpenApiPath = 'openapi/openapi.json'

const sha256Pattern = /^[0-9a-f]{64}$/iu
const commitPattern = /^[0-9a-f]{40}$/iu
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u
const decoder = new TextDecoder('utf-8', { fatal: true })
const markerKeys = [
  'candidate_sha256',
  'formal_source_sha256',
  'mode',
  'openapi_version',
  'schema_version',
]

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function normalizeRepository(value) {
  const repository = value?.trim()
  if (!repositoryPattern.test(repository ?? '')) {
    throw new Error('backend_repository 必须是 owner/repository 标识')
  }
  return repository
}

export function normalizeCommit(value) {
  const commit = value?.trim().toLowerCase()
  if (!commitPattern.test(commit ?? '')) {
    throw new Error('backend_commit 必须是完整的 40 字符 Git 提交 SHA')
  }
  return commit
}

export function normalizeOpenApiPath(value) {
  const sourcePath = value?.trim() || defaultOpenApiPath
  const segments = sourcePath.split('/')
  if (!sourcePath.endsWith('.json')
    || sourcePath.startsWith('/')
    || segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('openapi_path 必须是不含路径穿越的相对 JSON 路径')
  }
  return sourcePath
}

export function validateMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('openapi/source.json 必须包含对象')
  }
  if (value.schema_version !== 1) {
    throw new Error('openapi/source.json 使用了不支持的 schema_version')
  }
  const metadata = {
    schema_version: 1,
    backend_repository: normalizeRepository(value.backend_repository),
    backend_commit: normalizeCommit(value.backend_commit),
    openapi_path: normalizeOpenApiPath(value.openapi_path),
    openapi_version: String(value.openapi_version ?? ''),
    sha256: String(value.sha256 ?? '').toLowerCase(),
  }
  if (!metadata.openapi_version.startsWith('3.')) {
    throw new Error('openapi/source.json 必须记录 OpenAPI 3 版本')
  }
  if (!sha256Pattern.test(metadata.sha256)) {
    throw new Error('openapi/source.json sha256 必须是 64 字符十六进制摘要')
  }
  return metadata
}

export function validateCandidateMarker(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('openapi/candidate.json 必须包含对象')
  }
  const keys = Object.keys(value).sort()
  if (keys.length !== markerKeys.length
    || keys.some((key, index) => key !== markerKeys[index])) {
    throw new Error('openapi/candidate.json 字段集合无效')
  }
  if (value.schema_version !== 1 || value.mode !== 'candidate') {
    throw new Error('openapi/candidate.json 必须使用 schema_version=1 和 mode=candidate')
  }
  const marker = {
    candidate_sha256: String(value.candidate_sha256 ?? '').toLowerCase(),
    formal_source_sha256: String(value.formal_source_sha256 ?? '').toLowerCase(),
    mode: 'candidate',
    openapi_version: String(value.openapi_version ?? ''),
    schema_version: 1,
  }
  if (!marker.openapi_version.startsWith('3.')) {
    throw new Error('openapi/candidate.json 必须记录 OpenAPI 3 版本')
  }
  if (!sha256Pattern.test(marker.candidate_sha256)
    || !sha256Pattern.test(marker.formal_source_sha256)) {
    throw new Error('openapi/candidate.json 必须记录有效的 SHA256 摘要')
  }
  return marker
}

export function parseContract(bytes, label) {
  let source
  try {
    source = decoder.decode(bytes)
  }
  catch (error) {
    throw new Error(`${label} 不是有效 UTF-8：${error.message}`)
  }
  let document
  try {
    document = JSON.parse(source)
  }
  catch (error) {
    throw new Error(`${label} 不是有效 JSON：${error.message}`)
  }
  validateContract(document, label)
  return document
}

export function validateContract(document, label) {
  if (!String(document.openapi).startsWith('3.') || document.info?.title !== 'RyFrame API') {
    throw new Error(`${label} 不是受支持的 RyFrame OpenAPI 3 契约`)
  }
  const passwordPolicy = document['x-ryframe-password-policy']
  if (!passwordPolicy
    || passwordPolicy.version !== 1
    || !Number.isInteger(passwordPolicy.min_length)
    || !Number.isInteger(passwordPolicy.max_length)
    || typeof passwordPolicy.pattern !== 'string'
    || passwordPolicy.allowed_characters !== 'ascii_graphic'
    || !Array.isArray(passwordPolicy.required_classes)) {
    throw new Error(`${label} 缺少受支持的 RyFrame 密码策略`)
  }
  const noticePolicy = document['x-ryframe-notice-policy']
  if (!noticePolicy
    || noticePolicy.version !== 1
    || !Number.isInteger(noticePolicy.content_markdown?.min_utf8_bytes)
    || !Number.isInteger(noticePolicy.content_markdown?.max_utf8_bytes)
    || noticePolicy.content_markdown.min_utf8_bytes < 1
    || noticePolicy.content_markdown.max_utf8_bytes < noticePolicy.content_markdown.min_utf8_bytes) {
    throw new Error(`${label} 缺少受支持的 RyFrame 公告策略`)
  }
  requireApiPrefixContract(document['x-ryframe-api-prefix'], label)
  requirePermissionCatalog(document['x-ryframe-permission-catalog'], label)
}

async function readOptional(pathname) {
  try {
    return await readFile(pathname)
  }
  catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function verifyLocalContractState(root) {
  const sourcePath = path.join(root, 'openapi', 'source.json')
  const openapiPath = path.join(root, 'openapi', 'openapi.json')
  const markerPath = path.join(root, candidateMarkerRelativePath)
  const [sourceBytes, openapiBytes, markerBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(openapiPath),
    readOptional(markerPath),
  ])
  const metadata = validateMetadata(JSON.parse(sourceBytes.toString('utf8')))
  const document = parseContract(openapiBytes, 'openapi/openapi.json')
  const canonicalOpenapi = Buffer.from(canonicalJson(document), 'utf8')
  if (!openapiBytes.equals(canonicalOpenapi)) {
    throw new Error('openapi/openapi.json 必须使用规范 UTF-8 JSON 格式；请运行 cargo api-sync')
  }

  if (markerBytes) {
    const marker = validateCandidateMarker(JSON.parse(markerBytes.toString('utf8')))
    if (!markerBytes.equals(Buffer.from(canonicalJson(marker), 'utf8'))) {
      throw new Error('openapi/candidate.json 必须使用规范 UTF-8 JSON 格式')
    }
    if (marker.candidate_sha256 !== sha256(openapiBytes)) {
      throw new Error('openapi/candidate.json 的候选摘要与 openapi/openapi.json 不一致')
    }
    if (marker.formal_source_sha256 !== sha256(sourceBytes)) {
      throw new Error('候选同步后 openapi/source.json 已被修改')
    }
    if (marker.openapi_version !== document.openapi) {
      throw new Error('openapi/candidate.json 的 OpenAPI 版本与候选契约不一致')
    }
    return { bytes: openapiBytes, document, marker, metadata, mode: 'candidate' }
  }

  if (metadata.sha256 !== sha256(openapiBytes)) {
    throw new Error('openapi/source.json sha256 与 openapi/openapi.json 不一致')
  }
  if (metadata.openapi_version !== document.openapi) {
    throw new Error('openapi/source.json 的 OpenAPI 版本与 openapi/openapi.json 不一致')
  }
  return { bytes: openapiBytes, document, marker: null, metadata, mode: 'formal' }
}

export async function writeFormalContract(root, document, source) {
  validateContract(document, '正式 OpenAPI')
  const serializedDocument = canonicalJson(document)
  const metadata = validateMetadata({
    ...source,
    openapi_version: document.openapi,
    sha256: sha256(serializedDocument),
  })
  const openapiPath = path.join(root, defaultOpenApiPath)
  const metadataPath = path.join(root, 'openapi', 'source.json')
  await mkdir(path.dirname(openapiPath), { recursive: true })
  await writeFile(openapiPath, serializedDocument, 'utf8')
  await writeFile(metadataPath, canonicalJson(metadata), 'utf8')
  // marker 是状态切换的最后一步；前两次写入失败时仍保持候选态，不会误报正式契约。
  await rm(path.join(root, candidateMarkerRelativePath), { force: true })
  return metadata
}
