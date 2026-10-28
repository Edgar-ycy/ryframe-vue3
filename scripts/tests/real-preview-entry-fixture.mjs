import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// 仅替换配置的外部端口；实际 TS 配置与 node:fs 均由 Node 原样加载。
const [configFile, root] = process.argv.slice(2)
if (!path.isAbsolute(configFile) || !path.isAbsolute(root) || process.cwd() !== root)
  throw new Error('配置和夹具必须使用绝对路径，并在独占夹具目录运行')
let input = ''
for await (const chunk of process.stdin) input += chunk
const scenario = JSON.parse(input)
const trace = []
const directories = () => ({
  report: existsSync(path.join(root, '.local-tests/playwright-real/report')),
  results: existsSync(path.join(root, '.local-tests/playwright-real/results')),
})
const record = (port, args) => trace.push({ port, args, directories: directories() })
const environment = {
  fixture: 'core',
  port: 5199,
  runId: 'entry-fixture',
  serverMode: scenario.serverMode,
  baseURL: scenario.baseURL,
}
const key = '__realPreviewEntryPorts'
globalThis[key] = {
  environment() {
    record('environment', [])
    if (scenario.environmentError) throw new Error('fixture: invalid environment')
    return environment
  },
  receipt(...args) {
    record('receipt', args)
    if (scenario.receiptError) throw new Error(`fixture: ${scenario.receiptError} receipt`)
  },
  selection(...args) {
    record('selection', args)
    return { selection: {} }
  },
  defineConfig(config) {
    record('defineConfig', [])
    return config
  },
}
const ports = new Map([
  ['@playwright/test', ['defineConfig', 'defineConfig']],
  ['./scripts/real-browser-environment.mjs', ['loadRealBrowserEnvironment', 'environment']],
  ['./scripts/restore-build.mjs', ['verifyBuildReceipt', 'receipt']],
  ['./scripts/restore-scenarios.mjs', ['realTestSelection', 'selection']],
])
const configURL = pathToFileURL(configFile).href
const sources = new Map()
for (const [specifier, [name, port]] of ports) {
  const source = `export const ${name} = globalThis.${key}.${port}`
  sources.set(specifier, `data:text/javascript,${encodeURIComponent(source)}`)
}
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === configURL && sources.has(specifier))
      return { url: sources.get(specifier), shortCircuit: true }
    return nextResolve(specifier, context)
  },
})
let config
let error
try {
  config = (await import(configURL)).default
} catch (caught) {
  error = caught.message
} finally {
  hooks.deregister()
  delete globalThis[key]
}
process.stdout.write(JSON.stringify({ trace, config, error, directories: directories() }) + '\n')
