import assert from 'node:assert/strict'
import test from 'node:test'
import { createPackageManagerInvocation } from '../fast-check-contract.mjs'

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

test('Windows 直接执行时通过 ComSpec 调用 pnpm', () => {
  assert.deepEqual(
    createPackageManagerInvocation('lint', {
      comSpec: 'C:\\Windows\\System32\\cmd.exe',
      npmExecPath: '',
      platform: 'win32',
    }),
    {
      args: ['/d', '/s', '/c', 'pnpm run lint'],
      command: 'C:\\Windows\\System32\\cmd.exe',
    },
  )
})

test('POSIX 直接执行时调用 pnpm 可执行文件', () => {
  assert.deepEqual(
    createPackageManagerInvocation('test:unit', {
      npmExecPath: '',
      platform: 'linux',
    }),
    {
      args: ['run', 'test:unit'],
      command: 'pnpm',
    },
  )
})

test('拒绝把任意命令文本传入 Windows 命令解释器', () => {
  assert.throws(
    () => createPackageManagerInvocation('lint & whoami', { npmExecPath: '', platform: 'win32' }),
    /非法的包脚本名称/,
  )
})
