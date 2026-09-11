import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'

import {
  canonicalDigest,
  captureSourceInventory,
  exactObject,
  hex,
  localSourceFile,
  sha256,
  sourceDomains,
  validateFiles,
} from './build-source-inventory.mjs'

export const environmentPaths = Object.freeze([
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
])

export function environmentFiles(root) {
  return environmentPaths.flatMap((relative) => {
    const file = localSourceFile(root, relative, 'Vite 环境文件必须是前端仓库内的普通文件', {
      allowMissing: true,
    })
    return file ? [{ path: relative, sha256: sha256(readFileSync(file)) }] : []
  })
}

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
  const observed = execFileSync(process.execPath, [cli, '--version'], {
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
  const corepack = path.join(
    path.dirname(process.execPath),
    'node_modules/corepack/dist/corepack.js',
  )
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
  overrides = {},
  environment = process.env,
  observeToolchain = observedToolchain,
) {
  // 只在真实来源捕获时加载 Vite；--plan 可在禁止原生扩展和派生进程的权限模型中运行。
  const requireFromSource = createRequire(path.join(root, 'package.json'))
  const effective = { ...requireFromSource('vite').loadEnv('production', root, 'VITE_') }
  for (const [name, value] of Object.entries(environment)) {
    if (name.startsWith('VITE_') && typeof value === 'string') effective[name] = value
  }
  for (const [name, value] of Object.entries(overrides)) {
    if (name.startsWith('VITE_') && typeof value === 'string') effective[name] = value
  }
  const entries = Object.keys(effective)
    .sort()
    .map((name) => ({ name, sha256: sha256(effective[name]) }))
  return {
    command: ['vite', 'build'],
    mode: 'production',
    target: 'vite-default',
    toolchain: observeToolchain(root, environment),
    environment: { variables: entries.map((item) => item.name), sha256: canonicalDigest(entries) },
    environment_files: environmentFiles(root),
  }
}

export function validateBuildContext(value) {
  exactObject(
    value,
    ['command', 'mode', 'target', 'toolchain', 'environment', 'environment_files'],
    '前端构建上下文字段无效',
  )
  exactObject(value.toolchain, ['node', 'pnpm', 'vite'], '前端构建工具链字段无效')
  exactObject(value.toolchain.pnpm, ['pinned', 'observed'], '前端 pnpm 工具链字段无效')
  exactObject(value.environment, ['variables', 'sha256'], '前端构建环境摘要无效')
  if (
    !isDeepStrictEqual(value.command, ['vite', 'build']) ||
    value.mode !== 'production' ||
    value.target !== 'vite-default' ||
    typeof value.toolchain.node !== 'string' ||
    !value.toolchain.node ||
    typeof value.toolchain.vite !== 'string' ||
    !value.toolchain.vite ||
    typeof value.toolchain.pnpm.pinned !== 'string' ||
    !value.toolchain.pnpm.pinned ||
    value.toolchain.pnpm.observed !== value.toolchain.pnpm.pinned ||
    !Array.isArray(value.environment.variables) ||
    !isDeepStrictEqual(
      value.environment.variables,
      [...new Set(value.environment.variables)].sort(),
    ) ||
    !value.environment.variables.every(
      (name) => typeof name === 'string' && name.startsWith('VITE_'),
    ) ||
    !hex(value.environment.sha256, 64)
  )
    throw new Error('前端构建命令、工具链或环境摘要无效')
  validateFiles(value.environment_files, ['path', 'sha256'], '前端构建环境文件无效')
  if (value.environment_files.some((item) => !environmentPaths.includes(item.path))) {
    throw new Error('前端构建环境文件无效')
  }
  return value
}

export function buildSourceSnapshot(
  root,
  overrides = {},
  environment = process.env,
  observeToolchain = observedToolchain,
) {
  return {
    sources: sourceDomains(captureSourceInventory(root)),
    build: buildContext(root, overrides, environment, observeToolchain),
  }
}
