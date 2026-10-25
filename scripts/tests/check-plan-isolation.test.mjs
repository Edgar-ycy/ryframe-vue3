import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const source = String.raw`
import fs from 'node:fs'
import promises from 'node:fs/promises'
import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
const { parseArguments, runCheck } = await import(process.argv[1])
const forbidden = () => { throw new Error('plan 禁止输入读取、写入或派生进程') }
for (const name of [
  'readFileSync', 'writeFileSync', 'lstatSync', 'realpathSync', 'mkdirSync',
  'openSync', 'renameSync', 'existsSync', 'readdirSync', 'statSync',
  'readFile', 'writeFile', 'open', 'mkdir', 'access',
]) fs[name] = forbidden
for (const name of ['readFile', 'writeFile', 'open', 'mkdir', 'access', 'stat', 'lstat']) {
  promises[name] = forbidden
}
for (const name of ['execFileSync', 'spawnSync', 'spawn', 'exec']) childProcess[name] = forbidden
syncBuiltinESMExports()
await runCheck(parseArguments(JSON.parse(process.argv[2])))
`

test('普通与 ctx contract/full 的 plan 只输出真实任务图，不读输入、不落盘、不派生进程', () => {
  for (const stage of ['contract', 'full', 'unit', 'browser']) {
    for (const consumer of [false, true]) {
      if (consumer && ['unit', 'browser'].includes(stage)) continue
      const args = [
        stage === 'full' ? '--full' : '--stage',
        ...(stage === 'full' ? [] : [stage]),
        '--plan',
      ]
      if (consumer) args.push('--consumer-context', 'missing-secret-context.json')
      const result = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          source,
          new URL('../check.mjs', import.meta.url).href,
          JSON.stringify(args),
        ],
        { encoding: 'utf8', windowsHide: true },
      )
      assert.equal(result.status, 0, result.stderr)
      const plan = JSON.parse(result.stdout)
      assert.equal(plan.stage, stage)
      assert.equal(
        plan.tasks.some((task) => task.name === 'consumer-proof'),
        consumer,
      )
      if (consumer) assert.equal(plan.tasks[1].name, 'consumer-proof')
    }
  }
})
