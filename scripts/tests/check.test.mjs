import assert from 'node:assert/strict'
import test from 'node:test'
import {
  checkTaskEnvironment,
  checkTasks,
  parseArguments,
  verifyConsumerDocument,
} from '../check.mjs'

test('浏览器任务通过 CLI 控制，子进程只继承应用选择与第三方环境', () => {
  const inherited = {
    RYFRAME_E2E_RUN_ID: 'old',
    APP_SCOPE_ID: 'old',
    PLAYWRIGHT_CHANNEL: 'old',
    APP_ENV: 'test',
    PATH: 'host-tools',
  }
  for (const task of [
    checkTasks('browser')[0],
    checkTasks('browser', { real: true, fixture: 'business', server: 'preview' })[0],
  ]) {
    assert.deepEqual(checkTaskEnvironment(task, inherited), { APP_ENV: 'test', PATH: 'host-tools' })
    assert.equal(task.node[0], 'scripts/run-browser.mjs')
  }
  assert.equal(inherited.RYFRAME_E2E_RUN_ID, 'old')
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

test('生成页面计划选择受管真实 core 入口并拒绝混入其他阶段或业务套件', () => {
  const options = parseArguments(['--stage', 'browser', '--real', '--generated', '--plan'])
  assert.equal(options.fixture, 'core')
  assert.equal(options.generated, true)
  assert.deepEqual(checkTasks(options.stage, options)[0].node, [
    'scripts/run-browser.mjs',
    '--generated',
    '--real',
    '--fixture',
    'core',
    '--server',
    'dev',
  ])
  const selected = parseArguments([
    '--stage',
    'browser',
    '--real',
    '--generated',
    '--spec',
    'generated-catalog-page.spec.ts',
  ])
  assert.deepEqual(checkTasks('browser', selected)[0].node, [
    ...checkTasks(options.stage, options)[0].node,
    '--spec',
    'generated-catalog-page.spec.ts',
  ])
  for (const spec of [
    '',
    '../catalog.spec.ts',
    'sub/catalog.spec.ts',
    'sub\\catalog.spec.ts',
    'catalog.ts',
    '..',
    'Catalog.spec.ts',
  ]) {
    assert.throws(
      () => parseArguments(['--stage', 'browser', '--real', '--generated', '--spec', spec]),
      /spec/u,
    )
    assert.throws(() => checkTasks('browser', { ...options, spec }), /spec/u)
  }
  for (const [invalid, reason] of [
    [{}, /spec/u],
    [{ ...options, generated: false }, /spec/u],
    [{ ...options, fixture: 'business' }, /generated/u],
  ])
    assert.throws(() => checkTasks('browser', { ...invalid, spec: selected.spec }), reason)
  assert.throws(() => checkTasks('unit', selected), /generated|spec/u)
  for (const args of [
    ['--spec', 'catalog.spec.ts'],
    ['--stage', 'browser', '--real', '--spec', 'catalog.spec.ts'],
    ['--stage', 'browser', '--real', '--generated', '--spec'],
    ['--stage', 'browser', '--real', '--generated', '--spec', '--plan'],
    [
      '--stage',
      'browser',
      '--real',
      '--generated',
      '--spec',
      'catalog.spec.ts',
      '--spec',
      'catalog.spec.ts',
    ],
    ['--generated'],
    ['--stage', 'browser', '--generated'],
    ['--stage', 'browser', '--real', '--generated', '--fixture', 'business'],
    ['--stage', 'browser', '--real', '--generated', '--generated'],
    ['--full', '--real', '--generated'],
  ])
    assert.throws(() => parseArguments(args))
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
      node: ['scripts/run-browser.mjs', '--real', '--fixture', 'business', '--server', 'preview'],
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

test('消费 ctx 仅 contract/full 接受，要求单个非空文件参数', () => {
  for (const args of [[], ['--stage', 'contract'], ['--full']]) {
    const options = parseArguments([...args, '--consumer-context', 'context.json'])
    assert.equal(options.consumerContext, 'context.json')
    assert.ok(['contract', 'full'].includes(options.stage))
  }
  for (const args of [
    ['--consumer-context'],
    ['--consumer-context', '--plan'],
    ['--consumer-context', ''],
    ['--consumer-context', 'a', '--consumer-context', 'b'],
    ...['static', 'unit', 'build', 'browser'].map((stage) => [
      '--stage',
      stage,
      '--consumer-context',
      'context.json',
    ]),
  ])
    assert.throws(() => parseArguments(args), /consumer-context/u)
})

test('显式 ctx 追加一次 contract 证明，完整门禁保持原任务和 unit glob', () => {
  const options = { consumerContext: 'unread-context.json' }
  const proof = {
    name: 'consumer-proof',
    dependsOn: ['contract'],
    node: [
      'scripts/contract-tests/frontend-native-receipt.mjs',
      '--consumer-context',
      'unread-context.json',
    ],
  }
  assert.deepEqual(checkTasks('contract', options), [{ name: 'contract' }, proof])
  assert.deepEqual(checkTasks('full', options), [
    { name: 'contract' },
    proof,
    ...checkTasks('full').slice(1),
  ])
  for (const stage of ['unit', 'contract', 'full']) {
    assert.ok(!checkTasks(stage).some((task) => task.name === 'consumer-proof'))
  }
  assert.deepEqual(checkTasks('unit')[0].node, ['--test', 'scripts/tests/*.test.mjs'])
  assert.throws(() => checkTasks('unit', options), /consumer-context/u)
})
