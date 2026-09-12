import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import {
  parseRequiredJobsRequest,
  runWorkflowCli,
  validateEnvironmentContexts,
  validateRequiredJobs,
} from '../check-workflows.mjs'

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

function requestFor(event = 'push', transform = (value) => value) {
  const needs = Object.fromEntries(
    Object.entries(resultsFor(event)).map(([name, result]) => [name, { outputs: {}, result }]),
  )
  return JSON.stringify(transform({ event, needs, operation: 'required-jobs', version: 1 }))
}

test('接受每种工作流事件的精确矩阵', () => {
  for (const event of ['push', 'pull_request']) {
    assert.deepEqual(validateRequiredJobs(event, resultsFor(event)), [])
  }
})

test('拒绝必跑 job 的跳过、失败、取消、缺失和未知结果', () => {
  for (const result of ['skipped', 'failure', 'cancelled']) {
    const jobs = resultsFor('pull_request')
    jobs.static = result
    assert.notDeepEqual(validateRequiredJobs('pull_request', jobs), [])
  }
  const missing = resultsFor('push')
  delete missing.browser
  assert.notDeepEqual(validateRequiredJobs('push', missing), [])
  const unknown = { ...resultsFor('push'), unknown: 'success' }
  assert.notDeepEqual(validateRequiredJobs('push', unknown), [])
})

test('工作流通过受测脚本执行汇总', async () => {
  const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  const required = workflow.slice(workflow.indexOf('\n  required:'))
  assert.match(required, /corepack pnpm check --stage tools/u)
  assert.match(required, /RYFRAME_FRONTEND_TOOLS_REQUEST/u)
  assert.match(required, /toJSON\(github\.event_name\)/u)
  assert.match(required, /toJSON\(needs\)/u)
  assert.doesNotMatch(required, /check-workflows\.mjs required/u)
  for (const name of Object.keys(resultsFor('push'))) {
    assert.doesNotMatch(required, new RegExp(`--job [^\\n]*${name}`, 'u'))
  }
  const setup = required.indexOf('uses: ./.github/actions/setup-pnpm')
  const install = required.indexOf('run: corepack pnpm install --frozen-lockfile')
  const check = required.indexOf('run: corepack pnpm check --stage tools')
  assert.ok(setup >= 0 && setup < install && install < check)
  assert.doesNotMatch(required, /verify-deps-before-run|VERIFY_DEPS_BEFORE_RUN/u)
})

test('Required 环境协议只提取 event 与 needs 结果', () => {
  const push = parseRequiredJobsRequest(requestFor())
  assert.deepEqual(push, {
    event: 'push',
    results: resultsFor('push'),
  })
  assert.equal(Object.isFrozen(push), true)
  assert.equal(Object.isFrozen(push.results), true)
  assert.deepEqual(parseRequiredJobsRequest(requestFor('pull_request')), {
    event: 'pull_request',
    results: resultsFor('pull_request'),
  })
})

test('Required 环境协议拒绝未知、缺失和畸形字段', () => {
  const invalid = [
    '',
    '{broken',
    '[]',
    requestFor('push', (value) => ({ ...value, version: 2 })),
    requestFor('push', (value) => ({ ...value, operation: 'other' })),
    requestFor('push', (value) => ({ ...value, unknown: true })),
    requestFor('push', (value) => {
      delete value.event
      return value
    }),
    requestFor('push', (value) => ({ ...value, needs: [] })),
    requestFor('push', (value) => {
      value.needs.static = { result: 'success', unknown: true }
      return value
    }),
    requestFor('push', (value) => {
      value.needs.static = { outputs: [], result: 'success' }
      return value
    }),
    requestFor('push', (value) => {
      value.needs.static = { result: 'success\nfailed' }
      return value
    }),
  ]
  for (const raw of invalid) assert.throws(() => parseRequiredJobsRequest(raw), Error)
})

test('工作流脚本不再暴露 Required 参数入口', async () => {
  await assert.rejects(
    runWorkflowCli(['required'], path.join(root, '不存在的仓库')),
    /未知参数：required/u,
  )
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
  const workspace = await readFile(path.join(root, 'pnpm-workspace.yaml'), 'utf8')
  const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  const action = await readFile(path.join(root, '.github/actions/setup-pnpm/action.yml'), 'utf8')

  for (const [name, command] of Object.entries(packageJson.scripts)) {
    assert.doesNotMatch(command, /(^|[;&|]\s*)pnpm\s/u, `${name} 绕过了 Corepack`)
  }
  assert.doesNotMatch(workflow, /^\s*run:\s*pnpm\s/mu)
  assert.match(action, /corepack prepare "pnpm@\$\{pnpm_version\}" --activate/u)
  assert.doesNotMatch(action, /npm install --global/u)
  assert.match(workspace, /^verifyDepsBeforeRun: error$/mu)
})

test('可执行错误提示也通过 Corepack 给出 pnpm 命令', async () => {
  const prompts = [
    ['scripts/generate-api-artifacts.mjs', 'corepack pnpm generate --write'],
    ['scripts/check-supply-chain-policy.mjs', 'corepack pnpm check --stage tools'],
    ['scripts/generate-sbom.mjs', 'corepack pnpm generate --sbom --output <文件>'],
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
