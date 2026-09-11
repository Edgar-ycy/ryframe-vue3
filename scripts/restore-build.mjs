import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'
import { pathToFileURL } from 'node:url'

import {
  buildSourceSnapshot,
  environmentFiles,
  observedExternalToolchain,
  observedToolchain,
  validateBuildContext,
} from './build-source.mjs'
import {
  captureSourceInventory,
  compareSourcePaths,
  sha256,
  sourceDomains,
  validateSourceDomains,
} from './build-source-inventory.mjs'

export const receiptPath = '.vite/restore-build.json'

class ExternalBuildUsageError extends Error {}

function viteExecutable(root) {
  const packageRoot = path.join(root, 'node_modules', 'vite')
  const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
  const relative = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.vite
  if (typeof relative !== 'string' || !relative) throw new Error('目标前端缺少 Vite 构建入口')
  const executable = path.resolve(packageRoot, relative)
  const packagePath = path.relative(path.resolve(packageRoot), executable)
  if (
    packagePath === '' ||
    packagePath.startsWith('..' + path.sep) ||
    path.isAbsolute(packagePath) ||
    !lstatSync(executable).isFile()
  )
    throw new Error('目标前端的 Vite 构建入口无效')
  return executable
}

function executeViteBuild(root, environment) {
  execFileSync(process.execPath, [viteExecutable(root), 'build'], {
    cwd: root,
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  })
}

export function productionFiles(dist) {
  const files = []
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      const file = path.join(directory, name)
      const relative = path.relative(dist, file).replaceAll('\\', '/')
      const stat = lstatSync(file)
      if (stat.isSymbolicLink()) throw new Error('生产构建不能通过链接引用外部文件')
      if (stat.isDirectory()) visit(file)
      else if (stat.isFile() && relative !== receiptPath) {
        const bytes = readFileSync(file)
        files.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) })
      }
    }
  }
  visit(dist)
  files.sort((left, right) => compareSourcePaths(left.path, right.path))
  if (!files.some((file) => file.path === 'index.html')) throw new Error('缺少生产首页')
  if (!files.some((file) => file.path === '.vite/manifest.json'))
    throw new Error('缺少 Vite 生产 manifest')
  return files
}

export function writeBuildReceipt(
  root,
  before,
  overrides = {},
  environment = process.env,
  observeToolchain = undefined,
) {
  const after = buildSourceSnapshot(root, overrides, environment, observeToolchain)
  if (!isDeepStrictEqual(before, after)) throw new Error('构建期间源码或有效构建环境发生变化')
  const receipt = {
    format_version: 2,
    kind: 'restore-frontend-build',
    sources: after.sources,
    build: after.build,
    files: productionFiles(path.join(root, 'dist')),
  }
  writeFileSync(path.join(root, 'dist', receiptPath), JSON.stringify(receipt, null, 2) + '\n', {
    flag: 'wx',
  })
  return receipt
}

/** 真实 preview 只接受当前源码、环境文件和工具链对应的完整生产产物。 */
export function verifyBuildReceipt(root, environment = process.env, observeToolchain = undefined) {
  let receipt
  try {
    receipt = JSON.parse(readFileSync(path.join(root, 'dist', receiptPath), 'utf8'))
  } catch (error) {
    throw new Error('真实 preview 需要先执行 corepack pnpm build --real', { cause: error })
  }
  try {
    if (
      Object.keys(receipt).sort().join('\0') !==
        ['format_version', 'kind', 'sources', 'build', 'files'].sort().join('\0') ||
      receipt.format_version !== 2 ||
      receipt.kind !== 'restore-frontend-build'
    )
      throw new Error('字段无效')
    validateSourceDomains(receipt.sources)
    validateBuildContext(receipt.build)
  } catch (error) {
    throw new Error('真实 preview 的生产构建收据无效', { cause: error })
  }
  const currentSources = sourceDomains(captureSourceInventory(root))
  if (
    !isDeepStrictEqual(receipt.sources, currentSources) ||
    !isDeepStrictEqual(receipt.build.environment_files, environmentFiles(root)) ||
    !isDeepStrictEqual(
      receipt.build.toolchain,
      (observeToolchain ?? observedToolchain)(root, environment),
    )
  )
    throw new Error('真实 preview 的生产构建与当前源码、环境文件或工具链不一致')
  if (!isDeepStrictEqual(receipt.files, productionFiles(path.join(root, 'dist')))) {
    throw new Error('真实 preview 的生产构建内容已发生变化')
  }
  return receipt
}

/** 由当前受信任工具为精确的历史或候选工作树签发同格式生产构建收据。 */
export function buildExternalReceipt(
  root,
  expectedHead,
  {
    environment = process.env,
    executeBuild = executeViteBuild,
    observeToolchain = observedExternalToolchain,
  } = {},
) {
  root = path.resolve(root)
  if (!/^[a-f0-9]{40}$/u.test(expectedHead)) throw new Error('目标前端提交必须是完整小写 SHA')
  const effective = { ...environment, VITE_APP_API_ORIGIN: '' }
  const before = buildSourceSnapshot(root, { VITE_APP_API_ORIGIN: '' }, effective, observeToolchain)
  const snapshot = before.sources.full.source.snapshot
  if (snapshot.head !== expectedHead || !snapshot.clean) {
    throw new Error('外部恢复构建必须使用声明的精确干净前端源码')
  }
  const output = path.join(root, 'dist', receiptPath)
  try {
    lstatSync(output)
    throw new Error('目标前端已经存在恢复构建收据，拒绝覆盖或冒充新构建')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  executeBuild(root, effective)
  const receipt = writeBuildReceipt(
    root,
    before,
    { VITE_APP_API_ORIGIN: '' },
    effective,
    observeToolchain,
  )
  verifyBuildReceipt(root, effective, observeToolchain)
  return receipt
}

function parseExternalBuild(argv) {
  if (argv.length !== 6 || argv[0] !== 'external-build' || argv[5] !== '--write') {
    throw new ExternalBuildUsageError(
      '用法：node scripts/restore-build.mjs external-build --source-root <目录> --expected-head <SHA> --write',
    )
  }
  const values = new Map([
    [argv[1], argv[2]],
    [argv[3], argv[4]],
  ])
  if (values.size !== 2 || !values.has('--source-root') || !values.has('--expected-head')) {
    throw new ExternalBuildUsageError('外部恢复构建参数缺失、重复或顺序无效')
  }
  return { root: values.get('--source-root'), expectedHead: values.get('--expected-head') }
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  try {
    const arguments_ = parseExternalBuild(process.argv.slice(2))
    buildExternalReceipt(arguments_.root, arguments_.expectedHead)
    console.log(JSON.stringify({ receipt: path.resolve(arguments_.root, 'dist', receiptPath) }))
  } catch (error) {
    console.error(error.stack ?? error.message)
    process.exitCode = error instanceof ExternalBuildUsageError ? 2 : 1
  }
}
