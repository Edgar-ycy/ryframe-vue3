import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import {
  createPackageBinaryInvocation,
  createPackageManagerInvocation,
} from './fast-check-contract.mjs'

const cacheRoot = process.env.RYFRAME_FAST_CHECK_CACHE_ROOT
const tasks = [
  ['格式', 'format:check:fast'],
  ['源码规模', 'check:source-size'],
  ['导入边界', 'check:imports'],
  ['operation 使用', 'check:api-operations'],
  ['API 生成资产', 'check:api-artifacts'],
  ['ESLint', 'lint'],
  ['Stylelint', 'lint:styles'],
  ['应用类型', 'typecheck:app'],
  ['单元测试', 'test:unit'],
]

if (cacheRoot) {
  tasks[0] = [
    '格式',
    'format:check:fast',
    [
      'prettier',
      [
        '--check',
        '.',
        '--cache',
        '--cache-location',
        `${cacheRoot}/prettier/cache`,
        '--cache-strategy',
        'content',
      ],
    ],
  ]
  tasks[5] = [
    'ESLint',
    'lint',
    [
      'eslint',
      ['.', '--max-warnings=0', '--cache', '--cache-location', `${cacheRoot}/eslint/cache`],
    ],
  ]
  tasks[6] = [
    'Stylelint',
    'lint:styles',
    [
      'stylelint',
      [
        'src/**/*.{css,scss,vue}',
        '--max-warnings=0',
        '--cache',
        '--cache-location',
        `${cacheRoot}/stylelint/cache`,
      ],
    ],
  ]
}

function runTask([name, script, binary]) {
  const startedAt = performance.now()
  return new Promise((resolve) => {
    const invocation = binary
      ? createPackageBinaryInvocation(binary[0], binary[1])
      : createPackageManagerInvocation(script)
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
