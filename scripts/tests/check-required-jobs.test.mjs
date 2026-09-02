import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { validateRequiredJobs } from '../check-required-jobs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function resultsFor(event) {
  const common = {
    static: 'skipped',
    unit: 'skipped',
    build: 'skipped',
    browser: 'skipped',
    'node-22-compatibility': 'skipped',
    'supply-chain': 'skipped',
    'osv-scan': 'skipped',
    'windows-smoke': 'skipped',
  }
  if (event === 'push' || event === 'pull_request') {
    common.static = 'success'
    common.unit = 'success'
    common.build = 'success'
    common.browser = 'success'
    common['windows-smoke'] = 'success'
  } else if (event === 'schedule') {
    common['node-22-compatibility'] = 'success'
    common['supply-chain'] = 'success'
    common['osv-scan'] = 'success'
  } else if (event === 'workflow_dispatch') {
    common.static = 'success'
    common.unit = 'success'
    common.build = 'success'
    common.browser = 'success'
    common['supply-chain'] = 'success'
    common['osv-scan'] = 'success'
    common['windows-smoke'] = 'success'
  }
  return common
}

test('接受每种工作流事件的精确矩阵', () => {
  for (const event of ['push', 'pull_request', 'schedule', 'workflow_dispatch']) {
    assert.deepEqual(validateRequiredJobs(event, resultsFor(event)), [])
  }
})

test('拒绝把必跑 job 当作 skipped 或 failure', () => {
  const pullRequest = resultsFor('pull_request')
  pullRequest.static = 'skipped'
  assert.notDeepEqual(validateRequiredJobs('pull_request', pullRequest), [])

  const schedule = resultsFor('schedule')
  schedule['osv-scan'] = 'failure'
  assert.notDeepEqual(validateRequiredJobs('schedule', schedule), [])
})

test('工作流通过受测脚本执行汇总', async () => {
  const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  assert.match(workflow, /node scripts\/check-required-jobs\.mjs/u)
})

test('pnpm 缓存指纹覆盖完整工作区定义', async () => {
  const action = await readFile(path.join(root, '.github/actions/setup-pnpm/action.yml'), 'utf8')
  for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    assert.ok(action.includes(`'${file}'`), `缓存指纹缺少 ${file}`)
  }
})

test('开发脚本与 CI 只通过 Corepack 调用固定 pnpm', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  const action = await readFile(path.join(root, '.github/actions/setup-pnpm/action.yml'), 'utf8')

  for (const [name, command] of Object.entries(packageJson.scripts)) {
    assert.doesNotMatch(command, /(^|[;&|]\s*)pnpm\s/u, `${name} 绕过了 Corepack`)
  }
  assert.doesNotMatch(workflow, /^\s*run:\s*pnpm\s/mu)
  assert.match(action, /corepack prepare "pnpm@\$\{pnpm_version\}" --activate/u)
  assert.doesNotMatch(action, /npm install --global/u)
})

test('可执行错误提示也通过 Corepack 给出 pnpm 命令', async () => {
  const prompts = [
    ['scripts/generate-api-artifacts.mjs', 'corepack pnpm api:generate'],
    ['scripts/check-supply-chain-policy.mjs', 'corepack pnpm check:supply-chain-policy'],
    ['scripts/generate-sbom.mjs', 'corepack pnpm sbom:generate'],
  ]

  for (const [file, command] of prompts) {
    const source = await readFile(path.join(root, file), 'utf8')
    assert.ok(source.includes(command), `${file} 未给出 Corepack 命令`)
    assert.doesNotMatch(source, /请(?:运行|通过) pnpm\s/u, `${file} 仍提示裸 pnpm 命令`)
  }
})
