import assert from 'node:assert/strict'
import test from 'node:test'
import {
  checkTaskEnvironment,
  checkTasks,
  parseArguments,
  verifyConsumerDocument,
} from '../check.mjs'

test('每次 smoke 使用新证据代次，不复用父进程遗留的运行编号', () => {
  const inherited = { RYFRAME_E2E_SMOKE_ATTEMPT: 'previous-attempt', PATH: 'host-tools' }
  const first = checkTaskEnvironment(checkTasks('browser')[0], inherited)
  const second = checkTaskEnvironment(checkTasks('browser')[0], inherited)
  assert.match(first.RYFRAME_E2E_SMOKE_ATTEMPT, /^[a-f0-9-]{36}$/u)
  assert.notEqual(first.RYFRAME_E2E_SMOKE_ATTEMPT, second.RYFRAME_E2E_SMOKE_ATTEMPT)
  assert.equal(first.PATH, 'host-tools')
  assert.equal(inherited.RYFRAME_E2E_SMOKE_ATTEMPT, 'previous-attempt')
})

test('真实浏览器的资源绑定与运行编号保持原任务配置', () => {
  const inherited = { RYFRAME_E2E_RUN_ID: 'formal-run', APP_SCOPE_ID: 'owned-scope' }
  const task = checkTasks('browser', { real: true, fixture: 'business', server: 'preview' })[0]
  assert.deepEqual(checkTaskEnvironment(task, inherited), {
    ...inherited,
    RYFRAME_E2E_FIXTURE: 'business',
    RYFRAME_E2E_SERVER: 'preview',
  })
})

test('正式和候选消费者均比较已验证的契约正文，候选标记不能替代正文', () => {
  const bytes = Buffer.from('{"openapi":"3.1.0"}')
  for (const mode of ['formal', 'candidate']) {
    const state = { mode, bytes, marker: { candidate_sha256: '摘要' } }
    assert.doesNotThrow(() => verifyConsumerDocument(state, Buffer.from(bytes)))
    assert.throws(
      () => verifyConsumerDocument(state, Buffer.from(JSON.stringify(state.marker))),
      /前端 OpenAPI 与后端本次快照不一致/,
    )
  }
})

test('默认检查与完整消费者检查入口都可用', () => {
  assert.deepEqual(parseArguments([]), { full: false, stage: 'contract', plan: false })
  assert.deepEqual(parseArguments(['--full']), { full: true, stage: 'full', plan: false })
  assert.deepEqual(parseArguments(['--stage', 'contract']), {
    full: false,
    stage: 'contract',
    plan: false,
  })
})

test('完整检查不能与显式阶段混用，并拒绝缺失或未知参数', () => {
  for (const args of [
    ['--full', '--stage', 'contract'],
    ['--stage', 'contract', '--full'],
  ]) {
    assert.throws(() => parseArguments(args), /--full 不能与 --stage 同时使用/)
  }
  assert.throws(() => parseArguments(['--stage']), /--stage 缺少值/)
  assert.throws(() => parseArguments(['--unknown']), /未知参数/)
  assert.throws(() => parseArguments(['--stage', 'missing']), /未知检查阶段/)
})

test('计划与执行共用任务图，完整门禁包含静态、类型、覆盖率和构建', () => {
  assert.deepEqual(parseArguments(['--full', '--plan']), { full: true, stage: 'full', plan: true })
  assert.deepEqual(checkTasks('full'), ['contract', 'static', 'unit', 'build'].flatMap(checkTasks))
  assert.equal(
    checkTasks('full').some((task) => task.name === 'browser-smoke'),
    false,
  )
  assert.equal(checkTasks('browser')[0].name, 'browser-smoke')
  assert.throws(() => checkTasks('missing'), /未知检查阶段/)
})

test('真实业务浏览器计划与执行共用明确的配置与运行绑定', () => {
  const options = parseArguments([
    '--stage',
    'browser',
    '--real',
    '--fixture',
    'business',
    '--server',
    'preview',
    '--plan',
  ])
  assert.equal(options.plan, true)
  assert.deepEqual(checkTasks(options.stage, options), [
    {
      name: 'browser-real',
      args: ['exec', 'playwright', 'test', '--config', 'playwright.real.config.ts'],
      environment: { RYFRAME_E2E_FIXTURE: 'business', RYFRAME_E2E_SERVER: 'preview' },
    },
  ])
  for (const args of [
    ['--real'],
    ['--full', '--real'],
    ['--stage', 'browser', '--fixture', 'business'],
    ['--stage', 'browser', '--real', '--fixture', 'device'],
  ])
    assert.throws(() => parseArguments(args))
})
