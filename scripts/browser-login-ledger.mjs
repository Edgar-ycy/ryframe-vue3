import { mkdir, open, readFile, rename, unlink, lstat } from 'node:fs/promises'
import { dirname, isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'
import { emptyLedger, validateLedger } from './browser-login-budget-model.mjs'

const maximumBytes = 256 * 1024

async function acquire(path) {
  const deadline = Date.now() + 10_000
  while (true) {
    try {
      return await open(path, 'wx', 0o600)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      if (Date.now() >= deadline) {
        throw new Error('登录预算文件锁持续占用，请核验对应测试进程；不会强抢锁')
      }
      await setTimeout(50)
    }
  }
}

async function readLedger(path, binding, now) {
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) {
      throw new Error('登录预算必须是有限大小的普通账本文件')
    }
    const state = JSON.parse(await readFile(path, 'utf8'))
    validateLedger(state, binding, now)
    return state
  } catch (error) {
    if (error.code === 'ENOENT') return emptyLedger(binding, now)
    throw error
  }
}

async function writeLedger(path, state) {
  const value = `${JSON.stringify(state)}\n`
  if (Buffer.byteLength(value) > maximumBytes) throw new Error('登录预算账本超过大小上限')
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    const file = await open(temporary, 'wx', 0o600)
    try {
      await file.writeFile(value)
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    })
  }
}

export async function updateLedger(path, binding, now, update) {
  if (!isAbsolute(path)) throw new Error('RYFRAME_E2E_LOGIN_BUDGET_STATE 必须是绝对文件路径')
  await mkdir(dirname(path), { recursive: true })
  const lockPath = `${path}.lock`
  const lock = await acquire(lockPath)
  try {
    const current = now()
    const state = await readLedger(path, binding, current)
    const result = update(state, current)
    await writeLedger(path, state)
    return result
  } finally {
    await lock.close()
    await unlink(lockPath)
  }
}
