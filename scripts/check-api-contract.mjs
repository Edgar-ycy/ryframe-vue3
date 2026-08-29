import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { validateOpenApiExtensions } from './api-contract/extensions.mjs'
import { collectOperationContractState } from './api-contract/operations.mjs'
import { validatePaginationContracts } from './api-contract/pagination.mjs'
import { createLocalReferenceResolver } from './api-contract/references.mjs'
import { validatePageRegistryContract } from './api-contract/registry.mjs'
import { validateSchemaContracts } from './api-contract/schema.mjs'
import { apiVersionContractViolation } from './api-version-contract.mjs'
import { requireCrudResourceCatalog } from './crud-resource-contract.mjs'
import { requirePermissionCatalog } from './permission-catalog-contract.mjs'

const contractPath = new URL('../openapi/openapi.json', import.meta.url)
const packagePath = new URL('../package.json', import.meta.url)
const featuresPath = new URL('../src/features/', import.meta.url)
const passwordPolicyPath = new URL(
  '../src/shared/security/passwordPolicy.generated.json',
  import.meta.url,
)
const noticePolicyPath = new URL(
  '../src/shared/markdown/noticePolicy.generated.json',
  import.meta.url,
)
const apiPrefixPath = new URL('../src/shared/config/apiPrefix.generated.json', import.meta.url)
const document = JSON.parse(await readFile(contractPath, 'utf8'))
const packageDocument = JSON.parse(await readFile(packagePath, 'utf8'))
const generatedPasswordPolicy = JSON.parse(await readFile(passwordPolicyPath, 'utf8'))
const generatedNoticePolicy = JSON.parse(await readFile(noticePolicyPath, 'utf8'))
const generatedApiPrefix = JSON.parse(await readFile(apiPrefixPath, 'utf8'))
const errors = []

const apiVersionViolation = apiVersionContractViolation(packageDocument, document)
if (apiVersionViolation) errors.push(apiVersionViolation)

try {
  requirePermissionCatalog(document['x-ryframe-permission-catalog'], 'openapi/openapi.json')
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error))
}
try {
  requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document)
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error))
}

const contractDescription = document.info?.description ?? ''
for (const required of [
  'message',
  'request_id',
  'error_key',
  'details',
  'items/page/page_size/total/total_pages/max_page_size',
]) {
  if (!contractDescription.includes(required)) {
    errors.push(`OpenAPI description does not document current response field: ${required}`)
  }
}
for (const removed of ['"msg":', '"rows":']) {
  if (contractDescription.includes(removed)) {
    errors.push(`OpenAPI description still documents removed response field: ${removed}`)
  }
}

const { contractRoutes, featureRegistry } = await validatePageRegistryContract({
  document,
  errors,
  featuresPath,
})
validateOpenApiExtensions({
  document,
  errors,
  featureRegistry,
  generatedApiPrefix,
  generatedNoticePolicy,
  generatedPasswordPolicy,
})

if (!String(document.openapi).startsWith('3.')) {
  errors.push(`unsupported OpenAPI version: ${document.openapi ?? '<missing>'}`)
}
if (document.info?.title !== 'RyFrame API') {
  errors.push(`unexpected API title: ${document.info?.title ?? '<missing>'}`)
}

const operationState = collectOperationContractState(document, errors)
const resolveLocalReference = createLocalReferenceResolver(document, errors)
validatePaginationContracts({ ...operationState, document, errors, resolveLocalReference })
validateSchemaContracts({ ...operationState, errors, resolveLocalReference })

if (operationState.paths.length < 97) {
  errors.push(`expected at least 97 paths, found ${operationState.paths.length}`)
}
if (operationState.operationCount < 128) {
  errors.push(`expected at least 128 operations, found ${operationState.operationCount}`)
}
if (Object.keys(operationState.schemas).length < 188) {
  errors.push(`expected at least 188 schemas, found ${Object.keys(operationState.schemas).length}`)
}
if (errors.length > 0) {
  console.error('API contract check failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `API contract check passed (${operationState.paths.length} paths, ` +
      `${operationState.operationCount} operations, ${Object.keys(operationState.schemas).length} schemas, ` +
      `${operationState.queryOperationIds.size} query operations, ${contractRoutes.size} menu routes)`,
  )
}
