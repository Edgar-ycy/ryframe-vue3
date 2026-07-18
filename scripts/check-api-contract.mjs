import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'
import ts from 'typescript'

const contractPath = new URL('../openapi/openapi.json', import.meta.url)
const pageRegistryPath = new URL('../src/router/pageRegistry.ts', import.meta.url)
const passwordPolicyPath = new URL(
  '../src/shared/security/passwordPolicy.generated.json',
  import.meta.url,
)
const document = JSON.parse(await readFile(contractPath, 'utf8'))
const generatedPasswordPolicy = JSON.parse(await readFile(passwordPolicyPath, 'utf8'))
const errors = []

function propertyName(property) {
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text
  }
  return undefined
}

function readPageRegistry(source) {
  const sourceFile = ts.createSourceFile(
    pageRegistryPath.pathname,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  let registry

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)
        && declaration.name.text === 'menuPageRegistry'
        && declaration.initializer
        && ts.isObjectLiteralExpression(declaration.initializer)) {
        registry = declaration.initializer
      }
    }
  }

  if (!registry) {
    errors.push('src/router/pageRegistry.ts: menuPageRegistry object literal is missing')
    return new Map()
  }

  const entries = new Map()
  for (const property of registry.properties) {
    if (!ts.isPropertyAssignment(property)) {
      errors.push('menuPageRegistry may only contain explicit property assignments')
      continue
    }
    const routeKey = propertyName(property)
    if (!routeKey || !ts.isObjectLiteralExpression(property.initializer)) {
      errors.push('menuPageRegistry entries must use static keys and object literal values')
      continue
    }
    if (entries.has(routeKey)) {
      errors.push(`menuPageRegistry contains duplicate route_key ${routeKey}`)
      continue
    }

    const fields = new Map()
    for (const field of property.initializer.properties) {
      if (ts.isPropertyAssignment(field)) fields.set(propertyName(field), field.initializer)
    }
    const routePath = fields.get('path')
    if (!routePath || !ts.isStringLiteral(routePath) || !routePath.text.startsWith('/')) {
      errors.push(`menuPageRegistry.${routeKey}: path must be a static absolute path`)
    }
    entries.set(routeKey, { hasComponent: fields.has('component') })
  }
  return entries
}

const pageRegistry = readPageRegistry(await readFile(pageRegistryPath, 'utf8'))
const menuRouteExtension = document['x-ryframe-menu-routes']
const contractRoutes = new Map()

if (!menuRouteExtension || typeof menuRouteExtension !== 'object') {
  errors.push('OpenAPI is missing x-ryframe-menu-routes')
}
else {
  if (menuRouteExtension.version !== 1) {
    errors.push(`unsupported menu route contract version: ${menuRouteExtension.version}`)
  }
  if (!Array.isArray(menuRouteExtension.routes)) {
    errors.push('x-ryframe-menu-routes.routes must be an array')
  }
  else {
    for (const [index, route] of menuRouteExtension.routes.entries()) {
      const routeKey = route?.route_key
      const menuType = route?.menu_type
      if (typeof routeKey !== 'string'
        || !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(routeKey)) {
        errors.push(`menu route contract entry ${index} has an invalid route_key`)
        continue
      }
      if (!['M', 'C'].includes(menuType)) {
        errors.push(`menu route contract entry ${routeKey} has an invalid menu_type`)
        continue
      }
      if (contractRoutes.has(routeKey)) {
        errors.push(`menu route contract contains duplicate route_key ${routeKey}`)
        continue
      }
      contractRoutes.set(routeKey, menuType)
    }
  }
}

if (contractRoutes.size < 21) {
  errors.push(`expected at least 21 menu route contracts, found ${contractRoutes.size}`)
}
for (const [routeKey, menuType] of contractRoutes) {
  const entry = pageRegistry.get(routeKey)
  if (!entry) {
    errors.push(`menuPageRegistry is missing backend route_key ${routeKey}`)
    continue
  }
  if (menuType === 'C' && !entry.hasComponent) {
    errors.push(`menuPageRegistry.${routeKey}: page menu must declare a component`)
  }
  if (menuType === 'M' && entry.hasComponent) {
    errors.push(`menuPageRegistry.${routeKey}: directory menu must not declare a component`)
  }
}
for (const routeKey of pageRegistry.keys()) {
  if (!contractRoutes.has(routeKey)) {
    errors.push(`menuPageRegistry contains undeclared route_key ${routeKey}`)
  }
}

const expectedPasswordPolicy = {
  version: 1,
  min_length: 8,
  max_length: 72,
  pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[!-~]{8,72}$',
  allowed_characters: 'ascii_graphic',
  required_classes: ['uppercase', 'lowercase', 'digit', 'special'],
}
const passwordPolicyExtension = document['x-ryframe-password-policy']
if (!isDeepStrictEqual(passwordPolicyExtension, expectedPasswordPolicy)) {
  errors.push('OpenAPI password policy does not match the canonical strong policy')
}
if (!isDeepStrictEqual(generatedPasswordPolicy, passwordPolicyExtension)) {
  errors.push('generated password policy is not synchronized with OpenAPI')
}
for (const [schemaName, fieldName] of [
  ['ChangePasswordRequest', 'new_password'],
  ['CompletePasswordResetRequest', 'new_password'],
  ['CreateTenantDto', 'admin_password'],
]) {
  const field = document.components?.schemas?.[schemaName]?.properties?.[fieldName]
  if (field?.minLength !== expectedPasswordPolicy.min_length
    || field?.maxLength !== expectedPasswordPolicy.max_length
    || field?.pattern !== expectedPasswordPolicy.pattern) {
    errors.push(`${schemaName}.${fieldName}: schema does not expose the password policy`)
  }
}

if (!String(document.openapi).startsWith('3.')) {
  errors.push(`unsupported OpenAPI version: ${document.openapi ?? '<missing>'}`)
}
if (document.info?.title !== 'RyFrame API') {
  errors.push(`unexpected API title: ${document.info?.title ?? '<missing>'}`)
}

const paths = Object.entries(document.paths ?? {})
const operationIds = new Set()
const bodylessWriteAllowlist = new Set([
  'post_auth_logout',
  'post_auth_refresh',
  'post_system_perms_sync',
])
const methods = new Set(['get', 'post', 'put', 'patch', 'delete'])
let operationCount = 0
let queryOperationCount = 0

for (const [path, pathItem] of paths) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!methods.has(method)) continue
    operationCount += 1

    const operationId = operation.operationId
    if (!operationId) errors.push(`${method.toUpperCase()} ${path}: missing operationId`)
    else if (operationIds.has(operationId)) errors.push(`${operationId}: duplicate operationId`)
    else operationIds.add(operationId)

    const successResponses = Object.entries(operation.responses ?? {})
      .filter(([status]) => /^2\d\d$/.test(status))
    if (successResponses.length === 0) {
      errors.push(`${operationId}: missing 2xx response`)
    }
    for (const [status, response] of successResponses) {
      const content = Object.values(response.content ?? {})
      if (content.length === 0 || content.some(media => !media.schema)) {
        errors.push(`${operationId}: ${status} response is missing a content schema`)
      }
    }

    if (['post', 'put', 'patch'].includes(method)
      && !operation.requestBody
      && !bodylessWriteAllowlist.has(operationId)) {
      errors.push(`${operationId}: write operation is missing requestBody`)
    }

    const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]
    if (parameters.some(parameter => parameter.in === 'query')) queryOperationCount += 1
    if (/(\/all|\/export)$/.test(path)
      && parameters.some(parameter => parameter.in === 'query'
        && ['page', 'page_size'].includes(parameter.name))) {
      errors.push(`${operationId}: full-record operation must not expose pagination parameters`)
    }
  }
}

function validateIdFields(schema, location) {
  if (!schema || typeof schema !== 'object') return
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const propertyTypes = Array.isArray(property.type) ? property.type : [property.type]
    if (/(^id$|_id$)/.test(name) && !propertyTypes.includes('string')) {
      errors.push(`${location}.${name}: ID fields must use string transport`)
    }
    if (/_ids$/.test(name)
      && (!propertyTypes.includes('array') || property.items?.type !== 'string')) {
      errors.push(`${location}.${name}: ID list fields must use string items`)
    }
    validateIdFields(property, `${location}.${name}`)
  }
  for (const [index, branch] of (schema.allOf ?? []).entries()) {
    validateIdFields(branch, `${location}.allOf[${index}]`)
  }
}

const schemas = document.components?.schemas ?? {}
for (const [name, schema] of Object.entries(schemas)) {
  validateIdFields(schema, `components.schemas.${name}`)
}

if (paths.length < 89) errors.push(`expected at least 89 paths, found ${paths.length}`)
if (operationCount < 119) errors.push(`expected at least 119 operations, found ${operationCount}`)
if (Object.keys(schemas).length < 153) {
  errors.push(`expected at least 153 schemas, found ${Object.keys(schemas).length}`)
}
if (queryOperationCount < 34) {
  errors.push(`expected at least 34 query operations, found ${queryOperationCount}`)
}

if (errors.length > 0) {
  console.error('API contract check failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exitCode = 1
}
else {
  console.log(
    `API contract check passed (${paths.length} paths, ${operationCount} operations, `
    + `${Object.keys(schemas).length} schemas, ${contractRoutes.size} menu routes)`,
  )
}
