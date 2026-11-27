import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'
import { loadFrontendConfiguration } from './frontend-tool-config.mjs'
import { readBuildIdentity } from './build-identity.mjs'
import { captureSourceInventory } from './build-source-inventory.ts'
import { sourceDomains } from './build-source-domains.ts'
import { bundledCorepackPath } from './tool-inputs.mjs'

export { validateBuildContext } from './build-context-schema.mjs'

function packageVersion(root, name) {
  const manifest = JSON.parse(
    readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'),
  )
  if (typeof manifest.version !== 'string' || !manifest.version) throw new Error(`${name} 版本无效`)
  return manifest.version
}

function pinnedPnpm(root) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  return /^pnpm@([^+]+)(?:\+.*)?$/u.exec(manifest.packageManager ?? '')?.[1]
}

export function packageManagerInvocation(cli) {
  return /\.(?:c?js|mjs)$/u.test(cli)
    ? { executable: process.execPath, arguments: [cli, '--version'] }
    : { executable: cli, arguments: ['--version'] }
}

export function observedToolchain(root, environment = process.env) {
  const pinned = pinnedPnpm(root)
  const announced = /(?:^|\s)pnpm\/([^\s]+)/u.exec(environment.npm_config_user_agent ?? '')?.[1]
  const configuredCli = environment.npm_execpath?.trim()
  if (
    !pinned ||
    !announced ||
    announced !== pinned ||
    !configuredCli ||
    !path.isAbsolute(configuredCli)
  ) {
    throw new Error('真实构建必须由 packageManager 固定版本的 Corepack pnpm 执行')
  }
  const cli = realpathSync(configuredCli)
  if (!lstatSync(configuredCli).isFile() || lstatSync(configuredCli).isSymbolicLink()) {
    throw new Error('真实构建的 pnpm 入口不是普通文件')
  }
  const invocation = packageManagerInvocation(cli)
  const observed = execFileSync(invocation.executable, invocation.arguments, {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  }).trim()
  if (observed !== pinned) {
    throw new Error('实际 pnpm 版本与 packageManager 固定版本不一致')
  }
  return {
    node: process.version,
    pnpm: { pinned, observed },
    vite: packageVersion(root, 'vite'),
  }
}

/** 外部历史工作树不运行 package script；直接核验当前 Node 附带的 Corepack 与目标锁定版本。 */
export function observedExternalToolchain(root) {
  const pinned = pinnedPnpm(root)
  const corepack = bundledCorepackPath()
  if (!pinned || !lstatSync(corepack).isFile() || lstatSync(corepack).isSymbolicLink()) {
    throw new Error('外部真实构建缺少固定 pnpm 或受信任 Corepack 入口')
  }
  const observed = execFileSync(process.execPath, [corepack, 'pnpm', '--version'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  }).trim()
  if (observed !== pinned) throw new Error('外部真实构建的 pnpm 版本与目标工作树不一致')
  return {
    node: process.version,
    pnpm: { pinned, observed },
    vite: packageVersion(root, 'vite'),
  }
}

export function buildContext(
  root,
  environment = process.env,
  observeToolchain = observedToolchain,
  selectedEnvironment = environment.APP_ENV ?? 'dev',
) {
  const toolchain = observeToolchain(root, environment)
  const { configuration } = loadFrontendConfiguration(root, selectedEnvironment)
  return {
    command: ['vite', 'build'],
    mode: 'production',
    target: 'vite-default',
    toolchain,
    configuration,
    identity: readBuildIdentity(root),
  }
}

export function buildSourceSnapshot(
  root,
  environment = process.env,
  observeToolchain = observedToolchain,
  selectedEnvironment = environment.APP_ENV ?? 'dev',
) {
  const sources = sourceDomains(captureSourceInventory(root))
  const build = buildContext(root, environment, observeToolchain, selectedEnvironment)
  if (!isDeepStrictEqual(sources, sourceDomains(captureSourceInventory(root)))) {
    throw new Error('采集构建上下文期间源码发生变化')
  }
  const snapshot = sources.full.source.snapshot
  if (
    build.identity.frontend_commit !== 'development' &&
    (!snapshot.clean || build.identity.frontend_commit !== snapshot.head)
  ) {
    throw new Error('正式构建身份与精确干净前端源码不一致')
  }
  return { sources, build }
}
