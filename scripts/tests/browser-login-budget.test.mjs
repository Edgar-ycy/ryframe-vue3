import assert from 'node:assert/strict'
import { execFile, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { createLoginBudget, fixedClientAddress } from '../browser-login-budget.mjs'

const identity = { tenantId: 'system', username: 'admin' }
const address = '198.18.1.2'

function fixture(t) {
  const base = resolve('.local-tests/node-unit')
  mkdirSync(base, { recursive: true })
  const directory = mkdtempSync(join(base, 'login-budget-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const statePath = join(directory, 'budget.json')
  let current = 1000
  const waits = []
  const options = {
    statePath,
    scope: 'login-test',
    capacity: 5,
    windowMs: 60_000,
    now: () => current,
    sleep: async (delay) => {
      waits.push(delay)
      current += delay
    },
  }
  const budget = createLoginBudget(options)
  const attempt = async (client = address, user = identity) => {
    const reservation = await budget.reserve(user, client)
    await budget.complete(reservation)
  }
  return {
    budget,
    attempt,
    options,
    statePath,
    waits,
    read: () => JSON.parse(readFileSync(statePath, 'utf8')),
    advance: (delay) => {
      current += delay
    },
  }
}

test('构造预算只校验来源且不创建账本，首次预约才写入状态', async (t) => {
  const value = fixture(t)
  assert.equal(existsSync(value.statePath), false)
  await value.attempt()
  assert.equal(existsSync(value.statePath), true)
})

test('第五次登录立即通过，第六次只在登录前等待完整已消费窗口', async (t) => {
  const value = fixture(t)
  for (let index = 0; index < 5; index += 1) await value.attempt()
  assert.deepEqual(value.waits, [])
  await value.attempt()
  assert.deepEqual(value.waits, [60_250])
  assert.equal(Object.keys(value.read().buckets).length, 2)
  assert.equal(readFileSync(value.statePath, 'utf8').includes('admin'), false)
})

test('收到响应后保守延长释放时间，失败尝试同样不退还预算', async (t) => {
  const value = fixture(t)
  for (let index = 0; index < 4; index += 1) await value.attempt()
  const pending = await value.budget.reserve(identity, address)
  value.advance(2000)
  await value.budget.complete(pending)
  await value.attempt()
  assert.deepEqual(value.waits, [60_250])
})

test('身份归一化后的 principal 跨客户共享预算；同 IP 换用户也共享预算', async (t) => {
  const value = fixture(t)
  for (let index = 0; index < 5; index += 1) {
    await value.attempt(`198.18.1.${index}`, { tenantId: 'system', username: ' ADMIN ' })
  }
  await value.attempt('198.18.2.1')
  assert.deepEqual(value.waits, [60_250])
  for (let index = 0; index < 5; index += 1) {
    await value.attempt('198.18.3.1', { tenantId: 'other', username: `user-${index}` })
  }
  await value.attempt('198.18.3.1', { tenantId: 'other', username: 'next' })
  assert.deepEqual(value.waits, [60_250, 60_250])
})

test('多个进程并发预约经原子锁串行记账，不会丢失消费次数', async (t) => {
  const value = fixture(t)
  const module = new URL('../browser-login-budget.mjs', import.meta.url).href
  const source = `
    import { createLoginBudget } from ${JSON.stringify(module)}
    const budget = createLoginBudget({ statePath: process.argv[1], scope: 'login-test',
      capacity: 5, windowMs: 60000, now: () => 1000 })
    for (let index = 0; index < Number(process.argv[2]); index += 1) {
      await budget.reserve({ tenantId: 'system', username: 'admin' }, '198.18.1.2')
    }
  `
  await Promise.all(
    [2, 3].map((count) =>
      promisify(execFile)(
        process.execPath,
        ['--input-type=module', '-e', source, value.statePath, String(count)],
        { windowsHide: true },
      ),
    ),
  )
  assert.deepEqual(
    Object.values(value.read().buckets).map((bucket) => bucket.count),
    [5, 5],
  )
  await value.attempt()
  assert.deepEqual(value.waits, [60_250])
})

test('进程重启继承未完成预约，预约后退出只在窗口过去后释放预算', async (t) => {
  const value = fixture(t)
  const module = new URL('../browser-login-budget.mjs', import.meta.url).href
  const source = `
    import { createLoginBudget } from ${JSON.stringify(module)}
    const budget = createLoginBudget({ statePath: process.argv[1], scope: 'login-test',
      capacity: 5, windowMs: 60000, now: () => 1000 })
    for (let index = 0; index < 5; index += 1) {
      await budget.reserve({ tenantId: 'system', username: 'admin' }, '198.18.1.2')
    }
  `
  execFileSync(process.execPath, ['--input-type=module', '-e', source, value.statePath], {
    windowsHide: true,
  })
  assert.equal(Object.values(value.read().buckets)[0].completedAt, null)
  await value.attempt()
  assert.deepEqual(value.waits, [60_250])
})

test('dev 和 preview 使用同一 scope/场景派生客户，运行编号与重试不参与', () => {
  assert.equal(
    fixedClientAddress('same-scope', 'test-1'),
    fixedClientAddress('same-scope', 'test-1'),
  )
  assert.notEqual(
    fixedClientAddress('same-scope', 'test-1'),
    fixedClientAddress('same-scope', 'test-2'),
  )
  assert.throws(() => fixedClientAddress(undefined, 'test-1'), /scope/u)
})

test('账本拒绝 scope、容量和窗口来源变化，失败后保留原始状态', async (t) => {
  const value = fixture(t)
  await value.attempt()
  const original = readFileSync(value.statePath, 'utf8')
  for (const changed of [{ scope: 'another-scope' }, { capacity: 6 }, { windowMs: 61_000 }]) {
    await assert.rejects(
      createLoginBudget({ ...value.options, ...changed }).reserve(identity, address),
      /不一致/u,
    )
    assert.equal(readFileSync(value.statePath, 'utf8'), original)
  }
  assert.throws(() => createLoginBudget({ ...value.options, statePath: undefined }), /显式/u)
  assert.throws(() => createLoginBudget({ ...value.options, capacity: NaN }), /配置/u)
  assert.throws(() => createLoginBudget({ ...value.options, windowMs: 0 }), /配置/u)
})

test('无效完成凭据失败关闭且不改写已预约账本', async (t) => {
  const value = fixture(t)
  const reservation = await value.budget.reserve(identity, address)
  const original = readFileSync(value.statePath, 'utf8')
  await assert.rejects(
    value.budget.complete([
      { ...reservation[0], generation: '00000000-0000-0000-0000-000000000000' },
    ]),
    /超出已预约窗口/u,
  )
  assert.equal(readFileSync(value.statePath, 'utf8'), original)
})

test('损坏、未来时间与过大文件失败关闭，不能静默重置账本', async (t) => {
  const value = fixture(t)
  await value.attempt()
  const valid = value.read()
  for (const content of [
    '{',
    JSON.stringify({ ...valid, observedAt: 1001 }),
    JSON.stringify({ ...valid, buckets: { ...valid.buckets, invalid: {} } }),
    ' '.repeat(256 * 1024 + 1),
  ]) {
    writeFileSync(value.statePath, content)
    await assert.rejects(value.budget.reserve(identity, address))
    assert.equal(readFileSync(value.statePath, 'utf8'), content)
  }
})

test('已过期的身份条目从持久化状态移除，不无限累积', async (t) => {
  const value = fixture(t)
  await value.attempt()
  value.advance(60_250)
  await value.attempt('198.18.9.9', { tenantId: 'next', username: 'owner' })
  assert.equal(Object.keys(value.read().buckets).length, 2)
})
