import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSchemaDomainDocuments,
  renderSchemaIndex,
  schemaDomainForPath,
  validateSchemaDomainDocuments,
} from '../openapi-schema-domains.mjs'

const apiPrefix = '/api/v1'

function operation(schema) {
  return {
    get: {
      operationId: `get_${schema.toLowerCase()}`,
      responses: {
        200: {
          description: 'ok',
          content: {
            'application/json': { schema: { $ref: `#/components/schemas/${schema}` } },
          },
        },
      },
    },
  }
}

function document() {
  return {
    openapi: '3.1.0',
    info: { title: 'test', version: '1' },
    paths: {
      '/api/v1/auth/login': operation('Login'),
      '/api/v1/system/users': operation('User'),
      '/livez': operation('Health'),
    },
    components: {
      schemas: {
        Login: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
        User: { type: 'object', properties: { id: { type: 'integer' } } },
        Health: { type: 'string' },
        Unused: { type: 'string' },
      },
    },
  }
}

test('按路径领域分组、闭合依赖并保留直接使用的兼容 schema', () => {
  const source = document()
  const domains = createSchemaDomainDocuments(source, apiPrefix)
  assert.deepEqual(Object.keys(domains.get('core').paths), ['/api/v1/auth/login', '/livez'])
  assert.deepEqual(Object.keys(domains.get('system').paths), ['/api/v1/system/users'])
  assert.deepEqual(Object.keys(domains.get('core').components.schemas), [
    'Health',
    'Login',
    'Unused',
    'User',
  ])
  assert.deepEqual(Object.keys(domains.get('system').components.schemas), ['User'])
  validateSchemaDomainDocuments(source, domains)
})

test('未知或基础设施路径进入 core，正式领域保持稳定', () => {
  assert.equal(schemaDomainForPath('/api/v1/platform/tenants', apiPrefix), 'platform')
  assert.equal(schemaDomainForPath('/api/v1/profile', apiPrefix), 'core')
  assert.equal(schemaDomainForPath('/readyz', apiPrefix), 'core')
})

test('统一索引只合并 operations 和 components.schemas', () => {
  const index = renderSchemaIndex('/* generated */\n')
  assert.match(index, /export type operations/u)
  assert.match(index, /coreOperations/u)
  assert.match(index, /systemComponents\['schemas'\]/u)
})
