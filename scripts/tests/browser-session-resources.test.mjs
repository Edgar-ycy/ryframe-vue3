import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionResources } from '../browser-session-resources.mjs'

async function fixture() {
  const receipts = []
  const resources = await createSessionResources({
    scopeId: 'session-unit',
    testId: 'scope/test-1',
    tenantId: 'system',
    save: async (receipt) => receipts.push(receipt),
  })
  const create = (kind, id) =>
    resources.create(kind, `${kind}-${id}`, async () => ({ status: 200, id }))
  return { resources, receipts, create }
}

test('只清理本次响应登记ID，全部用户先于角色且收据不含响应内容', async () => {
  const { resources, receipts, create } = await fixture()
  await create('role', '9')
  await create('user', '10')
  await create('user', '11')
  const deleted = []
  await resources.cleanup(async (entry) => {
    deleted.push(entry)
    return { status: 200 }
  })
  assert.deepEqual(deleted, [
    { kind: 'user', name: 'user-10', id: '10' },
    { kind: 'user', name: 'user-11', id: '11' },
    { kind: 'role', name: 'role-9', id: '9' },
  ])
  assert.equal(receipts.at(-1).status, 'cleaned')
  assert.ok(receipts.at(-1).resources.every((entry) => entry.phase === 'deleted'))
  await assert.rejects(
    resources.cleanup(async () => {
      throw new Error('不应重试')
    }),
    /重复/u,
  )
})

test('准备中途明确拒绝仍清理此前创建ID，原创建失败继续传播', async () => {
  const { resources, create } = await fixture()
  await create('role', '9')
  await create('user', '10')
  await assert.rejects(
    resources.create('user', 'rejected', async () => ({ status: 400 })),
    /HTTP 400/u,
  )
  const deleted = []
  await resources.cleanup(async ({ id }) => {
    deleted.push(id)
    return { status: 200 }
  })
  assert.deepEqual(deleted, ['10', '9'])
  assert.equal(resources.snapshot().status, 'cleaned')
})

test('未知用户提交禁止猜测ID或删除其角色，但仍清理其他明确用户', async () => {
  const { resources, create } = await fixture()
  await create('role', '9')
  await create('user', '10')
  await assert.rejects(
    resources.create('user', 'unknown', async () => {
      throw new Error('secret-response-body')
    }),
  )
  const deleted = []
  await assert.rejects(
    resources.cleanup(async ({ id }) => {
      deleted.push(id)
      return { status: 200 }
    }),
    /未完整清理/u,
  )
  assert.deepEqual(deleted, ['10'])
  assert.equal(resources.snapshot().status, 'needs-reconciliation')
  assert.equal(resources.snapshot().resources[0].phase, 'cleanup-blocked')
  assert.ok(!JSON.stringify(resources.snapshot()).includes('secret-response-body'))
})

test('删除失败显式失败且保留ID，不重试，不删除仍关联的角色', async () => {
  const { resources, create } = await fixture()
  await create('role', '9')
  await create('user', '10')
  await create('user', '11')
  const deleted = []
  await assert.rejects(
    resources.cleanup(async ({ id }) => {
      deleted.push(id)
      return { status: id === '10' ? 503 : 200 }
    }),
    /未完整清理/u,
  )
  assert.deepEqual(deleted, ['10', '11'])
  assert.equal(resources.snapshot().status, 'cleanup-failed')
  assert.equal(resources.snapshot().resources.find((entry) => entry.id === '10').delete_status, 503)
})

test('其他准备步骤先失败时，teardown等待已发送创建返回并登记后再删除', async () => {
  const { resources } = await fixture()
  let resolve
  const created = resources.create(
    'role',
    'pending',
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const deleted = []
  const cleanup = resources.cleanup(async ({ id }) => {
    deleted.push(id)
    return { status: 200 }
  })
  await new Promise((done) => setImmediate(done))
  assert.deepEqual(deleted, [])
  resolve({ status: 200, id: '9' })
  await created
  await cleanup
  assert.deepEqual(deleted, ['9'])
})

test('服务端失败、非法ID和重复ID均保持未知状态，不能伪装已清理', async () => {
  for (const result of [
    { status: 500 },
    { status: NaN, id: '9' },
    { id: '9' },
    { status: 200, id: 9 },
    { status: 200, id: '0' },
    { status: 200, id: '9223372036854775808' },
  ]) {
    const { resources } = await fixture()
    await assert.rejects(resources.create('role', 'bad', async () => result))
    await assert.rejects(
      resources.cleanup(async () => {
        throw new Error('不可调用')
      }),
    )
    assert.equal(resources.snapshot().status, 'needs-reconciliation')
  }
  const { resources, create } = await fixture()
  await create('role', '9')
  await assert.rejects(resources.create('role', 'other', async () => ({ status: 200, id: '9' })))
  const ids = []
  await assert.rejects(
    resources.cleanup(async ({ id }) => {
      ids.push(id)
      return { status: 200 }
    }),
  )
  assert.deepEqual(ids, ['9'])
})

test('登记落盘失败不能发送创建请求', async () => {
  let writes = 0,
    requests = 0
  const resources = await createSessionResources({
    scopeId: 'session-unit',
    testId: 'test',
    tenantId: 'system',
    save: async () => {
      if (++writes > 1) throw new Error('storage failure')
    },
  })
  await assert.rejects(
    resources.create('user', 'blocked', async () => {
      requests++
      return { status: 200, id: '1' }
    }),
  )
  assert.equal(requests, 0)
})
