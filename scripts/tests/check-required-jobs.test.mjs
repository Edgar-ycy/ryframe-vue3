import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { validateRequiredJobs } from '../check-required-jobs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function resultsFor(event) {
  const common = {
    check: 'skipped',
    'node-22-compatibility': 'skipped',
    'supply-chain': 'skipped',
    'osv-scan': 'skipped',
    'windows-smoke': 'skipped',
  }
  if (event === 'push' || event === 'pull_request') {
    common.check = 'success'
    common['windows-smoke'] = 'success'
  } else if (event === 'schedule') {
    common['node-22-compatibility'] = 'success'
    common['supply-chain'] = 'success'
    common['osv-scan'] = 'success'
  } else if (event === 'workflow_dispatch') {
    common.check = 'success'
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
  pullRequest.check = 'skipped'
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
