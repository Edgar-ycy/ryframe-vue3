import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  combineTaskPlans,
  consumerContext,
  createConsumerContractPlan,
  createTaskPlan,
  parseTaskArguments,
  parseConsumerArguments,
  TaskUsageError,
  taskRunnerHelp,
} from '../task-runner-contract.mjs'
import { taskSpecs } from '../task-specs.mjs'

const tasks = (plan) => plan.groups.flat()
const plan = (args, source) => createTaskPlan(parseTaskArguments(args), source ? { source } : {})
const ids = (value) => tasks(value).map((task) => task.id)

test('package.json 只公开四个稳定入口', async () => {
  const value = JSON.parse(await readFile(new URL('../../package.json', import.meta.url)))
  assert.deepEqual(value.scripts, {
    dev: 'node scripts/task-runner.mjs dev',
    check: 'node scripts/task-runner.mjs check',
    build: 'node scripts/task-runner.mjs build',
    generate: 'node scripts/task-runner.mjs generate',
  })
})

test('默认快速检查保持完整单测并只执行一次', () => {
  const value = plan(['check'])
  assert.deepEqual(ids(value), [
    'format',
    'source-size',
    'imports',
    'api-artifacts',
    'eslint',
    'stylelint',
    'typecheck',
    'unit',
  ])
  assert.deepEqual(tasks(value).find((task) => task.id === 'unit').params, {
    coverage: false,
    test: null,
  })
  assert.equal(tasks(value).find((task) => task.id === 'typecheck').params.scope, 'app')
})

test('完整检查使用一次 coverage 单测并顺序复用生产构建', () => {
  const value = plan(['check', '--full', '--upstream'])
  for (const id of [
    'unit',
    'typecheck',
    'build',
    'bundle',
    'api-source',
    'api-contract',
    'api-artifacts',
    'imports',
    'api-upstream',
    'policy-tests',
    'supply-chain',
  ])
    assert.equal(ids(value).filter((item) => item === id).length, 1, id)
  assert.equal(ids(value).includes('browser'), false)
  assert.deepEqual(tasks(value).find((task) => task.id === 'unit').params, {
    coverage: true,
    test: null,
  })
  assert.equal(tasks(value).find((task) => task.id === 'typecheck').params.scope, 'all')
  assert.deepEqual(
    value.groups.at(-2).map((task) => task.id),
    ['build'],
  )
  assert.deepEqual(
    value.groups.at(-1).map((task) => task.id),
    ['bundle'],
  )
  assert.deepEqual(value.groups.at(-1)[0].dependencies, [value.groups.at(-2)[0].key])
})

test('消费契约门禁执行完整领域 coverage 且不重复单测', () => {
  assert.deepEqual(
    ids(createConsumerContractPlan({ profile: 'full' })),
    ids(plan(['check', '--full'])),
  )
  const value = createConsumerContractPlan()
  assert.deepEqual(
    new Set(ids(value)),
    new Set(['api-source', 'api-contract', 'api-artifacts', 'imports', 'typecheck', 'unit']),
  )
  assert.equal(tasks(value).find((task) => task.id === 'unit').params.coverage, true)
  assert.throws(() => createConsumerContractPlan({ profile: 'unknown' }), TaskUsageError)
})

test('内部消费上下文只用于显式完整或契约检查，不创建第二个入口', () => {
  const args = [
    '--mode',
    'formal',
    '--openapi',
    'openapi/openapi.json',
    '--backend-commit',
    'a'.repeat(40),
    '--backend-repository',
    'owner/repo',
    '--require-pin',
    'true',
  ]
  const options = parseTaskArguments(['check', '--stage', 'contract'])
  const consumer = consumerContext(options, JSON.stringify(args))
  assert.deepEqual(consumer, parseConsumerArguments(args))
  const value = createTaskPlan({ ...options, consumer, consumerCheck: true })
  assert.equal(tasks(value).find((task) => task.id === 'unit').params.coverage, true)
  assert.deepEqual(tasks(value).find((task) => task.id === 'api-source').params.consumer, consumer)
  assert.equal(consumerContext(options, undefined), undefined)
  assert.throws(
    () => consumerContext(parseTaskArguments(['check']), JSON.stringify(args)),
    TaskUsageError,
  )
  assert.throws(() => consumerContext(options, '{broken'), TaskUsageError)
  assert.throws(() => consumerContext(options, '{}'), TaskUsageError)
  assert.throws(() => parseConsumerArguments([...args, '--mode', 'candidate']), TaskUsageError)
})

test('同来源的完整检查覆盖快速变体，不同来源和不同浏览器模式不会被归并', () => {
  const merged = combineTaskPlans([
    plan(['check'], 'same-source'),
    plan(['check', '--full'], 'same-source'),
    plan(['check', '--stage', 'contract'], 'same-source'),
  ])
  assert.deepEqual(new Set(ids(merged)), new Set(ids(plan(['check', '--full']))))
  assert.equal(ids(merged).length, ids(plan(['check', '--full'])).length)
  const separate = combineTaskPlans([
    plan(['check', '--stage', 'unit'], 'source-a'),
    plan(['check', '--stage', 'unit'], 'source-b'),
  ])
  assert.equal(ids(separate).filter((id) => id === 'unit').length, 2)
  assert.equal(
    tasks(
      combineTaskPlans([
        plan(['check', '--stage', 'browser', '--server', 'dev'], 'same-source'),
        plan(['check', '--stage', 'browser', '--server', 'preview'], 'same-source'),
      ]),
    ).length,
    2,
  )
  assert.equal(
    tasks(
      combineTaskPlans([plan(['check', '--stage', 'unit']), plan(['check', '--stage', 'unit'])]),
    ).length,
    2,
  )
})

test('check 参数覆盖阶段、修复、定向路径和只读计划', () => {
  const value = plan(['check', '--stage', 'static', '--fix', '--plan'])
  assert.deepEqual(
    value.groups.slice(0, 3).map((group) => group.map((task) => task.id)),
    [['format'], ['eslint'], ['stylelint']],
  )
  for (const group of value.groups.slice(0, 3)) assert.equal(group[0].effect, 'write')
  for (const task of value.groups.at(-1)) assert.notEqual(task.effect, 'write')
  assert.deepEqual(value.groups[1][0].dependencies, [value.groups[0][0].key])
})

test('定向测试及 browser 参数完整传递，Device 仍由同一任务定义执行', () => {
  const path = 'D:\\含 空格\\settings.test.ts'
  const task = tasks(plan(['check', '--test', path]))[0]
  assert.deepEqual(task.params, { coverage: false, test: path })
  assert.equal(taskSpecs.unit.invoke(task).args.at(-1), path)
  const policyPath = 'scripts/tests/crud-resource-contract.test.mjs'
  const policyTask = tasks(plan(['check', '--test', policyPath]))[0]
  assert.deepEqual(taskSpecs.unit.invoke(policyTask), { kind: 'node-test', file: policyPath })
  assert.deepEqual(policyTask.compilationCoverage, [`node-test:${policyPath}`])
  const browser = tasks(
    plan(['check', '--stage', 'browser', '--real', '--fixture', 'device', '--server', 'preview']),
  )[0]
  assert.deepEqual(browser.params, { real: true, fixture: 'device', server: 'preview' })
  assert.deepEqual(browser.env, { RYFRAME_E2E_FIXTURE: 'device', RYFRAME_E2E_SERVER: 'preview' })
  assert.deepEqual(browser.invocation, taskSpecs.browser.invoke(browser))
  assert.deepEqual(browser.invocation.args, ['test', '--config', 'playwright.real.config.ts'])
  const defaults = tasks(plan(['check', '--stage', 'browser']))[0]
  assert.deepEqual(defaults.params, { real: false, fixture: 'core', server: 'dev' })
  assert.deepEqual(defaults.env, { RYFRAME_E2E_FIXTURE: 'core', RYFRAME_E2E_SERVER: 'dev' })
})

test('任务节点从实际调用事实源携带执行和资源元数据', () => {
  const value = plan(['check', '--full', '--upstream'])
  for (const task of tasks(value)) {
    assert.deepEqual(task.invocation, taskSpecs[task.id].invoke(task))
    assert.equal(task.workingDirectory, '.')
    for (const field of [
      'compilationCoverage',
      'allowedWrites',
      'externalResources',
      'concurrencyResources',
    ])
      assert.ok(Array.isArray(task[field]), `${task.id}.${field}`)
  }
  assert.deepEqual(tasks(value).find((task) => task.id === 'build').compilationCoverage, [
    'vite:production',
  ])
  assert.deepEqual(tasks(value).find((task) => task.id === 'api-upstream').externalResources, [
    'network:registered-api-upstream',
  ])
})

test('真实浏览器配置消费 dev 和 preview 服务模式并隔离产物', async () => {
  const source = await readFile(new URL('../../playwright.real.config.ts', import.meta.url), 'utf8')
  const environment = await readFile(
    new URL('../real-browser-environment.mjs', import.meta.url),
    'utf8',
  )
  assert.match(source, /validateRealBrowserEnvironment\(\)/u)
  assert.ok(
    source.indexOf('validateRealBrowserEnvironment()') < source.indexOf('mkdirSync(directory'),
  )
  assert.match(source, /externalBaseUrl = environment\.baseURL/u)
  assert.match(environment, /RYFRAME_E2E_SERVER/u)
  assert.match(environment, /\['dev', 'preview'\]/u)
  assert.match(source, /run-real-browser-server\.mjs \$\{serverMode\} \$\{port\}/u)
  assert.match(source, /RYFRAME_E2E_GATE_ENDPOINT/u)
  assert.match(source, /artifactSuffix = `\$\{fixture\}\/\$\{serverMode\}/u)
  assert.match(source, /playwright-real\/report\/\$\{artifactSuffix\}/u)
  assert.match(source, /playwright-real\/results\/\$\{artifactSuffix\}/u)
  assert.match(
    source,
    /testDir: fixture === 'device' \? 'tests\/browser-device' : 'tests\/browser-real'/u,
  )
})

test('开发、构建和生成选项映射到唯一职责', () => {
  for (const args of [
    ['generate'],
    ['generate', '--sbom'],
    ['generate', '--sbom', '--output', 'file.json'],
  ])
    assert.equal(tasks(plan(args))[0].effect, 'read')
  for (const args of [
    ['generate', '--write'],
    ['generate', '--sbom', '--output', 'file.json', '--write'],
  ])
    assert.equal(tasks(plan(args))[0].effect, 'write')
  assert.deepEqual(taskSpecs['api-artifacts'].invoke(tasks(plan(['generate']))[0]).args, [
    '--check',
  ])
})

test('四个用户入口的计划复用实际任务定义', () => {
  const cases = [
    ['dev', '--preview', '--plan'],
    ['check', '--stage', 'static', '--plan'],
    ['build', '--real', '--plan'],
    ['generate', '--write', '--plan'],
  ]
  for (const args of cases) assert.equal(parseTaskArguments(args).plan, true)
  const plans = cases.map((args) => plan(args))
  for (const value of plans) {
    for (const task of tasks(value)) {
      assert.deepEqual(task.invocation, taskSpecs[task.id].invoke(task))
    }
  }

  const dev = tasks(plans[0])[0]
  assert.deepEqual(dev.params, { preview: true })
  assert.deepEqual(dev.invocation.args, ['preview'])

  const build = tasks(plans[2])[0]
  assert.deepEqual(build.params, { real: true })
  assert.deepEqual(build.env, { VITE_APP_API_ORIGIN: '' })

  const generate = tasks(plans[3])[0]
  assert.deepEqual(generate.params, { write: true })
  assert.equal(generate.effect, 'write')
  assert.deepEqual(generate.invocation.args, ['--write'])
})

test('开发预览、真实构建与工具阶段有明确参数和归属', () => {
  const dev = tasks(plan(['dev', '--preview']))[0]
  assert.deepEqual(taskSpecs.dev.invoke(dev).args, ['preview'])
  assert.deepEqual(tasks(plan(['build', '--real']))[0].env, { VITE_APP_API_ORIGIN: '' })
  assert.deepEqual(ids(plan(['check', '--stage', 'tools'])), ['policy-tests', 'supply-chain'])
})

test('拒绝互斥选项和未知阶段', () => {
  for (const args of [
    ['old-command'],
    ['--help', '--unknown'],
    ['check', '--full', '--stage', 'unit'],
    ['check', '--real'],
    ['check', '--stage', 'unit', '--fix'],
    ['check', '--stage', 'unknown'],
    ['check', '--stage', 'browser', '--fixture', 'device'],
    ['check', '--stage', 'browser', '--server', 'unknown'],
    ['check', '--fixture', 'core'],
    ['check', '--full', '--full'],
    ['dev', '--plan', '--plan'],
    ['build', '--real', '--real'],
    ['generate', '--plan', '--plan'],
    ['generate', '--sbom', '--write'],
    ['generate', '--output', 'file.json'],
    ['check', '--test'],
    ['check', '--help', '--full'],
  ])
    assert.throws(() => parseTaskArguments(args), TaskUsageError, args.join(' '))
})

test('主 Vitest 配置覆盖完整 settings 职责', async () => {
  const source = await readFile(new URL('../../vitest.config.ts', import.meta.url), 'utf8')
  assert.match(source, /coverage:/u)
  assert.match(source, /src\/stores\/settings\.ts/u)
  assert.match(source, /src\/stores\/settings\/\*\*\/\*\.ts/u)
  assert.match(source, /src\/app\/settings\/\*\*\/\*\.ts/u)
})

test('帮助只展示四类用户入口和五个检查阶段', () => {
  for (const command of ['dev', 'check', 'build', 'generate']) {
    assert.ok(taskRunnerHelp.includes('corepack pnpm ' + command))
    assert.match(
      taskRunnerHelp,
      new RegExp(`corepack pnpm ${command}[^\\n]*--plan`, 'u'),
      `${command} 帮助缺少 --plan`,
    )
  }
  for (const stage of ['static', 'unit', 'contract', 'browser', 'tools']) {
    assert.ok(taskRunnerHelp.includes(stage))
  }
  assert.match(taskRunnerHelp, /Device 浏览器流程必须显式使用 --real --fixture device/u)
})

test('统一 runner 直接使用项目依赖、无 shell 并支持隔离缓存', async () => {
  const source = await readFile(new URL('../task-runner.mjs', import.meta.url), 'utf8')
  const processSource = await readFile(new URL('../task-process.mjs', import.meta.url), 'utf8')
  assert.match(source, /node_modules/u)
  assert.match(processSource, /shell: false/u)
  assert.match(source, /RYFRAME_FAST_CHECK_CACHE_ROOT/u)
})

test('已吸收的薄包装脚本不再存在', async () => {
  for (const relative of [
    '../' + ['run', 'fast', 'checks.mjs'].join('-'),
    '../' + ['verify', 'local', 'api', 'contract.mjs'].join('-'),
    '../' + ['build', 'real', 'frontend.mjs'].join('-'),
    '../' + ['check', 'consumer', 'contract.mjs'].join('-'),
    '../' + ['check', 'api', 'operation', 'usage.mjs'].join('-'),
    '../' + ['check', 'prerelease', 'dependencies.mjs'].join('-'),
    '../' + ['check', 'required', 'jobs.mjs'].join('-'),
    '../' + ['api', 'version', 'contract.mjs'].join('-'),
    '../../' + ['vitest', 'targeted', 'config', 'ts'].join('.'),
  ])
    await assert.rejects(access(new URL(relative, import.meta.url)))
})
