import { toolProcessEnvironment } from './tool-inputs.mjs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createBrowserControl } from './browser-control.mjs'
import { requireUnusedRealBrowserArtifacts } from './real-browser-artifacts.mjs'
import {
  loadRealBrowserEnvironment,
  loadRealBrowserInput,
  validateRealBrowserEnvironment,
} from './real-browser-environment.mjs'

export function parseBrowserArguments(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === '--real' && !options.real) options.real = true
    else if (flag === '--generated' && !options.generated) options.generated = true
    else if (flag === '--spec') {
      if (options.spec !== undefined) throw new Error('--spec 不能重复')
      options.spec = argv[++index]
      if (!options.spec || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.spec\.ts$/.test(options.spec))
        throw new Error('--spec 必须为生成页面测试文件名')
    } else if (['--fixture', '--server'].includes(flag)) {
      const key = flag.slice(2)
      const value = argv[++index]
      if (
        options[key] ||
        !(key === 'fixture' ? ['core', 'business'] : ['dev', 'preview']).includes(value)
      )
        throw new Error('浏览器参数无效或重复')
      options[key] = value
    } else throw new Error('浏览器参数无效或重复')
  }
  if (options.fixture && !options.real) throw new Error('--fixture 仅适用于真实验收')
  if (options.generated && (!options.real || (options.fixture && options.fixture !== 'core')))
    throw new Error('--generated 必须与 --real 及 core fixture 一起使用')
  validateSpec(options)
  return options
}

function validateSpec(options) {
  if (
    options.spec !== undefined &&
    (!options.generated ||
      !options.real ||
      (options.fixture && options.fixture !== 'core') ||
      typeof options.spec !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*\.spec\.ts$/.test(options.spec))
  )
    throw new Error('--spec 仅接受真实 core 生成页面测试文件名')
}

export async function runBrowser(options, root = process.cwd(), execute = spawn) {
  validateSpec(options)
  if (options.generated) {
    if (!options.real || (options.fixture && options.fixture !== 'core'))
      throw new Error('--generated 必须与 --real 及 core fixture 一起使用')
    const input = loadRealBrowserInput(root)
    if (
      (options.fixture ?? input.fixture ?? 'core') !== 'core' ||
      input.restore !== undefined ||
      input.credentialEndpoint !== undefined
    )
      throw new Error('生成页面验收仅接受无 restore/credentialEndpoint 的 core 配置')
    validateRealBrowserEnvironment({
      ...input,
      ...(options.fixture ? { fixture: options.fixture } : {}),
      ...(options.server ? { serverMode: options.server } : {}),
    })
  }
  const close = createBrowserControl(root, options)
  try {
    if (options.real) requireUnusedRealBrowserArtifacts(root, loadRealBrowserEnvironment(root))
    const windows = process.platform === 'win32'
    const corepack = path.join(
      path.dirname(process.execPath),
      'node_modules/corepack/dist/corepack.js',
    )
    const args = [
      'pnpm',
      'exec',
      'playwright',
      'test',
      '--config',
      options.generated
        ? 'playwright.generated.config.ts'
        : options.real
          ? 'playwright.real.config.ts'
          : 'playwright.config.ts',
      ...(options.spec !== undefined
        ? [
            String.raw`(?:^|[/\\])tests[/\\]browser-generated[/\\]${options.spec.replaceAll('.', String.raw`\.`)}$`,
          ]
        : []),
    ]
    await new Promise((resolve, reject) => {
      const child = execute(
        windows ? process.execPath : 'corepack',
        windows ? [corepack, ...args] : args,
        { cwd: root, env: toolProcessEnvironment(), stdio: 'inherit', windowsHide: true },
      )
      child.once('error', reject)
      child.once('exit', (code, signal) => {
        if (signal || code !== 0) reject(new Error(`浏览器验收失败：${signal ?? code}`))
        else resolve()
      })
    })
  } finally {
    close()
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  Promise.resolve()
    .then(() => runBrowser(parseBrowserArguments(process.argv.slice(2))))
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
