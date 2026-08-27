import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import {
  canonicalJson,
  sha256,
  verifyLocalContractState,
  writeFormalContract,
} from '../api-contract-state.mjs'
import { parseArguments, validateConsumerState } from '../check-consumer-contract.mjs'

const commit = '0123456789abcdef0123456789abcdef01234567'
const execFileAsync = promisify(execFile)
const syncScript = path.resolve('scripts/sync-api-contract.mjs')

function contract(description = '正式契约') {
  return {
    openapi: '3.1.0',
    info: { title: 'RyFrame API', description },
    paths: {},
    'x-ryframe-api-prefix': { value: '/api/v1', version: 1 },
    'x-ryframe-notice-policy': {
      version: 1,
      content_markdown: { min_utf8_bytes: 1, max_utf8_bytes: 4096 },
    },
    'x-ryframe-password-policy': {
      version: 1,
      min_length: 8,
      max_length: 64,
      pattern: '^.+$',
      allowed_characters: 'ascii_graphic',
      required_classes: ['lowercase'],
    },
    'x-ryframe-permission-catalog': {
      version: 1,
      codes: ['system:post:list'],
    },
  }
}

function sourceMetadata(openapiBytes, backendCommit = commit) {
  return {
    schema_version: 1,
    backend_repository: 'Edgar-ycy/ryframe',
    backend_commit: backendCommit,
    openapi_path: 'openapi/openapi.json',
    openapi_version: '3.1.0',
    sha256: sha256(openapiBytes),
  }
}

function candidateMarker(candidateBytes, sourceBytes) {
  return {
    candidate_sha256: sha256(candidateBytes),
    formal_source_sha256: sha256(sourceBytes),
    mode: 'candidate',
    openapi_version: '3.1.0',
    schema_version: 1,
  }
}

async function createFormalRoot() {
  const root = await mkdtemp(path.join(tmpdir(), 'ryframe-contract-state-'))
  await mkdir(path.join(root, 'openapi'), { recursive: true })
  const bytes = Buffer.from(canonicalJson(contract()), 'utf8')
  await writeFile(path.join(root, 'openapi', 'openapi.json'), bytes)
  await writeFile(path.join(root, 'openapi', 'source.json'), canonicalJson(sourceMetadata(bytes)))
  return root
}

async function createBackendRepository(openapiBytes) {
  const root = await mkdtemp(path.join(tmpdir(), 'ryframe-contract-backend-'))
  await mkdir(path.join(root, 'openapi'), { recursive: true })
  await writeFile(path.join(root, 'openapi', 'openapi.json'), openapiBytes)
  await execFileAsync('git', ['init'], { cwd: root })
  await execFileAsync('git', ['add', '--', 'openapi/openapi.json'], { cwd: root })
  await execFileAsync(
    'git',
    [
      '-c',
      'user.name=RyFrame Contract Test',
      '-c',
      'user.email=contract-test@invalid.example',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-m',
      'test contract',
    ],
    { cwd: root },
  )
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  })
  return { root, commit: stdout.trim() }
}

async function enterCandidateState(root) {
  const sourceBytes = await readFile(path.join(root, 'openapi', 'source.json'))
  const candidateBytes = Buffer.from(canonicalJson(contract('候选契约')), 'utf8')
  await writeFile(path.join(root, 'openapi', 'openapi.json'), candidateBytes)
  await writeFile(
    path.join(root, 'openapi', 'candidate.json'),
    canonicalJson(candidateMarker(candidateBytes, sourceBytes)),
  )
  return candidateBytes
}

test('正式来源保持旧提交时，候选 sidecar 允许本地只读校验', async (t) => {
  const root = await createFormalRoot()
  t.after(() => rm(root, { recursive: true, force: true }))
  const candidateBytes = await enterCandidateState(root)

  const state = await verifyLocalContractState(root)
  assert.equal(state.mode, 'candidate')
  assert.equal(state.metadata.backend_commit, commit)
  assert.ok(state.bytes.equals(candidateBytes))
})

test('候选契约、marker 或正式来源任一篡改都会失败', async (t) => {
  const root = await createFormalRoot()
  t.after(() => rm(root, { recursive: true, force: true }))
  const candidateBytes = await enterCandidateState(root)
  const openapiPath = path.join(root, 'openapi', 'openapi.json')
  const sourcePath = path.join(root, 'openapi', 'source.json')
  const markerPath = path.join(root, 'openapi', 'candidate.json')
  const sourceBytes = await readFile(sourcePath)

  await writeFile(openapiPath, canonicalJson(contract('被篡改候选')))
  await assert.rejects(() => verifyLocalContractState(root), /候选摘要/u)
  await writeFile(openapiPath, candidateBytes)

  const marker = candidateMarker(candidateBytes, sourceBytes)
  marker.candidate_sha256 = '0'.repeat(64)
  await writeFile(markerPath, canonicalJson(marker))
  await assert.rejects(() => verifyLocalContractState(root), /候选摘要/u)
  await writeFile(markerPath, canonicalJson(candidateMarker(candidateBytes, sourceBytes)))

  await writeFile(sourcePath, Buffer.concat([sourceBytes, Buffer.from('\n')]))
  await assert.rejects(() => verifyLocalContractState(root), /source\.json 已被修改/u)
})

test('正式同步恢复契约并最后删除候选 marker', async (t) => {
  const frontend = await createFormalRoot()
  t.after(() => rm(frontend, { recursive: true, force: true }))
  await enterCandidateState(frontend)
  const formalDocument = contract('来自提交的正式契约')
  const formalBytes = Buffer.from(canonicalJson(formalDocument), 'utf8')
  await writeFormalContract(frontend, formalDocument, {
    schema_version: 1,
    backend_repository: 'Edgar-ycy/ryframe',
    backend_commit: commit,
    openapi_path: 'openapi/openapi.json',
  })

  const state = await verifyLocalContractState(frontend)
  assert.equal(state.mode, 'formal')
  assert.equal(state.metadata.backend_commit, commit)
  assert.ok(state.bytes.equals(formalBytes))
  await assert.rejects(
    () => readFile(path.join(frontend, 'openapi', 'candidate.json')),
    (error) => error.code === 'ENOENT',
  )
})

test('上游校验优先读取已配置后端工作树中的未推送提交', async (t) => {
  const bytes = Buffer.from(canonicalJson(contract()), 'utf8')
  const backend = await createBackendRepository(bytes)
  const frontend = await createFormalRoot()
  t.after(() => rm(backend.root, { recursive: true, force: true }))
  t.after(() => rm(frontend, { recursive: true, force: true }))
  await writeFile(
    path.join(frontend, 'openapi', 'source.json'),
    canonicalJson(sourceMetadata(bytes, backend.commit)),
  )

  const { stdout } = await execFileAsync(process.execPath, [syncScript, '--verify-upstream'], {
    cwd: frontend,
    encoding: 'utf8',
    env: { ...process.env, RYFRAME_BACKEND_WORKTREE: backend.root },
  })

  assert.match(stdout, new RegExp(`@${backend.commit} 一致`, 'u'))
})

test('consumer:check 显式区分 candidate 和 formal，并仅在正式态要求提交 pin', async (t) => {
  const root = await createFormalRoot()
  t.after(() => rm(root, { recursive: true, force: true }))
  const candidateBytes = await enterCandidateState(root)
  const candidateState = await verifyLocalContractState(root)
  const options = parseArguments([
    '--mode',
    'candidate',
    '--openapi',
    path.join(root, 'openapi', 'openapi.json'),
    '--backend-commit',
    'f'.repeat(40),
    '--backend-repository',
    'Edgar-ycy/ryframe',
    '--require-pin',
    'true',
  ])
  assert.doesNotThrow(() => validateConsumerState(options, candidateState, candidateBytes))

  await unlink(path.join(root, 'openapi', 'candidate.json'))
  await writeFile(
    path.join(root, 'openapi', 'source.json'),
    canonicalJson(sourceMetadata(candidateBytes)),
  )
  const formalState = await verifyLocalContractState(root)
  const formalOptions = { ...options, mode: 'formal' }
  assert.throws(
    () => validateConsumerState(formalOptions, formalState, candidateBytes),
    /精确固定/u,
  )
  assert.doesNotThrow(() =>
    validateConsumerState({ ...formalOptions, requirePin: false }, formalState, candidateBytes),
  )
})
