import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createPackageManagerInvocation } from '../fast-check-contract.mjs'

test('快速格式检查复用内容缓存且完整检查保持无缓存', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url)))
  const runner = await readFile(new URL('../run-fast-checks.mjs', import.meta.url), 'utf8')

  assert.equal(packageJson.scripts['format:check'], 'prettier --check .')
  assert.match(
    packageJson.scripts['format:check:fast'],
    /--cache-location \.local-tests\/prettier\/cache --cache-strategy content/u,
  )
  assert.match(runner, /\['格式', 'format:check:fast'\]/u)
})

test('优先复用当前包管理器入口，避免 Windows cmd 包装器', () => {
  assert.deepEqual(
    createPackageManagerInvocation('check:source-size', {
      execPath: 'C:\\node.exe',
      npmExecPath: 'D:\\pnpm\\pnpm.mjs',
      platform: 'win32',
    }),
    {
      args: ['D:\\pnpm\\pnpm.mjs', 'run', 'check:source-size'],
      command: 'C:\\node.exe',
    },
  )
})

test('Windows 直接执行时通过 ComSpec 调用 Corepack 固定 pnpm', () => {
  assert.deepEqual(
    createPackageManagerInvocation('lint', {
      comSpec: 'C:\\Windows\\System32\\cmd.exe',
      npmExecPath: '',
      platform: 'win32',
    }),
    {
      args: ['/d', '/s', '/c', 'corepack pnpm run lint'],
      command: 'C:\\Windows\\System32\\cmd.exe',
    },
  )
})

test('POSIX 直接执行时通过 Corepack 调用 pnpm', () => {
  assert.deepEqual(
    createPackageManagerInvocation('test:unit', {
      npmExecPath: '',
      platform: 'linux',
    }),
    {
      args: ['pnpm', 'run', 'test:unit'],
      command: 'corepack',
    },
  )
})

test('拒绝把任意命令文本传入 Windows 命令解释器', () => {
  assert.throws(
    () => createPackageManagerInvocation('lint & whoami', { npmExecPath: '', platform: 'win32' }),
    /非法的包脚本名称/,
  )
})
