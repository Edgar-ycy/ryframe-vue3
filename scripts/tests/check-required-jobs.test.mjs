import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { validateRequiredJobs } from '../check-required-jobs.mjs'
import { validateEnvironmentContexts } from '../check-workflows.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function resultsFor(event) {
  const common = {
    static: 'skipped',
    unit: 'skipped',
    build: 'skipped',
    browser: 'skipped',
    'windows-smoke': 'skipped',
  }
  if (event === 'push' || event === 'pull_request') {
    common.static = 'success'
    common.unit = 'success'
    common.build = 'success'
    common.browser = 'success'
    common['windows-smoke'] = 'success'
  }
  return common
}

test('接受每种工作流事件的精确矩阵', () => {
  for (const event of ['push', 'pull_request']) {
    assert.deepEqual(validateRequiredJobs(event, resultsFor(event)), [])
  }
})

test('拒绝把必跑 job 当作 skipped 或 failure', () => {
  const pullRequest = resultsFor('pull_request')
  pullRequest.static = 'skipped'
  assert.notDeepEqual(validateRequiredJobs('pull_request', pullRequest), [])

  const push = resultsFor('push')
  push.browser = 'failure'
  assert.notDeepEqual(validateRequiredJobs('push', push), [])
})

test('工作流通过受测脚本执行汇总', async () => {
  const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  assert.match(workflow, /node scripts\/check-required-jobs\.mjs/u)
})

test('低频兼容与供应链检查只进入扩展 CI', async () => {
  const daily = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  const extended = await readFile(path.join(root, '.github/workflows/extended-ci.yml'), 'utf8')
  for (const job of ['node-22-compatibility:', 'supply-chain:', 'osv-scan:']) {
    assert.doesNotMatch(daily, new RegExp(`\\n {2}${job}`, 'u'))
  }
  assert.match(extended, /\n {2}compatibility-supply-chain:/u)
  assert.match(extended, /\n {2}osv-scan:/u)
  assert.match(extended, /schedule:/u)
  assert.match(extended, /workflow_dispatch:/u)
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

test('工作流检查器在 step 之前拒绝运行期上下文', async () => {
  const invalid = validateEnvironmentContexts('ci.yml', {
    jobs: { integration: { env: { ARTIFACT_DIR: '${{ runner.temp }}/integration' } } },
  })
  const valid = validateEnvironmentContexts('ci.yml', {
    jobs: {
      integration: {
        steps: [{ env: { ARTIFACT_DIR: '${{ runner.temp }}/integration' } }],
      },
    },
  })
  assert.ok(invalid.some((error) => error.includes('cannot reference runner')))
  assert.deepEqual(valid, [])
})
