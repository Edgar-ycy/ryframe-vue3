import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { buildTasks } from '../build.mjs'

const source = String.raw`
import fs from 'node:fs'
import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
const { parseBuildArguments, runBuild } = await import(process.argv[1])
const forbidden = () => { throw new Error('plan 禁止文件 IO、Git 或派生进程') }
for (const name of [
  'readFileSync', 'writeFileSync', 'lstatSync', 'realpathSync', 'mkdirSync',
  'openSync', 'renameSync', 'existsSync', 'readdirSync', 'statSync',
]) fs[name] = forbidden
for (const name of ['execFileSync', 'spawnSync', 'spawn', 'exec']) childProcess[name] = forbidden
syncBuiltinESMExports()
const result = runBuild('/must-not-be-read', parseBuildArguments(JSON.parse(process.argv[2])))
console.log(JSON.stringify(result))
`

test('默认与 formal SHA 的 plan 均不读取文件或 Git、不写 descriptor、不派生任务', () => {
  for (const sourceCommit of [undefined, 'a'.repeat(40)]) {
    const args = ['--real', '--plan']
    if (sourceCommit) args.push('--source-commit', sourceCommit)
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        source,
        new URL('../build.mjs', import.meta.url).href,
        JSON.stringify(args),
      ],
      {
        env: { ...process.env, APP_ENV: 'invalid-unread-selection' },
        encoding: 'utf8',
        windowsHide: true,
      },
    )
    assert.equal(result.status, 0, result.stderr)
    const plan = JSON.parse(result.stdout)
    assert.equal(plan.sourceCommit, sourceCommit ?? 'development')
    assert.equal(plan.receipt, true)
    assert.deepEqual(plan.tasks, buildTasks())
    assert.deepEqual(
      plan.tasks.map((task) => task.name),
      ['app-types', 'production-build'],
    )
  }
})
