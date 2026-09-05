import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  productionFiles,
  receiptPath,
  sourceSnapshot,
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
  assert.throws(() => writeBuildReceipt(root, candidate), /EEXIST/u)
})

test('重新构建、缺少 manifest 与源码中途变动可被识别', (t) => {
  const root = fixture(t)
  const before = sourceSnapshot(root)
  const receipt = writeBuildReceipt(root, before)
  writeFileSync(path.join(root, 'dist/app.js'), 'console.log(43)')
  assert.notDeepEqual(receipt.files, productionFiles(path.join(root, 'dist')))
  writeFileSync(path.join(root, 'app.js'), 'export const answer = 43\n')
  assert.notDeepEqual(sourceSnapshot(root), before)
  assert.throws(() => writeBuildReceipt(root, before), /源码发生变化/u)
  rmSync(path.join(root, 'dist/.vite/manifest.json'))
  assert.throws(() => productionFiles(path.join(root, 'dist')), /manifest/u)
})
