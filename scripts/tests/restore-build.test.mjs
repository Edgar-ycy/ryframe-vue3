import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  productionFiles,
  receiptPath,
  sourceSnapshot,
  verifyBuildReceipt,
  writeBuildReceipt,
} from '../restore-build.mjs'

function fixture(t) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const root = mkdtempSync(path.join(local, 'restore-build-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { windowsHide: true })
  git('init', '--quiet')
  git('config', 'core.autocrlf', 'false')
  writeFileSync(path.join(root, '.gitignore'), 'dist/\n.local-tests/\n')
  writeFileSync(path.join(root, 'app.js'), 'export const answer = 42\n')
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
  mkdirSync(path.join(root, 'dist/.vite'), { recursive: true })
  writeFileSync(path.join(root, 'dist/index.html'), '<script src="/app.js"></script>')
  writeFileSync(path.join(root, 'dist/app.js'), 'console.log(42)')
  writeFileSync(path.join(root, 'dist/.vite/manifest.json'), '{}')
  return root
}

test('生产构建收据包含完整内容摘要且本地候选不会伪装为干净源码', (t) => {
  const root = fixture(t)
  const before = sourceSnapshot(root)
  assert.equal(before.clean, true)
  writeFileSync(path.join(root, 'new.js'), 'export const untracked = true')
  const candidate = sourceSnapshot(root)
  assert.equal(candidate.clean, false)
  assert.equal(candidate.files.length, 1)
  assert.equal(candidate.files[0].path, 'new.js')
  assert.throws(() => writeBuildReceipt(root, before), /源码发生变化/u)
  const receipt = writeBuildReceipt(root, candidate)
  assert.equal(receipt.source.clean, false)
  assert.deepEqual(receipt.files, productionFiles(path.join(root, 'dist')))
  assert.deepEqual(JSON.parse(readFileSync(path.join(root, 'dist', receiptPath))), receipt)
  assert.deepEqual(verifyBuildReceipt(root), receipt)
  assert.throws(() => writeBuildReceipt(root, candidate), /EEXIST/u)
})

test('重新构建、缺少 manifest 与源码中途变动可被识别', (t) => {
  const root = fixture(t)
  assert.throws(() => verifyBuildReceipt(root), /build --real/u)
  const before = sourceSnapshot(root)
  const receipt = writeBuildReceipt(root, before)
  writeFileSync(path.join(root, 'dist/app.js'), 'console.log(43)')
  assert.notDeepEqual(receipt.files, productionFiles(path.join(root, 'dist')))
  assert.throws(() => verifyBuildReceipt(root), /构建内容已发生变化/u)
  writeFileSync(path.join(root, 'dist/app.js'), 'console.log(42)')
  writeFileSync(path.join(root, 'app.js'), 'export const answer = 43\n')
  assert.notDeepEqual(sourceSnapshot(root), before)
  assert.throws(() => verifyBuildReceipt(root), /构建与当前源码不一致/u)
  assert.throws(() => writeBuildReceipt(root, before), /源码发生变化/u)
  rmSync(path.join(root, 'dist/.vite/manifest.json'))
  assert.throws(() => productionFiles(path.join(root, 'dist')), /manifest/u)
})

test('真实 preview 在创建报告目录前验证生产构建收据', () => {
  const source = readFileSync(path.resolve('playwright.real.config.ts'), 'utf8')
  const environment = source.indexOf('validateRealBrowserEnvironment()')
  const verify = source.indexOf("if (serverMode === 'preview' && !externalBaseUrl)")
  const selection = source.indexOf('realTestSelection(')
  const directory = source.indexOf('mkdirSync(directory')
  assert.ok(environment >= 0 && environment < verify)
  assert.ok(verify < selection && selection < directory)
  assert.match(source.slice(verify, selection), /verifyBuildReceipt\(/u)
})
