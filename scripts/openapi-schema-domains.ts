const domainNames = Object.freeze(['core', 'system', 'platform', 'monitor'] as const)
const httpMethods = new Set(['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'])

type SchemaDomain = (typeof domainNames)[number]
type OpenApiPaths = Record<string, unknown>
type ComponentInventory = Record<string, Record<string, unknown>>

interface OpenApiDocument {
  openapi?: string
  info?: unknown
  jsonSchemaDialect?: string
  servers?: unknown
  paths?: OpenApiPaths | null
  components?: Record<string, Record<string, unknown> | null | undefined> | null
}

interface SchemaDomainDocument extends OpenApiDocument {
  paths: OpenApiPaths
  components: ComponentInventory
}

export const schemaDomainNames = domainNames
export const schemaArtifactPaths = Object.freeze([
  ...domainNames.map((domain) => `src/api/generated/schema/${domain}.ts`),
  'src/api/generated/schema/index.ts',
])

function compareText(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function sortedObject<T>(entries: [string, T][]): Record<string, T> {
  return Object.fromEntries(entries.sort(([left], [right]) => compareText(left, right)))
}

export function schemaDomainForPath(routePath: string, apiPrefix: string): SchemaDomain {
  const relative =
    routePath === apiPrefix
      ? '/'
      : routePath.startsWith(`${apiPrefix}/`)
        ? routePath.slice(apiPrefix.length)
        : routePath
  const segment = relative.split('/').filter(Boolean)[0]
  if (segment === 'business') return 'system'
  return domainNames.find((domain) => domain === segment) ?? 'core'
}

function collectReferences(value: unknown, references: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, references)
    return
  }
  if (!value || typeof value !== 'object') return
  if ('$ref' in value && typeof value.$ref === 'string') references.add(value.$ref)
  for (const nested of Object.values(value)) collectReferences(nested, references)
}

function decodePointerSegment(segment: string): string {
  return decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~')
}

function componentReference(reference: string) {
  const match = /^#\/components\/([^/]+)\/(.+)$/u.exec(reference)
  if (!match) return undefined
  return {
    section: decodePointerSegment(match[1]),
    name: decodePointerSegment(match[2]),
  }
}

function componentAt(document: OpenApiDocument, reference: string) {
  const pointer = componentReference(reference)
  if (!pointer) return undefined
  const value = document.components?.[pointer.section]?.[pointer.name]
  if (value === undefined) {
    throw new Error(`OpenAPI 引用了不存在的 component：${reference}`)
  }
  return { ...pointer, value }
}

function collectComponentClosure(
  document: OpenApiDocument,
  selectedPaths: unknown,
): ComponentInventory {
  const pending = new Set<string>()
  collectReferences(selectedPaths, pending)
  const visited = new Set<string>()
  const components = new Map<string, Map<string, unknown>>()
  while (pending.size > 0) {
    const reference = [...pending].sort(compareText)[0]
    pending.delete(reference)
    if (visited.has(reference)) continue
    visited.add(reference)
    const component = componentAt(document, reference)
    if (!component) continue
    const section = components.get(component.section) ?? new Map<string, unknown>()
    section.set(component.name, component.value)
    components.set(component.section, section)
    collectReferences(component.value, pending)
  }
  return sortedObject(
    [...components].map(([section, values]) => [section, sortedObject([...values])]),
  )
}

function mergeComponents(left: ComponentInventory, right: ComponentInventory): ComponentInventory {
  const sections = new Set([...Object.keys(left), ...Object.keys(right)])
  return sortedObject(
    [...sections].map((section) => [
      section,
      sortedObject([
        ...Object.entries(left[section] ?? {}),
        ...Object.entries(right[section] ?? {}),
      ]),
    ]),
  )
}

export function createSchemaDomainDocuments(
  document: OpenApiDocument,
  apiPrefix: string,
): Map<SchemaDomain, SchemaDomainDocument> {
  const pathsByDomain: Record<SchemaDomain, [string, unknown][]> = {
    core: [],
    system: [],
    platform: [],
    monitor: [],
  }
  for (const entry of Object.entries(document.paths ?? {})) {
    pathsByDomain[schemaDomainForPath(entry[0], apiPrefix)].push(entry)
  }
  const domains = new Map<SchemaDomain, SchemaDomainDocument>()
  for (const domain of domainNames) {
    const paths = sortedObject(pathsByDomain[domain])
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
    [...domains.values()].flatMap((domain) => Object.keys(domain.components.schemas ?? {})),
  )
  const compatibilityRoots = Object.keys(document.components?.schemas ?? {})
    .filter((name) => !ownedSchemas.has(name))
    .sort(compareText)
    .map((name) => ({ $ref: `#/components/schemas/${name}` }))
  const core = domains.get('core')
  if (core && compatibilityRoots.length > 0) {
    core.components = mergeComponents(
      core.components,
      collectComponentClosure(document, compatibilityRoots),
    )
  }
  validateSchemaDomainDocuments(document, domains)
  return domains
}

function operationKeys(paths: OpenApiDocument['paths']): Set<string> {
  const keys = new Set<string>()
  for (const [routePath, pathItem] of Object.entries(paths ?? {})) {
    for (const method of Object.keys(pathItem ?? {})) {
      if (httpMethods.has(method)) keys.add(`${method.toUpperCase()} ${routePath}`)
    }
  }
  return keys
}

function validateClosedReferences(
  document: OpenApiDocument,
  domain: SchemaDomain,
  errors: string[],
): void {
  const references = new Set<string>()
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

export function validateSchemaDomainDocuments(
  document: OpenApiDocument,
  domains: ReadonlyMap<SchemaDomain, OpenApiDocument>,
): void {
  const expected = operationKeys(document.paths)
  const actual = new Set<string>()
  const expectedSchemas = new Set(Object.keys(document.components?.schemas ?? {}))
  const actualSchemas = new Set<string>()
  const errors: string[] = []
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

export function renderSchemaIndex(header: string): string {
  const imports = domainNames
    .map(
      (domain) =>
        `import type { components as ${domain}Components, operations as ${domain}Operations } from './${domain}'`,
    )
    .join('\n')
  const operationTypes = domainNames.map((domain) => `${domain}Operations`).join('\n  & ')
  const schemaTypes = domainNames.map((domain) => `${domain}Components['schemas']`).join('\n    & ')
  return `${header}${imports}

export type operations =
  ${operationTypes}

export interface components {
  schemas:
    ${schemaTypes}
}
`
}
