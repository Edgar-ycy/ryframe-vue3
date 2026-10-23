import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { runHomepage, validateHomepageInput } from '../devex-homepage.mjs'
import { fixture, identity, root, runCli, serverFixture } from './devex-homepage-fixture.mjs'

test('精确校验输入、身份独立性、收据与 runner 指纹，前后像均拒绝漂移', (t) => {
  const input = fixture(t)
  const verify = validateHomepageInput(input)
  verify()
  for (const mutate of [
    (value) => {
      value.extra = 'unused'
    },
    (value) => {
      value.frontend_url = 'http://example.com:4678'
    },
    (value) => {
      value.frontend_url += '/index'
    },
    (value) => {
      value.frontend_url = 'http://private:secret@127.0.0.1:4678'
    },
    (value) => {
      value.timeout_ms = 0
    },
    (value) => {
      value.visitor_interval_ms = -1
    },
    (value) => {
      value.runner_frontend_fingerprint = `sha256:${'0'.repeat(64)}`
    },
    (value) => {
      value.identities[0].password_env = 'OBSOLETE'
    },
    (value) => {
      value.identities[0].client_address = '198.18.0.2'
    },
    (value) => {
      value.artifacts = '../relative'
    },
  ]) {
    const value = structuredClone(input)
    mutate(value)
    assert.throws(() => validateHomepageInput(value))
  }
  fs.appendFileSync(path.join(input.artifacts, 'identity-selection.json'), '\n')
  assert.throws(verify, /homepage_binding_changed/u)
})

test('拒绝重复身份或客户地址及非普通收据路径', (t) => {
  const input = fixture(t)
  input.identities.push({ ...identity })
  const file = path.join(input.artifacts, 'identity-selection.json')
  const receipt = JSON.parse(fs.readFileSync(file))
  receipt.selections[0].count = 2
  receipt.selections[0].tenant_distribution.system = 2
  receipt.selections[0].slots.push({ ...receipt.selections[0].slots[0], user_slot: 'visitor-two' })
  fs.writeFileSync(file, JSON.stringify(receipt))
  assert.throws(() => validateHomepageInput(input), /homepage_identity_duplicate/u)
  fs.unlinkSync(file)
  fs.mkdirSync(file)
  assert.throws(() => validateHomepageInput(input), /homepage_selection_path/u)
})

test('CLI 拒绝额外入口且不回显 stdin 凭据，stdout 不混入日志', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/devex-homepage.mjs', '--password=secret-marker'],
    {
      cwd: root,
      input: JSON.stringify({ password: 'private-fixture-password' }),
      encoding: 'utf8',
      windowsHide: true,
    },
  )
  assert.equal(result.status, 1)
  assert.equal(result.stdout, '')
  assert.match(result.stderr, /homepage_stdin_only/u)
  assert.doesNotMatch(result.stderr, /secret-marker|private-fixture-password/u)
})

test(
  '独立真实浏览器测量冷暖缓存与客户地址；暖缓存确实复用 HTTP 资源',
  { timeout: 60_000 },
  async (t) => {
    const server = await serverFixture(t)
    const input = fixture(t, server.url)
    for (const cache of ['cold', 'warm']) {
      server.seen.static = 0
      const result =
        cache === 'warm'
          ? await runCli({ ...input, cache })
          : await runHomepage({ ...input, cache })
      const [row] = result.cycles
      assert.equal(row.succeeded, true, JSON.stringify(row))
      assert.equal(row.phase, 'measuring')
      assert.equal(row.session_failure, false)
      assert.deepEqual(row.diagnostics, [])
      assert.ok(row.preparation_requests > 0 && row.measured_requests > 0)
      assert.ok(Object.values(row.times).every((value) => Number.isFinite(value) && value > 0))
      assert.ok(row.duration_ms >= row.preparation_duration_ms)
      assert.ok(result.elapsed_ms >= row.duration_ms)
      assert.equal(server.seen.static, cache === 'cold' ? 2 : 1)
    }
    assert.deepEqual([...server.seen.addresses], [identity.client_address])
  },
)

test('登录身份不符保留 login 阶段且不会泄露凭据', { timeout: 30_000 }, async (t) => {
  const server = await serverFixture(t, { wrongIdentity: true })
  const result = await runHomepage(fixture(t, server.url))
  const [row] = result.cycles
  assert.equal(row.succeeded, false)
  assert.equal(row.phase, 'login')
  assert.equal(row.session_failure, true)
  assert.equal(row.failure, 'network_or_binding')
  assert.ok(row.diagnostics.includes('homepage_session_binding'))
  assert.doesNotMatch(JSON.stringify(result), /private-fixture-password/u)
})

test('测量阶段浏览器异常仅输出固定诊断且不产生成功项', { timeout: 30_000 }, async (t) => {
  const server = await serverFixture(t, { pageError: true })
  const result = await runHomepage(fixture(t, server.url))
  const [row] = result.cycles
  assert.equal(row.succeeded, false)
  assert.equal(row.session_failure, false)
  assert.equal(row.phase, 'measuring')
  assert.ok(row.diagnostics.includes('homepage_page_error'))
  assert.doesNotMatch(JSON.stringify(result), /private-fixture-password/u)
})

test('阻止隔离原点之外的请求并保留网络失败诊断', { timeout: 30_000 }, async (t) => {
  const trap = await serverFixture(t)
  const server = await serverFixture(t, { outside: `${trap.url}/not-allowed` })
  const [row] = (await runHomepage(fixture(t, server.url))).cycles
  assert.equal(row.succeeded, false)
  assert.equal(row.failure, 'network_or_binding')
  assert.equal(row.phase, 'measuring')
  assert.ok(row.diagnostics.includes('homepage_network_origin'))
  assert.equal(trap.seen.addresses.size, 0)
})

test('测量期间刷新为同名异租户会话时拒绝发布成功', { timeout: 30_000 }, async (t) => {
  const server = await serverFixture(t, { refreshWrong: true })
  const [row] = (await runHomepage(fixture(t, server.url))).cycles
  assert.equal(row.succeeded, false)
  assert.equal(row.phase, 'measuring')
  assert.equal(row.session_failure, false)
  assert.equal(row.failure, 'network_or_binding')
  assert.ok(row.diagnostics.includes('homepage_session_binding'))
})

test('超时保留预热和测量阶段，不误计登录失败', { timeout: 60_000 }, async (t) => {
  const server = await serverFixture(t, { hangIndex: 1 })
  const input = fixture(t, server.url)
  for (const cache of ['cold', 'warm']) {
    server.seen.index = 0
    const [row] = (await runHomepage({ ...input, cache })).cycles
    assert.equal(row.succeeded, false)
    assert.equal(row.phase, cache === 'warm' ? 'warming' : 'measuring')
    assert.equal(row.session_failure, false)
    assert.equal(row.failure, 'timeout')
    assert.ok(row.diagnostics.includes('homepage_timeout'))
  }
})
