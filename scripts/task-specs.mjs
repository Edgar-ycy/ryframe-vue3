const binary = (packageName, name, args) => ({ kind: 'package', packageName, name, args })
const script = (file, args = []) => ({ kind: 'script', file: `scripts/${file}`, args })
const cached = (tool) => ['--cache', '--cache-location', { cache: tool }]

/** 任务职责、选择条件、参数和实际执行定义的唯一登记表。 */
export const taskSpecs = {
  format: {
    label: '格式',
    profiles: ['fast', 'static'],
    params: (_options, profiles) => ({ cache: !profiles.has('static'), fix: false }),
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
    invoke: () => script('check-source-size.mjs'),
  },
  imports: {
    label: '导入边界',
    profiles: ['fast', 'static'],
    invoke: () => script('check-import-boundaries.mjs'),
  },
  'api-operations': {
    label: 'operation 使用',
    profiles: ['fast', 'static', 'contract'],
    invoke: () => script('check-api-operation-usage.mjs'),
  },
  'api-artifacts': {
    label: 'API 派生物',
    profiles: ['fast', 'static', 'contract', 'generate'],
    params: (options) => ({ write: options.command === 'generate' && options.write === true }),
    invoke: ({ params }) =>
      script('generate-api-artifacts.mjs', [params.write ? '--write' : '--check']),
  },
  eslint: {
    label: 'ESLint',
    profiles: ['fast', 'static'],
    params: () => ({ fix: false }),
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
    invoke: ({ params }) =>
      binary('vitest', 'vitest', [
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
    invoke: () => ({ kind: 'action', action: 'api-source' }),
  },
  'api-contract': {
    label: 'API 契约',
    profiles: ['static', 'contract'],
    invoke: () => script('check-api-contract.mjs'),
  },
  'api-upstream': {
    label: '上游 API 来源',
    profiles: ['static', 'contract'],
    when: (options) => options.upstream === true,
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
    invoke: () => script('check-prerelease-dependencies.mjs'),
  },
  'policy-tests': {
    label: '工具策略测试',
    profiles: ['static', 'tools'],
    invoke: () => ({ kind: 'policy-tests' }),
  },
  'supply-chain': {
    label: '供应链许可证',
    profiles: ['tools'],
    invoke: () => script('check-supply-chain-policy.mjs'),
  },
  build: {
    label: '生产构建',
    profiles: ['build'],
    phase: () => 2,
    params: (options) => ({ real: options.real === true }),
    effect: 'artifacts',
    invoke: () => binary('vite', 'vite', ['build']),
  },
  bundle: {
    label: '包体积',
    profiles: ['build'],
    phase: () => 3,
    invoke: () => script('check-bundle-budget.mjs'),
  },
  browser: {
    label: '浏览器流程',
    profiles: ['browser'],
    params: (options) => ({
      real: options.real === true,
      fixture: options.fixture ?? null,
      server: options.server ?? null,
    }),
    effect: 'artifacts',
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
    invoke: ({ params }) => binary('vite', 'vite', params.preview ? ['preview'] : []),
  },
  sbom: {
    label: 'CycloneDX SBOM',
    profiles: ['sbom'],
    params: (options) => ({ write: options.write === true, output: options.output ?? null }),
    invoke: ({ params }) =>
      script('generate-sbom.mjs', [
        ...(params.output ? ['--output', params.output] : []),
        ...(params.write ? ['--write'] : []),
      ]),
  },
}

export function taskEnvironment(task) {
  if (task.id === 'build' && task.params.real) return { VITE_APP_API_ORIGIN: '' }
  if (task.id !== 'browser') return {}
  return {
    ...(task.params.fixture ? { RYFRAME_E2E_FIXTURE: task.params.fixture } : {}),
    ...(task.params.server ? { RYFRAME_E2E_SERVER: task.params.server } : {}),
  }
}
