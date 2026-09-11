import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { buildSourceSnapshot } from '../build-source.mjs'
import { captureSourceInventory, sourceDomains } from '../build-source-inventory.mjs'
import {
  productionFiles,
  receiptPath,
  verifyBuildReceipt,
  writeBuildReceipt,
} from '../restore-build.mjs'

function buildEnvironment(root) {
  const cli = path.join(root, '.local-tests/pnpm.mjs')
  mkdirSync(path.dirname(cli), { recursive: true })
  writeFileSync(cli, "console.log('11.20.0')\n")
  return {
    ...process.env,
    npm_config_user_agent: 'pnpm/11.20.0 npm/? node/? win32 x64',
    npm_execpath: cli,
  }
}

function fixture(t) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const root = mkdtempSync(path.join(local, 'restore-build-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { windowsHide: true })
  git('init', '--quiet')
  git('config', 'core.autocrlf', 'false')
  writeFileSync(
    path.join(root, '.gitignore'),
    'dist/\n.local-tests/\nnode_modules/\n.env.production\n.env*.local\n',
  )
  writeFileSync(path.join(root, 'app.js'), 'export const answer = 42\n')
  writeFileSync(path.join(root, 'package.json'), '{"packageManager":"pnpm@11.20.0"}\n')
  mkdirSync(path.join(root, 'scripts'), { recursive: true })
  writeFileSync(path.join(root, 'scripts/tool.mjs'), 'export const tool = true\n')
  git('add', '.')
  git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@localhost',
    'commit',
    '--quiet',
    '-m',
    'fixture',
  )
  mkdirSync(path.join(root, 'node_modules/vite'), { recursive: true })
  writeFileSync(path.join(root, 'node_modules/vite/package.json'), '{"version":"7.1.7"}\n')
  mkdirSync(path.join(root, 'dist/.vite'), { recursive: true })
  writeFileSync(path.join(root, 'dist/index.html'), '<script src="/app.js"></script>')
  writeFileSync(path.join(root, 'dist/app.js'), 'console.log(42)')
  writeFileSync(path.join(root, 'dist/.vite/manifest.json'), '{}')
  return root
}

test('生产构建收据绑定三域、工具链和完整 dist，非干净候选不能伪装', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const before = buildSourceSnapshot(root, {}, environment)
  assert.equal(before.sources.full.source.snapshot.clean, true)
  writeFileSync(path.join(root, 'new.js'), 'export const untracked = true')
  const candidate = buildSourceSnapshot(root, {}, environment)
  assert.equal(candidate.sources.full.source.snapshot.clean, false)
  assert.deepEqual(Object.keys(candidate.sources).sort(), ['full', 'product', 'tools'])
  assert.throws(() => writeBuildReceipt(root, before, {}, environment), /发生变化/u)
  const receipt = writeBuildReceipt(root, candidate, {}, environment)
  assert.equal(receipt.format_version, 2)
  assert.equal(receipt.sources.full.source.snapshot.clean, false)
  assert.deepEqual(receipt.files, productionFiles(path.join(root, 'dist')))
  assert.deepEqual(JSON.parse(readFileSync(path.join(root, 'dist', receiptPath))), receipt)
  assert.deepEqual(verifyBuildReceipt(root, environment), receipt)
  assert.throws(() => writeBuildReceipt(root, candidate, {}, environment), /EEXIST/u)
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

test('Vite 忽略环境文件、构建参数和工具链变化都不能复用收据', (t) => {
  const root = fixture(t)
  const environment = { ...buildEnvironment(root), VITE_lowercase_input: 'fixture' }
  const before = buildSourceSnapshot(root, {}, environment)
  assert.ok(before.build.environment.variables.includes('VITE_lowercase_input'))
  writeFileSync(path.join(root, '.env.production'), 'VITE_FLAG=before\n')
  assert.throws(() => writeBuildReceipt(root, before, {}, environment), /有效构建环境/u)
  rmSync(path.join(root, '.env.production'))
  const receipt = writeBuildReceipt(root, before, {}, environment)
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

test('preview 不要求当前 VITE 进程环境重现构建值，但仍核对环境文件与产物', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  const builtWith = { ...environment, VITE_BUILD_LABEL: 'candidate' }
  const before = buildSourceSnapshot(root, { VITE_APP_API_ORIGIN: '' }, builtWith)
  const receipt = writeBuildReceipt(root, before, { VITE_APP_API_ORIGIN: '' }, builtWith)
  assert.deepEqual(
    verifyBuildReceipt(root, { ...environment, VITE_BUILD_LABEL: 'another-shell' }),
    receipt,
  )
  writeFileSync(path.join(root, 'dist/app.js'), 'console.log(43)')
  assert.throws(() => verifyBuildReceipt(root, environment), /构建内容已发生变化/u)
})

test('缺少 manifest 和源码中途变动可被识别', (t) => {
  const root = fixture(t)
  const environment = buildEnvironment(root)
  assert.throws(() => verifyBuildReceipt(root, environment), /build --real/u)
  const before = buildSourceSnapshot(root, {}, environment)
  writeFileSync(path.join(root, 'app.js'), 'export const answer = 43\n')
  assert.throws(() => writeBuildReceipt(root, before, {}, environment), /发生变化/u)
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

test('真实 preview 在创建报告目录前验证生产构建收据', () => {
  const source = readFileSync(path.resolve('playwright.real.config.ts'), 'utf8')
  const environmentCheck = source.indexOf('validateRealBrowserEnvironment()')
  const verify = source.indexOf("if (serverMode === 'preview' && !externalBaseUrl)")
  const selection = source.indexOf('realTestSelection(')
  const directory = source.indexOf('mkdirSync(directory')
  assert.ok(environmentCheck >= 0 && environmentCheck < verify)
  assert.ok(verify < selection && selection < directory)
  assert.match(source.slice(verify, selection), /verifyBuildReceipt\(/u)
})
