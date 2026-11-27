import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { devexFastTasks, parseDevexFastArguments } from '../devex-fast.mjs'

const root = path.resolve('devex-plan-input')
const cacheRoot = path.join(root, '.local-tests', 'profile')
const legacyEntry = 'scripts/check-import-boundaries.mjs'
const currentEntry = 'scripts/check-import-boundaries.ts'
const logicalTasks = [
  'format',
  'source-size',
  'imports',
  'api-operation-policy',
  'api-artifacts',
  'eslint',
  'stylelint',
  'typecheck-app',
  'unit',
]

function measurementRepository(t) {
  const parent = realpathSync(tmpdir())
  const root = mkdtempSync(path.join(parent, 'ryframe-devex-fast-'))
  t.after(() => {
    assert.equal(path.dirname(realpathSync(root)), parent)
    rmSync(root, { recursive: true, force: true })
  })
  const git = (...args) =>
    execFileSync('git', ['-c', 'commit.gpgSign=false', '-c', 'core.autocrlf=false', ...args], {
      cwd: root,
      windowsHide: true,
      stdio: 'pipe',
    })
  git('init', '--quiet')
  git('config', '--local', 'user.name', 'DevEx plan fixture')
  git('config', '--local', 'user.email', 'devex-plan@example.invalid')
  mkdirSync(path.join(root, 'scripts'))
  const writeEntry = (file) => writeFileSync(path.join(root, file), 'export {}\n')
  const commit = () => {
    git('add', '--all')
    git('commit', '--quiet', '-m', 'DevEx plan fixture')
  }
  return { commit, git, root, writeEntry }
}

test('两侧计划覆盖同一九项，当前导入检查同时覆盖 operation 规则', (t) => {
  const repo = measurementRepository(t)
  const root = repo.root
  const cacheRoot = path.join(root, '.local-tests', 'profile')
  repo.writeEntry(legacyEntry)
  repo.commit()
  const baseline = devexFastTasks({ root, arm: 'b0', cacheRoot })
  const frozenCandidate = devexFastTasks({ root, arm: 'b1', cacheRoot })
  assert.deepEqual(baseline.find((task) => task.id === 'imports').node, [legacyEntry])
  assert.deepEqual(frozenCandidate.find((task) => task.id === 'imports').node, [legacyEntry])
  repo.git('mv', legacyEntry, currentEntry)
  repo.commit()
  const candidate = devexFastTasks({ root, arm: 'b1', cacheRoot })
  assert.deepEqual(candidate.find((task) => task.id === 'imports').node, [currentEntry])
  assert.deepEqual(candidate.find((task) => task.id === 'imports').covers, [
    'imports',
    'api-operation-policy',
  ])
  assert.throws(() => devexFastTasks({ root, arm: 'b0', cacheRoot }), /B0 须使用原导入检查入口/u)
  assert.equal(baseline.length, 9)
  assert.equal(candidate.length, 8)
  for (const tasks of [baseline, candidate]) {
    assert.deepEqual(
      tasks.flatMap((task) => task.covers),
      logicalTasks,
    )
    assert.deepEqual(tasks.find((task) => task.id === 'stylelint').pnpm, [
      'exec',
      'stylelint',
      'src/**/*.{css,scss,vue}',
      '--max-warnings=0',
      '--cache',
      '--cache-location',
      path.join(cacheRoot, 'stylelint', 'cache'),
    ])
  }
  assert.deepEqual(
    baseline.find((task) => task.id === 'source-size'),
    candidate.find((task) => task.id === 'source-size'),
  )
  assert.deepEqual(baseline.find((task) => task.id === 'api-operation-policy').node, [
    'scripts/check-api-operation-usage.mjs',
  ])
})

test('计划拒绝缺失、存在两份或与 Git HEAD 不同的检查入口', (t) => {
  const repo = measurementRepository(t)
  const plan = () =>
    devexFastTasks({
      root: repo.root,
      arm: 'b1',
      cacheRoot: path.join(repo.root, '.local-tests', 'profile'),
    })
  // 只有没提交的 TypeScript 文件时，不能从工作树推断使用新入口。
  writeFileSync(path.join(repo.root, 'README.md'), '# Fixture\n')
  repo.commit()
  repo.writeEntry(currentEntry)
  assert.throws(plan, /Git HEAD 须登记唯一/u)
  repo.commit()
  writeFileSync(path.join(repo.root, currentEntry), 'export const changed = true\n')
  assert.throws(plan, /与 Git HEAD 不一致/u)
  repo.writeEntry(currentEntry)
  repo.writeEntry(legacyEntry)
  assert.throws(plan, /与 Git HEAD 不一致/u)
  repo.commit()
  assert.throws(plan, /Git HEAD 须登记唯一/u)
})

test('计划参数可复用，拒绝重复选项及测量工作树之外的缓存', () => {
  const args = ['--root', root, '--arm', 'b0', '--cache-root', cacheRoot, '--plan']
  assert.equal(parseDevexFastArguments(args).plan, true)
  assert.throws(() => parseDevexFastArguments([...args, '--arm', 'b1']), /重复/)
  assert.throws(
    () => parseDevexFastArguments(['--root', root, '--arm', 'b0', '--cache-root', root]),
    /缓存目录/,
  )
})
