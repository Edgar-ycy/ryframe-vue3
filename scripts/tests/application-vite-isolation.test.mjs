import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { fixture } from './application-config-fixture.mjs'

const repository = fileURLToPath(new URL('../..', import.meta.url))

// 在子进程隔离旧项目变量，不污染并行测试的进程全局环境。
const source = String.raw`
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const [root, viteModule] = process.argv.slice(1)
const { build, loadConfigFromFile } = await import(viteModule)
const loaded = await loadConfigFromFile(
  { command: 'build', mode: 'production' }, path.join(root, 'vite.config.ts'),
  root, 'silent', undefined, 'native',
)
assert.ok(loaded)
assert.equal(loaded.config.envDir, false)
assert.deepEqual(loaded.config.envPrefix, [])
const { loadFrontendConfiguration } = await import(
  pathToFileURL(path.join(root, 'scripts/frontend-tool-config.mjs')).href
)
const selected = loadFrontendConfiguration(root)
assert.equal(selected.environment, 'test')
assert.equal(loaded.config.server.port, 6403)
assert.equal(loaded.config.define.__RYFRAME_PUBLIC_CONFIG__, JSON.stringify(selected.publicConfig))
const identity = loaded.config.plugins.find((plugin) => plugin?.name === 'ryframe-build-identity')
assert.ok(identity)
await build({
  ...loaded.config, configFile: false, root, mode: 'production', logLevel: 'silent',
  plugins: [identity], publicDir: false, resolve: {}, optimizeDeps: {},
  build: { outDir: 'dist', manifest: true, minify: false },
})
const files = fs.readdirSync(path.join(root, 'dist'), { recursive: true })
const text = files.filter((name) => fs.statSync(path.join(root, 'dist', name)).isFile())
  .map((name) => fs.readFileSync(path.join(root, 'dist', name), 'utf8')).join('\n')
assert.ok(!text.includes('PRIVATE-LEGACY-SENTINEL'))
assert.ok(!text.includes('VITE_APP_API_ORIGIN'))
assert.ok(text.includes('production'))
assert.ok(text.includes('apiOrigin'))
assert.ok(fs.existsSync(path.join(root, 'dist/build-identity.json')))
console.log(JSON.stringify({ environment: selected.environment, mode: 'production' }))
`

test('实际 Vite define、产物与身份元信息隔离旧 VITE/env，APP_ENV 独立于 mode', (t) => {
  const { root, write } = fixture(t)
  write('config/app.test.toml', { server: { port: 6403 } })
  for (const file of [
    'vite.config.ts',
    'scripts/frontend-tool-config.mjs',
    'scripts/application-config.mjs',
    'scripts/application-config-toml.mjs',
    'scripts/application-config-paths.mjs',
    'scripts/application-config-files.mjs',
    'scripts/build-identity.mjs',
    'scripts/resource-render/json.mjs',
    'src/shared/config/apiEndpoint.ts',
    'src/shared/config/runtimeConfig.ts',
    'src/shared/config/apiPrefix.generated.json',
  ]) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(repository, file), target)
  }
  fs.writeFileSync(path.join(root, 'index.html'), '<script type="module" src="/main.js"></script>')
  fs.writeFileSync(
    path.join(root, 'main.js'),
    [
      'import {runtimeConfig} from "./src/shared/config/runtimeConfig.ts"',
      'document.body.textContent = JSON.stringify({public:runtimeConfig,env:import.meta.env})',
    ].join('\n'),
  )
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    fs.writeFileSync(path.join(root, file), 'VITE_APP_API_ORIGIN=PRIVATE-LEGACY-SENTINEL\n')
  }
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', source, root, import.meta.resolve('vite')],
    {
      cwd: root,
      env: {
        ...process.env,
        APP_ENV: 'test',
        VITE_APP_API_ORIGIN: 'PRIVATE-LEGACY-SENTINEL',
        VITE_APP_BUILD_COMMIT: 'PRIVATE-LEGACY-SENTINEL',
        VITE_PASSWORD: 'PRIVATE-LEGACY-SENTINEL',
      },
      encoding: 'utf8',
      windowsHide: true,
    },
  )
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout.trim()), { environment: 'test', mode: 'production' })
})
