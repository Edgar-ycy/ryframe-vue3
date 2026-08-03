import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { requireApiPrefixContract } from './api-prefix-contract.mjs'

const mode = process.argv[2] ?? 'sync'
const allowedModes = new Set(['sync', '--verify-local', '--verify-upstream'])
if (!allowedModes.has(mode) || process.argv.length > 3) {
  throw new Error('usage: sync-api-contract.mjs [--verify-local|--verify-upstream]')
}

const metadataPath = path.resolve('openapi/source.json')
const outputPath = path.resolve('openapi/openapi.json')
const passwordPolicyPath = path.resolve(
  'src/shared/security/passwordPolicy.generated.json',
)
const noticePolicyPath = path.resolve(
  'src/shared/markdown/noticePolicy.generated.json',
)
const apiPrefixPath = path.resolve(
  'src/shared/config/apiPrefix.generated.json',
)
const defaultOpenApiPath = 'openapi/openapi.json'
const sha256Pattern = /^[0-9a-f]{64}$/i
const commitPattern = /^[0-9a-f]{40}$/i
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const decoder = new TextDecoder('utf-8', { fatal: true })

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function normalizeRepository(value) {
  const repository = value?.trim()
  if (!repositoryPattern.test(repository ?? '')) {
    throw new Error('backend_repository must be an owner/repository identifier')
  }
  return repository
}

function normalizeCommit(value) {
  const commit = value?.trim().toLowerCase()
  if (!commitPattern.test(commit ?? '')) {
    throw new Error('backend_commit must be a full 40-character Git commit SHA')
  }
  return commit
}

function normalizeOpenApiPath(value) {
  const sourcePath = value?.trim() || defaultOpenApiPath
  const segments = sourcePath.split('/')
  if (!sourcePath.endsWith('.json')
    || sourcePath.startsWith('/')
    || segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('openapi_path must be a relative JSON path without traversal segments')
  }
  return sourcePath
}

function sourceUrl(metadata) {
  return `https://raw.githubusercontent.com/${metadata.backend_repository}/${metadata.backend_commit}/${metadata.openapi_path}`
}

function validateMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('openapi/source.json must contain an object')
  }
  if (value.schema_version !== 1) {
    throw new Error('openapi/source.json has an unsupported schema_version')
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
    throw new Error('openapi/source.json must record an OpenAPI 3 version')
  }
  if (!sha256Pattern.test(metadata.sha256)) {
    throw new Error('openapi/source.json sha256 must be a 64-character hexadecimal digest')
  }
  return metadata
}

function parseContract(bytes, label) {
  let rawDocument
  try {
    rawDocument = decoder.decode(bytes)
  }
  catch (error) {
    throw new Error(`${label} is not valid UTF-8: ${error.message}`)
  }

  let document
  try {
    document = JSON.parse(rawDocument)
  }
  catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`)
  }
  validateContract(document, label)
  return document
}

function validateContract(document, label) {
  if (!String(document.openapi).startsWith('3.') || document.info?.title !== 'RyFrame API') {
    throw new Error(`${label} is not a supported RyFrame OpenAPI 3 contract`)
  }

  const passwordPolicy = document['x-ryframe-password-policy']
  if (!passwordPolicy
    || passwordPolicy.version !== 1
    || !Number.isInteger(passwordPolicy.min_length)
    || !Number.isInteger(passwordPolicy.max_length)
    || typeof passwordPolicy.pattern !== 'string'
    || passwordPolicy.allowed_characters !== 'ascii_graphic'
    || !Array.isArray(passwordPolicy.required_classes)) {
    throw new Error(`${label} is missing a supported RyFrame password policy`)
  }

  const noticePolicy = document['x-ryframe-notice-policy']
  if (!noticePolicy
    || noticePolicy.version !== 1
    || !Number.isInteger(noticePolicy.content_markdown?.min_utf8_bytes)
    || !Number.isInteger(noticePolicy.content_markdown?.max_utf8_bytes)
    || noticePolicy.content_markdown.min_utf8_bytes < 1
    || noticePolicy.content_markdown.max_utf8_bytes < noticePolicy.content_markdown.min_utf8_bytes) {
    throw new Error(`${label} is missing a supported RyFrame notice policy`)
  }

  const apiPrefix = document['x-ryframe-api-prefix']
  requireApiPrefixContract(apiPrefix, label)
}

async function readSource(value) {
  if (!/^https?:\/\//i.test(value)) return readFile(path.resolve(value))

  const response = await fetch(value, { redirect: 'error' })
  if (!response.ok) {
    throw new Error(`failed to fetch OpenAPI contract: ${response.status} ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function readMetadata() {
  let source
  try {
    source = JSON.parse(await readFile(metadataPath, 'utf8'))
  }
  catch (error) {
    throw new Error(`failed to read openapi/source.json: ${error.message}`)
  }
  return validateMetadata(source)
}

async function verifyLocal(metadata) {
  const bytes = await readFile(outputPath)
  const document = parseContract(bytes, 'openapi/openapi.json')
  const serialized = canonicalJson(document)
  const expectedBytes = Buffer.from(serialized, 'utf8')

  if (!bytes.equals(expectedBytes)) {
    throw new Error('openapi/openapi.json must use canonical UTF-8 JSON formatting; run pnpm api:sync')
  }
  if (sha256(expectedBytes) !== metadata.sha256) {
    throw new Error('openapi/source.json sha256 does not match openapi/openapi.json')
  }
  if (document.openapi !== metadata.openapi_version) {
    throw new Error('openapi/source.json openapi_version does not match openapi/openapi.json')
  }
  return { document, bytes: expectedBytes }
}

function requireSyncMetadata() {
  const metadata = {
    schema_version: 1,
    backend_repository: normalizeRepository(process.env.RYFRAME_BACKEND_REPOSITORY),
    backend_commit: normalizeCommit(process.env.RYFRAME_BACKEND_COMMIT),
    openapi_path: normalizeOpenApiPath(process.env.RYFRAME_OPENAPI_PATH),
  }
  return metadata
}

async function sync() {
  let metadata
  try {
    metadata = requireSyncMetadata()
  }
  catch (error) {
    throw new Error(
      `${error.message}. api:sync requires RYFRAME_BACKEND_REPOSITORY and RYFRAME_BACKEND_COMMIT.`,
    )
  }

  const pinnedSource = sourceUrl(metadata)
  const configuredSource = process.env.RYFRAME_OPENAPI_SOURCE?.trim()
  if (configuredSource && /^https?:\/\//i.test(configuredSource) && configuredSource !== pinnedSource) {
    throw new Error('RYFRAME_OPENAPI_SOURCE must equal the exact pinned raw GitHub URL when it is remote')
  }
  const source = configuredSource || pinnedSource
  const document = parseContract(await readSource(source), source)
  const serializedDocument = canonicalJson(document)
  const passwordPolicy = document['x-ryframe-password-policy']
  const noticePolicy = document['x-ryframe-notice-policy']
  const apiPrefix = document['x-ryframe-api-prefix']
  const sourceMetadata = {
    ...metadata,
    openapi_version: document.openapi,
    sha256: sha256(serializedDocument),
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await mkdir(path.dirname(passwordPolicyPath), { recursive: true })
  await mkdir(path.dirname(noticePolicyPath), { recursive: true })
  await mkdir(path.dirname(apiPrefixPath), { recursive: true })
  await writeFile(outputPath, serializedDocument, 'utf8')
  await writeFile(passwordPolicyPath, canonicalJson(passwordPolicy), 'utf8')
  await writeFile(noticePolicyPath, canonicalJson(noticePolicy), 'utf8')
  await writeFile(apiPrefixPath, canonicalJson(apiPrefix), 'utf8')
  await writeFile(metadataPath, canonicalJson(sourceMetadata), 'utf8')
  console.log(
    `Synced RyFrame OpenAPI contract from ${sourceMetadata.backend_repository}`
    + `@${sourceMetadata.backend_commit}`,
  )
}

async function verifyUpstream() {
  const metadata = await readMetadata()
  const local = await verifyLocal(metadata)
  const upstream = parseContract(await readSource(sourceUrl(metadata)), sourceUrl(metadata))
  const upstreamBytes = Buffer.from(canonicalJson(upstream), 'utf8')

  if (!upstreamBytes.equals(local.bytes)) {
    throw new Error('pinned upstream OpenAPI contract does not match openapi/openapi.json; run pnpm api:sync')
  }
  console.log(`Pinned upstream OpenAPI contract matches ${metadata.backend_repository}@${metadata.backend_commit}`)
}

if (mode === 'sync') await sync()
else if (mode === '--verify-local') {
  const metadata = await readMetadata()
  await verifyLocal(metadata)
  console.log(`Local OpenAPI contract matches ${metadata.backend_repository}@${metadata.backend_commit}`)
}
else await verifyUpstream()
