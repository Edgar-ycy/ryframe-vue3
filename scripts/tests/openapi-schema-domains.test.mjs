import assert from 'node:assert/strict'
import test from 'node:test'
import { createSchemaDomainDocuments, schemaDomainForPath } from '../openapi-schema-domains.mjs'

test('业务接口与引用模型进入延迟加载的 system 分片，认证正文保留在 core', () => {
  const business = '/api/v1/business/order/order'
  const authentication = '/api/v1/auth/login'
  const response = (name) => ({
    responses: {
      200: {
        content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } },
      },
    },
  })
  const domains = createSchemaDomainDocuments(
    {
      openapi: '3.1.0',
      info: { title: '测试', version: '1' },
      paths: {
        [business]: { get: response('Order') },
        [authentication]: { post: response('Session') },
      },
      components: { schemas: { Order: { type: 'object' }, Session: { type: 'object' } } },
    },
    '/api/v1',
  )
  assert.equal(schemaDomainForPath(business, '/api/v1'), 'system')
  assert.ok(domains.get('system').paths[business])
  assert.ok(domains.get('system').components.schemas.Order)
  assert.equal(domains.get('core').paths[business], undefined)
  assert.equal(domains.get('core').components.schemas.Order, undefined)
  assert.ok(domains.get('core').paths[authentication])
})
