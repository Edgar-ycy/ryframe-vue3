import { lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'

import {
  buildSourceSnapshot,
  environmentFiles,
  observedToolchain,
  validateBuildContext,
} from './build-source.mjs'
import {
  captureSourceInventory,
  sha256,
  sourceDomains,
  validateSourceDomains,
} from './build-source-inventory.mjs'

export const receiptPath = '.vite/restore-build.json'

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
  if (!files.some((file) => file.path === 'index.html')) throw new Error('缺少生产首页')
  if (!files.some((file) => file.path === '.vite/manifest.json'))
    throw new Error('缺少 Vite 生产 manifest')
  return files
}

export function writeBuildReceipt(root, before, overrides = {}, environment = process.env) {
  const after = buildSourceSnapshot(root, overrides, environment)
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
export function verifyBuildReceipt(root, environment = process.env) {
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
    !isDeepStrictEqual(receipt.build.toolchain, observedToolchain(root, environment))
  )
    throw new Error('真实 preview 的生产构建与当前源码、环境文件或工具链不一致')
  if (!isDeepStrictEqual(receipt.files, productionFiles(path.join(root, 'dist')))) {
    throw new Error('真实 preview 的生产构建内容已发生变化')
  }
  return receipt
}
