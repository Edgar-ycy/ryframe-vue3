import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { requestCredentials } from '../browser-credential-client.mjs'

function transport(status, body) {
  return (_url, options, callback) => {
    assert.equal(options.headers.accept, 'application/json')
    const response = new EventEmitter()
    response.statusCode = status
    response.setEncoding = () => undefined
    const request = new EventEmitter()
    request.setTimeout = () => undefined
    request.destroy = (error) => request.emit('error', error)
    queueMicrotask(() => {
      callback(response)
      response.emit('data', body)
      response.emit('end')
    })
    return request
  }
}

test('凭据客户端只读取回环代理的有界密码对象', async () => {
  assert.deepEqual(
    await requestCredentials(
      'http://127.0.0.1:49152/v1/credentials',
      transport(200, '{"password":"PRIVATE-SENTINEL"}'),
    ),
    { password: 'PRIVATE-SENTINEL' },
  )
})

test('凭据客户端拒绝远端、错误路径、失败状态和无效响应', async () => {
  for (const endpoint of [
    'https://127.0.0.1:443/v1/credentials',
    'http://example.test:80/v1/credentials',
    'http://127.0.0.1:8080/other',
  ]) {
    assert.throws(() => requestCredentials(endpoint), /地址无效/u)
  }
  await assert.rejects(
    requestCredentials(
      'http://127.0.0.1:49152/v1/credentials',
      transport(503, '{"password":"PRIVATE-SENTINEL"}'),
    ),
    /拒绝请求/u,
  )
  await assert.rejects(
    requestCredentials('http://127.0.0.1:49152/v1/credentials', transport(200, '{"password":""}')),
    /响应无效/u,
  )
})
