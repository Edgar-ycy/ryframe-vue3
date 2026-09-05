import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequestBudget } from '../browser-request-budget.mjs'

function fixture(capacity = 4) {
  let current = 0
  let onSleep = () => {}
  const budget = createRequestBudget({
    capacity,
    windowMs: 10_000,
    now: () => current,
    sleep: async (delay) => {
      current += delay
      onSleep()
    },
  })
  return {
    budget,
    now: () => current,
    advance: (amount) => {
      current += amount
    },
    onSleep: (callback) => {
      onSleep = callback
    },
  }
}

test('预算充足时无需等待，释放实际旧请求窗口后才开始新阶段', async () => {
  const clock = fixture()
  clock.budget.record()
  await clock.budget.waitForAvailable(3)
  assert.equal(clock.now(), 0)
  clock.advance(2000)
  clock.budget.record()
  await clock.budget.waitForAvailable(3)
  assert.equal(clock.now(), 10_250)
})

test('等待期间后台请求同样计入预算，不能提前恢复', async () => {
  const clock = fixture(2)
  clock.budget.record()
  clock.onSleep(() => {
    if (clock.now() === 1000) clock.budget.record()
  })
  await clock.budget.waitForAvailable(2)
  assert.equal(clock.now(), 11_250)
})

test('持续后台流量阻止安全开始时明确失败，不能无限等待', async () => {
  const clock = fixture(2)
  clock.budget.record()
  clock.onSleep(() => clock.budget.record())
  await assert.rejects(clock.budget.waitForAvailable(2), /不能安全开始/u)
})

test('拒绝缺失或失真的配置与不可能的阶段预算', async () => {
  for (const capacity of [NaN, 0, -1, 1.2]) {
    assert.throws(() => createRequestBudget({ capacity, windowMs: 1000, sleep: async () => {} }))
  }
  await assert.rejects(fixture().budget.waitForAvailable(5), /容量内/u)
})
