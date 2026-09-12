const binary = (packageName, name, args) => ({ kind: 'package', packageName, name, args })
const script = (file, args = []) => ({ kind: 'script', file: `scripts/${file}`, args })
const cached = (tool) => ['--cache', '--cache-location', { cache: tool }]
const isNodePolicyTest = (test) =>
  typeof test === 'string' &&
  test.replaceAll('\\', '/').startsWith('scripts/tests/') &&
  test.endsWith('.test.mjs')

/** 任务职责、选择条件、参数和实际执行定义的唯一登记表。 */
export const taskSpecs = {
  format: {
    label: '格式',
    profiles: ['fast', 'static'],
    params: (_options, profiles) => ({ cache: !profiles.has('static'), fix: false }),
    allowedWrites: ({ params }) => [
      ...(params.fix ? ['controlled-source:format'] : []),
      ...(params.cache ? ['cache:prettier'] : []),
    ],
    concurrencyResources: ({ params }) =>
      params.fix ? ['exclusive:repository-source'] : ['shared:frontend-cpu'],
    invoke: ({ params }) =>
      binary('prettier', 'prettier', [
        params.fix ? '--write' : '--check',
        '.',
        ...(params.cache ? [...cached('prettier'), '--cache-strategy', 'content'] : []),
        '--config',
        'prettier.config.mjs',
      ]),
  },
  'source-size': {
    label: '源码规模',
    profiles: ['fast', 'static'],
    invoke: () => script('source-size-contract.mjs'),
  },
  imports: {
    label: '源码边界',
    profiles: ['fast', 'static', 'contract'],
    invoke: () => script('check-import-boundaries.mjs'),
  },
  'api-artifacts': {
    label: 'API 派生物',
    profiles: ['fast', 'static', 'contract', 'generate'],
    params: (options) => ({ write: options.command === 'generate' && options.write === true }),
    allowedWrites: ({ params }) => (params.write ? ['controlled-source:api-artifacts'] : []),
    concurrencyResources: ({ params }) =>
      params.write ? ['exclusive:repository-source'] : ['shared:frontend-cpu'],
    invoke: ({ params }) =>
      script('generate-api-artifacts.mjs', [params.write ? '--write' : '--check']),
  },
  eslint: {
    label: 'ESLint',
    profiles: ['fast', 'static'],
    params: () => ({ fix: false }),
    allowedWrites: ({ params }) => [
      'cache:eslint',
      ...(params.fix ? ['controlled-source:eslint'] : []),
    ],
    concurrencyResources: ({ params }) =>
      params.fix ? ['exclusive:repository-source'] : ['shared:frontend-cpu'],
    invoke: ({ params }) =>
      binary('eslint', 'eslint', [
        '.',
        ...(params.fix ? ['--fix'] : []),
        '--max-warnings=0',
        ...cached('eslint'),
      ]),
  },
  stylelint: {
    label: 'Stylelint',
    profiles: ['fast', 'static'],
    params: () => ({ fix: false }),
    allowedWrites: ({ params }) => [
      'cache:stylelint',
      ...(params.fix ? ['controlled-source:stylelint'] : []),
    ],
    concurrencyResources: ({ params }) =>
      params.fix ? ['exclusive:repository-source'] : ['shared:frontend-cpu'],
    invoke: ({ params }) =>
      binary('stylelint', 'stylelint', [
        'src/**/*.{css,scss,vue}',
        ...(params.fix ? ['--fix'] : []),
        '--max-warnings=0',
        ...cached('stylelint'),
      ]),
  },
  typecheck: {
    label: '类型检查',
    profiles: ['fast', 'static', 'contract'],
    params: (_options, profiles) => ({
      scope: profiles.has('static') || profiles.has('contract') ? 'all' : 'app',
    }),
    compilationCoverage: ({ params }) => [`typescript:${params.scope}`],
    allowedWrites: ({ params }) => [`cache:types/${params.scope}.tsbuildinfo`],
    invoke: ({ params }) =>
      binary('vue-tsc', 'vue-tsc', [
        '-p',
        params.scope === 'all' ? 'tsconfig.json' : 'tsconfig.app.json',
        '--noEmit',
      ]),
  },
  unit: {
    label: '单元测试',
    profiles: ['fast', 'unit', 'targeted'],
    params: (options, profiles) => ({ coverage: profiles.has('unit'), test: options.test ?? null }),
    phase: (params) => (params.coverage ? 1 : 0),
    compilationCoverage: ({ params }) => [
      params.test
        ? `${isNodePolicyTest(params.test) ? 'node-test' : 'vitest'}:${params.test}`
        : 'vitest:all',
    ],
    allowedWrites: ({ params }) => [
      ...(isNodePolicyTest(params.test) ? ['temporary:tool-test-fixtures'] : ['cache:vite']),
      ...(params.coverage ? ['artifact:coverage'] : []),
    ],
    invoke: ({ params }) =>
      isNodePolicyTest(params.test)
        ? { kind: 'node-test', file: params.test }
        : binary('vitest', 'vitest', [
            'run',
            '--config',
            'vitest.config.ts',
            ...(params.coverage ? ['--coverage'] : []),
            ...(params.test ? [params.test] : []),
          ]),
  },
  'api-source': {
    label: 'API 来源',
    profiles: ['static', 'contract'],
    params: (options) => ({ consumer: options.consumer ?? null }),
    externalResources: ({ params }) => (params.consumer ? ['registered:backend-openapi'] : []),
    invoke: () => ({ kind: 'action', action: 'api-source' }),
  },
  'api-contract': {
    label: 'API 契约',
    profiles: ['static', 'contract'],
    invoke: () => script('check-api-contract.mjs'),
  },
  'source-domain-contract': {
    label: '构建来源分域契约',
    profiles: ['contract'],
    when: (options) => options.consumer !== undefined && options.consumer !== null,
    externalResources: () => ['registered:backend-source-domain-checker'],
    invoke: () => script('source-domain-contract.mjs'),
  },
  'api-upstream': {
    label: '上游 API 来源',
    profiles: ['static', 'contract'],
    when: (options) => options.upstream === true,
    externalResources: () => ['network:registered-api-upstream'],
    invoke: () => script('sync-api-contract.mjs', ['--verify-upstream']),
  },
  workflows: {
    label: '工作流',
    profiles: ['static'],
    invoke: () => script('check-workflows.mjs'),
  },
  dependencies: {
    label: '依赖版本',
    profiles: ['static'],
    invoke: () => script('prerelease-dependency-policy.mjs'),
  },
  'policy-tests': {
    label: '工具策略测试',
    profiles: ['static', 'tools'],
    when: (options) => options.toolsRequest === undefined,
    allowedWrites: () => ['temporary:tool-test-fixtures'],
    invoke: () => ({ kind: 'policy-tests' }),
  },
  'supply-chain': {
    label: '供应链许可证',
    profiles: ['tools'],
    when: (options) => options.toolsRequest === undefined,
    invoke: () => script('check-supply-chain-policy.mjs'),
  },
  'required-jobs': {
    label: '必须门禁汇总',
    profiles: ['tools'],
    when: (options) => options.toolsRequest !== undefined,
    params: (options) => options.toolsRequest,
    invoke: () => ({ kind: 'action', action: 'required-jobs' }),
  },
  'build-source': {
    label: '生产构建来源前像',
    profiles: ['build'],
    when: (options) => options.command === 'build' && options.real === true,
    params: (options) => ({ real: options.real === true }),
    phase: () => 1,
    concurrencyResources: () => ['exclusive:repository-source'],
    invoke: () => ({ kind: 'action', action: 'build-source' }),
  },
  build: {
    label: '生产构建',
    profiles: ['build'],
    phase: () => 2,
    params: (options) => ({ real: options.real === true }),
    effect: 'artifacts',
    compilationCoverage: () => ['vite:production'],
    allowedWrites: () => ['artifact:dist', 'cache:vite'],
    concurrencyResources: () => ['exclusive:dist'],
    invoke: () => binary('vite', 'vite', ['build']),
  },
  bundle: {
    label: '包体积',
    profiles: ['build'],
    phase: () => 3,
    concurrencyResources: () => ['exclusive:dist'],
    invoke: () => script('check-bundle-budget.mjs'),
  },
  'build-receipt': {
    label: '真实生产构建收据',
    profiles: ['build'],
    when: (options) => options.command === 'build' && options.real === true,
    params: (options) => ({ real: options.real === true }),
    phase: () => 4,
    effect: 'artifacts',
    allowedWrites: () => ['artifact:dist/.vite/restore-build.json'],
    concurrencyResources: () => ['exclusive:dist', 'exclusive:repository-source'],
    invoke: () => ({ kind: 'action', action: 'build-receipt' }),
  },
  browser: {
    label: '浏览器流程',
    profiles: ['browser'],
    params: (options) => ({
      real: options.real === true,
      fixture: options.fixture ?? 'core',
      server: options.server ?? 'dev',
    }),
    effect: 'artifacts',
    allowedWrites: ({ params }) => [
      params.real ? 'artifact:playwright-real' : 'artifact:playwright',
    ],
    externalResources: ({ params }) => [
      'process:local-chrome',
      ...(params.real ? ['registered:full-stack'] : []),
    ],
    concurrencyResources: () => ['exclusive:browser', 'exclusive:browser-server'],
    invoke: ({ params }) =>
      binary('@playwright/test', 'playwright', [
        'test',
        '--config',
        params.real ? 'playwright.real.config.ts' : 'playwright.config.ts',
      ]),
  },
  dev: {
    label: '开发服务器',
    profiles: ['dev'],
    params: (options) => ({ preview: options.preview === true }),
    effect: 'service',
    allowedWrites: () => ['cache:vite'],
    externalResources: () => ['process:local-development-server'],
    concurrencyResources: () => ['exclusive:development-server'],
    invoke: ({ params }) => binary('vite', 'vite', params.preview ? ['preview'] : []),
  },
  sbom: {
    label: 'CycloneDX SBOM',
    profiles: ['sbom'],
    params: (options) => ({ write: options.write === true, output: options.output ?? null }),
    allowedWrites: ({ params }) => (params.write ? [`output:${params.output}`] : []),
    concurrencyResources: ({ params }) =>
      params.write ? ['exclusive:sbom-output'] : ['shared:frontend-cpu'],
    invoke: ({ params }) =>
      script('generate-sbom.mjs', [
        ...(params.output ? ['--output', params.output] : []),
        ...(params.write ? ['--write'] : []),
      ]),
  },
}

/** 规划器与执行器共同消费的实际调用及资源声明。 */
export function taskExecutionMetadata(task) {
  const spec = taskSpecs[task.id]
  if (!spec) throw new Error(`未登记的任务：${task.id}`)
  const readList = (name, fallback) => spec[name]?.(task) ?? fallback
  return {
    invocation: spec.invoke(task),
    workingDirectory: '.',
    compilationCoverage: readList('compilationCoverage', []),
    allowedWrites: readList('allowedWrites', []),
    externalResources: readList('externalResources', []),
    concurrencyResources: readList('concurrencyResources', ['shared:frontend-cpu']),
  }
}

export function taskEnvironment(task) {
  if (['build-source', 'build', 'build-receipt'].includes(task.id) && task.params.real) {
    return { VITE_APP_API_ORIGIN: '' }
  }
  if (task.id !== 'browser') return {}
  return {
    ...(task.params.fixture ? { RYFRAME_E2E_FIXTURE: task.params.fixture } : {}),
    ...(task.params.server ? { RYFRAME_E2E_SERVER: task.params.server } : {}),
  }
}
