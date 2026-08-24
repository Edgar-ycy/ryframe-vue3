const domainNames = Object.freeze(['core', 'system', 'platform', 'monitor', 'agent'])
const httpMethods = new Set(['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'])

export const schemaDomainNames = domainNames
export const schemaArtifactPaths = Object.freeze([
  ...domainNames.map(domain => `src/api/generated/schema/${domain}.ts`),
  'src/api/generated/schema/index.ts',
])

function compareText(left, right) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function sortedObject(entries) {
  return Object.fromEntries(entries.sort(([left], [right]) => compareText(left, right)))
}

export function schemaDomainForPath(routePath, apiPrefix) {
  const relative = routePath === apiPrefix
    ? '/'
    : routePath.startsWith(`${apiPrefix}/`)
      ? routePath.slice(apiPrefix.length)
      : routePath
  const segment = relative.split('/').filter(Boolean)[0]
  return domainNames.includes(segment) && segment !== 'core' ? segment : 'core'
}

function collectReferences(value, references) {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, references)
    return
  }
  if (!value || typeof value !== 'object') return
  if (typeof value.$ref === 'string') references.add(value.$ref)
  for (const nested of Object.values(value)) collectReferences(nested, references)
}

function decodePointerSegment(segment) {
  return decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~')
}

function componentReference(reference) {
  const match = /^#\/components\/([^/]+)\/(.+)$/u.exec(reference)
  if (!match) return undefined
  return {
    section: decodePointerSegment(match[1]),
    name: decodePointerSegment(match[2]),
  }
}

function componentAt(document, reference) {
  const pointer = componentReference(reference)
  if (!pointer) return undefined
  const value = document.components?.[pointer.section]?.[pointer.name]
  if (value === undefined) {
    throw new Error(`OpenAPI 引用了不存在的 component：${reference}`)
  }
  return { ...pointer, value }
}

function collectComponentClosure(document, selectedPaths) {
  const pending = new Set()
  collectReferences(selectedPaths, pending)
  const visited = new Set()
  const components = new Map()
  while (pending.size > 0) {
    const reference = [...pending].sort(compareText)[0]
    pending.delete(reference)
    if (visited.has(reference)) continue
    visited.add(reference)
    const component = componentAt(document, reference)
    if (!component) continue
    const section = components.get(component.section) ?? new Map()
    section.set(component.name, component.value)
    components.set(component.section, section)
    collectReferences(component.value, pending)
  }
  return sortedObject([...components].map(([section, values]) => [
    section,
    sortedObject([...values]),
  ]))
}

function mergeComponents(left, right) {
  const sections = new Set([...Object.keys(left), ...Object.keys(right)])
  return sortedObject([...sections].map(section => [
    section,
    sortedObject([
      ...Object.entries(left[section] ?? {}),
      ...Object.entries(right[section] ?? {}),
    ]),
  ]))
}

export function createSchemaDomainDocuments(document, apiPrefix) {
  const pathsByDomain = new Map(domainNames.map(domain => [domain, []]))
  for (const entry of Object.entries(document.paths ?? {})) {
    pathsByDomain.get(schemaDomainForPath(entry[0], apiPrefix)).push(entry)
  }
  const domains = new Map()
  for (const domain of domainNames) {
    const paths = sortedObject(pathsByDomain.get(domain))
    domains.set(domain, {
      openapi: document.openapi,
      info: document.info,
      jsonSchemaDialect: document.jsonSchemaDialect,
      servers: document.servers,
      paths,
      components: collectComponentClosure(document, paths),
    })
  }
  const ownedSchemas = new Set(
    [...domains.values()].flatMap(domain => Object.keys(domain.components.schemas ?? {})),
  )
  const compatibilityRoots = Object.keys(document.components?.schemas ?? {})
    .filter(name => !ownedSchemas.has(name))
    .sort(compareText)
    .map(name => ({ $ref: `#/components/schemas/${name}` }))
  if (compatibilityRoots.length > 0) {
    const core = domains.get('core')
    core.components = mergeComponents(
      core.components,
      collectComponentClosure(document, compatibilityRoots),
    )
  }
  validateSchemaDomainDocuments(document, domains)
  return domains
}

function operationKeys(paths) {
  const keys = new Set()
  for (const [routePath, pathItem] of Object.entries(paths ?? {})) {
    for (const method of Object.keys(pathItem ?? {})) {
      if (httpMethods.has(method)) keys.add(`${method.toUpperCase()} ${routePath}`)
    }
  }
  return keys
}

function validateClosedReferences(document, domain, errors) {
  const references = new Set()
  collectReferences(document.paths, references)
  collectReferences(document.components, references)
  for (const reference of references) {
    const pointer = componentReference(reference)
    if (!pointer) continue
    if (document.components?.[pointer.section]?.[pointer.name] === undefined) {
      errors.push(`${domain} 分片存在未闭合引用 ${reference}`)
    }
  }
}

export function validateSchemaDomainDocuments(document, domains) {
  const expected = operationKeys(document.paths)
  const actual = new Set()
  const expectedSchemas = new Set(Object.keys(document.components?.schemas ?? {}))
  const actualSchemas = new Set()
  const errors = []
  for (const domain of domainNames) {
    const domainDocument = domains.get(domain)
    if (!domainDocument) {
      errors.push(`缺少 ${domain} OpenAPI 类型分片`)
      continue
    }
    for (const operation of operationKeys(domainDocument.paths)) {
      if (actual.has(operation)) errors.push(`操作被多个分片重复拥有：${operation}`)
      actual.add(operation)
    }
    for (const schema of Object.keys(domainDocument.components?.schemas ?? {})) {
      actualSchemas.add(schema)
    }
    validateClosedReferences(domainDocument, domain, errors)
  }
  for (const operation of expected) {
    if (!actual.has(operation)) errors.push(`分片遗漏操作：${operation}`)
  }
  for (const operation of actual) {
    if (!expected.has(operation)) errors.push(`分片新增未知操作：${operation}`)
  }
  for (const schema of expectedSchemas) {
    if (!actualSchemas.has(schema)) errors.push(`分片遗漏 schema：${schema}`)
  }
  for (const schema of actualSchemas) {
    if (!expectedSchemas.has(schema)) errors.push(`分片新增未知 schema：${schema}`)
  }
  if (errors.length > 0) {
    throw new Error(`OpenAPI 类型分片校验失败：\n  - ${errors.join('\n  - ')}`)
  }
}

export function renderSchemaIndex(header) {
  const imports = domainNames.map(domain => (
    `import type { components as ${domain}Components, operations as ${domain}Operations } from './${domain}'`
  )).join('\n')
  const operationTypes = domainNames.map(domain => `${domain}Operations`).join('\n  & ')
  const schemaTypes = domainNames.map(domain => `${domain}Components['schemas']`).join('\n    & ')
  return `${header}${imports}

export type operations =
  ${operationTypes}

export interface components {
  schemas:
    ${schemaTypes}
}
`
}
