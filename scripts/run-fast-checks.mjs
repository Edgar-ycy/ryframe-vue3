import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { createPackageManagerInvocation } from './fast-check-contract.mjs'

const tasks = [
  ['格式', 'format:check:fast'],
  ['源码规模', 'check:source-size'],
  ['导入边界', 'check:imports'],
  ['ESLint', 'lint'],
  ['Stylelint', 'lint:styles'],
  ['应用类型', 'typecheck:app'],
  ['单元测试', 'test:unit'],
]

function runTask([name, script]) {
  const startedAt = performance.now()
  return new Promise((resolve) => {
    const invocation = createPackageManagerInvocation(script)
    const child = spawn(invocation.command, invocation.args, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      shell: false,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => resolve({ error, name, script, stderr, stdout }))
    child.on('close', (code) =>
      resolve({
        code: code ?? 1,
        elapsed: performance.now() - startedAt,
        name,
        script,
        stderr,
        stdout,
      }),
    )
  })
}

const results = await Promise.all(tasks.map(runTask))
for (const result of results) {
  const succeeded = !result.error && result.code === 0
  console.log(
    `${succeeded ? '通过' : '失败'} ${result.name} (${Math.round(result.elapsed ?? 0)} ms)`,
  )
  if (!succeeded) {
    const output = `${result.stdout}${result.stderr}`.trim()
    if (output) console.error(output)
    if (result.error) console.error(result.error.message)
  }
}

if (results.some((result) => result.error || result.code !== 0)) process.exitCode = 1
