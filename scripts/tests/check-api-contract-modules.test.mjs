import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { validateOpenApiExtensions } from '../api-contract/extensions.mjs'
import { collectOperationContractState } from '../api-contract/operations.mjs'
import { validatePaginationContracts } from '../api-contract/pagination.mjs'
import { createLocalReferenceResolver } from '../api-contract/references.mjs'
import { validatePageRegistryContract } from '../api-contract/registry.mjs'
import { validateSchemaContracts } from '../api-contract/schema.mjs'
import { requireCrudResourceCatalog } from '../crud-resource-contract.mjs'

const root = new URL('../../', import.meta.url)

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'))
}

test('拆分后的 OpenAPI 契约模块保持正式文档一致', async () => {
  const [document, generatedApiPrefix, generatedNoticePolicy, generatedPasswordPolicy] =
    await Promise.all([
      readJson('openapi/openapi.json'),
      readJson('src/shared/config/apiPrefix.generated.json'),
      readJson('src/shared/markdown/noticePolicy.generated.json'),
      readJson('src/shared/security/passwordPolicy.generated.json'),
    ])
  const errors = []
  const { contractRoutes, featureRegistry } = await validatePageRegistryContract({
    document,
    errors,
    featuresPath: new URL('src/features/', root),
  })
  validateOpenApiExtensions({
    document,
    errors,
    featureRegistry,
    generatedApiPrefix,
    generatedNoticePolicy,
    generatedPasswordPolicy,
  })
  const operationState = collectOperationContractState(document, errors)
  const resolveLocalReference = createLocalReferenceResolver(document, errors)
  const crudResources = requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document)
  validatePaginationContracts({
    ...operationState,
    crudResources,
    document,
    errors,
    resolveLocalReference,
  })
  validateSchemaContracts({ ...operationState, errors, resolveLocalReference })

  assert.deepEqual(errors, [])
  assert.equal(contractRoutes.size, 29)
  assert.equal(operationState.operationCount, 191)
  assert.equal(
    document.paths['/api/v1/common/shell-settings'].get.operationId,
    'get_common_shell_settings',
  )
})

test('生成资源的列表操作遵循分页契约而不需要手工 C1 条目', async () => {
  const document = await readJson('openapi/openapi.json')
  document.paths['/api/v1/system/devices'] = {
    get: {
      operationId: 'get_system_devices',
      parameters: [
        { in: 'query', name: 'page', required: false, schema: { minimum: 1, type: 'integer' } },
        {
          in: 'query',
          name: 'page_size',
          required: false,
          schema: { minimum: 1, type: 'integer' },
        },
      ],
      responses: { 200: { content: { 'application/json': { schema: { type: 'object' } } } } },
    },
  }
  const errors = []
  const operationState = collectOperationContractState(document, errors)
  const resolveLocalReference = createLocalReferenceResolver(document, errors)
  validatePaginationContracts({
    ...operationState,
    crudResources: [{ api: { operations: { list: 'get_system_devices' } } }],
    document,
    errors,
    resolveLocalReference,
  })

  assert.deepEqual(errors, [])
})

test('本地引用解析器拒绝外部和不存在的引用', () => {
  const errors = []
  const resolveLocalReference = createLocalReferenceResolver(
    { components: { schemas: {} } },
    errors,
  )

  assert.equal(
    resolveLocalReference({ $ref: 'https://example.test/schema' }, 'external'),
    undefined,
  )
  assert.equal(
    resolveLocalReference({ $ref: '#/components/schemas/Unknown' }, 'missing'),
    undefined,
  )
  assert.deepEqual(errors, [
    'external: only local OpenAPI references are supported',
    'missing: unresolved OpenAPI reference #/components/schemas/Unknown',
  ])
})
