import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { buildEnvironment, fixture } from './restore-build-fixture.mjs'
import { buildSourceSnapshot } from '../build-source.mjs'
import { captureSourceInventory, sourceDomains } from '../build-source-inventory.mjs'
import {
  buildExternalReceipt,
  productionFiles,
  receiptPath,
  verifyBuildReceipt,
  writeBuildReceipt,
} from '../restore-build.mjs'

test('生产构建收据绑定三域、工具链和完整 dist，非干净候选不能伪装', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const before = buildSourceSnapshot(root, environment)
  assert.equal(before.sources.full.source.snapshot.clean, true)
  writeFileSync(path.join(root, 'new.js'), 'export const untracked = true')
  const candidate = buildSourceSnapshot(root, environment)
  assert.equal(candidate.sources.full.source.snapshot.clean, false)
  assert.deepEqual(Object.keys(candidate.sources).sort(), ['full', 'product', 'tools'])
  assert.throws(() => writeBuildReceipt(root, before, environment), /发生变化/u)
  const receipt = writeBuildReceipt(root, candidate, environment)
  assert.equal(receipt.format_version, 3)
  assert.equal(receipt.sources.full.source.snapshot.clean, false)
  assert.deepEqual(receipt.files, productionFiles(path.join(root, 'dist')))
  assert.deepEqual(JSON.parse(readFileSync(path.join(root, 'dist', receiptPath))), receipt)
  assert.deepEqual(verifyBuildReceipt(root, environment), receipt)
  assert.throws(() => writeBuildReceipt(root, candidate, environment), /EEXIST/u)
})

test('工具源码变化不改变产品摘要，完整来源和工具摘要仍会变化', (t) => {
  const root = fixture(t)
  const before = sourceDomains(captureSourceInventory(root))
  writeFileSync(path.join(root, 'scripts/tool.mjs'), 'export const tool = false\n')
  const after = sourceDomains(captureSourceInventory(root))
  assert.equal(after.product.frontend.sha256, before.product.frontend.sha256)
  assert.notEqual(after.tools.sha256, before.tools.sha256)
  assert.notEqual(after.full.source.worktree_fingerprint, before.full.source.worktree_fingerprint)
})

test('中英文说明文档变化只更新完整来源，不伪造产品或工具重建', (t) => {
  const root = fixture(t)
  for (const name of ['README.en.md', 'ARCHITECTURE.en.md', 'CHANGELOG.en.md']) {
    writeFileSync(path.join(root, name), '# English guide\n')
  }
  const before = sourceDomains(captureSourceInventory(root))
  for (const name of ['README.en.md', 'ARCHITECTURE.en.md', 'CHANGELOG.en.md']) {
    writeFileSync(path.join(root, name), '# Updated English guide\n')
  }
  const after = sourceDomains(captureSourceInventory(root))
  assert.deepEqual(after.product, before.product)
  assert.deepEqual(after.tools, before.tools)
  assert.notEqual(after.full.source.worktree_fingerprint, before.full.source.worktree_fingerprint)
})

test('公开配置文件、构建参数和工具链变化都不能复用收据', (t) => {
  const root = fixture(t)
  const environment = { ...buildEnvironment(root), VITE_lowercase_input: 'PRIVATE-LEGACY-SENTINEL' }
  const before = buildSourceSnapshot(root, environment)
  assert.equal(before.build.configuration.environment, environment.APP_ENV ?? 'dev')
  assert.doesNotMatch(JSON.stringify(before.build), /PRIVATE-LEGACY-SENTINEL|VITE_lowercase_input/u)
  const selected = path.join(root, `config/app.${before.build.configuration.environment}.toml`)
  const original = readFileSync(selected)
  writeFileSync(selected, '[server]\nport = 6001\n')
  assert.throws(() => writeBuildReceipt(root, before, environment), /有效构建配置/u)
  writeFileSync(selected, original)
  const receipt = writeBuildReceipt(root, before, environment)
  const receiptFile = path.join(root, 'dist', receiptPath)
  const changed = structuredClone(receipt)
  changed.build.command.push('--debug')
  writeFileSync(receiptFile, JSON.stringify(changed))
  assert.throws(() => verifyBuildReceipt(root, environment), /收据无效/u)
  writeFileSync(receiptFile, JSON.stringify(receipt))
  assert.throws(
    () => verifyBuildReceipt(root, { ...environment, npm_config_user_agent: 'pnpm/10.0.0 node/?' }),
    /Corepack pnpm/u,
  )
  const withoutObservedPnpm = { ...environment }
  delete withoutObservedPnpm.npm_config_user_agent
  assert.throws(() => verifyBuildReceipt(root, withoutObservedPnpm), /Corepack pnpm/u)
  const fakePnpm = path.join(root, '.local-tests/fake-pnpm.mjs')
  mkdirSync(path.dirname(fakePnpm), { recursive: true })
  writeFileSync(fakePnpm, "console.log('10.0.0')\n")
  assert.throws(
    () => verifyBuildReceipt(root, { ...environment, npm_execpath: fakePnpm }),
    /实际 pnpm 版本/u,
  )
})

test('preview 按保存的 APP_ENV 核对文件而不要求当前 shell 重现选择，仍核对产物', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const builtWith = { ...environment, APP_ENV: 'test', VITE_BUILD_LABEL: 'candidate' }
  const before = buildSourceSnapshot(root, builtWith)
  const receipt = writeBuildReceipt(root, before, builtWith)
  assert.deepEqual(
    verifyBuildReceipt(root, { ...environment, APP_ENV: 'prod', VITE_BUILD_LABEL: 'other-shell' }),
    receipt,
  )
  writeFileSync(path.join(root, 'dist/app.js'), 'console.log(43)')
  assert.throws(() => verifyBuildReceipt(root, environment), /构建内容已发生变化/u)
})

test('缺少 manifest 和源码中途变动可被识别', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  assert.throws(() => verifyBuildReceipt(root, environment), /build --real/u)
  const before = buildSourceSnapshot(root, environment)
  writeFileSync(path.join(root, 'app.js'), 'export const answer = 43\n')
  assert.throws(() => writeBuildReceipt(root, before, environment), /发生变化/u)
  rmSync(path.join(root, 'dist/.vite/manifest.json'))
  assert.throws(() => productionFiles(path.join(root, 'dist')), /manifest/u)
})

test('完整 dist 清单全局排序并保留 Unicode 路径', (t) => {
  const root = fixture(t)
  mkdirSync(path.join(root, 'dist/a'), { recursive: true })
  writeFileSync(path.join(root, 'dist/a/😀.js'), 'emoji')
  writeFileSync(path.join(root, 'dist/a.txt'), 'sibling')
  const paths = productionFiles(path.join(root, 'dist')).map((item) => item.path)
  const sorted = [...paths].sort((left, right) =>
    Buffer.compare(Buffer.from(left), Buffer.from(right)),
  )
  assert.deepEqual(paths, sorted)
})

test('当前工具可以为声明的精确干净外部工作树签发同格式收据', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  let builds = 0
  const receipt = buildExternalReceipt(root, head, {
    environment,
    observeToolchain: () => ({
      node: process.version,
      pnpm: { pinned: '11.20.0', observed: '11.20.0' },
      vite: '7.1.7',
    }),
    executeBuild: () => {
      builds += 1
      writeFileSync(
        path.join(root, 'dist/build-identity.json'),
        JSON.stringify({ frontend_commit: head }),
      )
    },
  })
  assert.equal(builds, 1)
  assert.equal(receipt.format_version, 3)
  assert.equal(receipt.sources.full.source.snapshot.head, head)
  assert.equal(receipt.sources.full.source.snapshot.clean, true)
  assert.deepEqual(verifyBuildReceipt(root, environment), receipt)
})

test('外部构建在写产物前拒绝错误 SHA、脏源码和已有收据', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  let builds = 0
  const options = {
    environment,
    executeBuild: () => (builds += 1),
    observeToolchain: () => ({
      node: process.version,
      pnpm: { pinned: '11.20.0', observed: '11.20.0' },
      vite: '7.1.7',
    }),
  }
  assert.throws(() => buildExternalReceipt(root, 'a'.repeat(40), options), /精确干净/u)
  writeFileSync(path.join(root, 'untracked.js'), 'dirty')
  assert.throws(() => buildExternalReceipt(root, head, options), /精确干净/u)
  rmSync(path.join(root, 'untracked.js'))
  writeFileSync(path.join(root, 'dist', receiptPath), '{}')
  assert.throws(() => buildExternalReceipt(root, head, options), /拒绝覆盖/u)
  assert.equal(builds, 0)
})

test('真实 preview 在创建报告目录前验证生产构建收据', () => {
  const source = readFileSync(path.resolve('playwright.real.config.ts'), 'utf8')
  const environmentCheck = source.indexOf('loadRealBrowserEnvironment()')
  const verify = source.indexOf("if (serverMode === 'preview' && !externalBaseUrl)")
  const selection = source.indexOf('realTestSelection(')
  const directory = source.indexOf('mkdirSync(directory')
  assert.ok(environmentCheck >= 0 && environmentCheck < verify)
  assert.ok(verify < selection && selection < directory)
  assert.match(source.slice(verify, selection), /verifyBuildReceipt\(/u)
})
