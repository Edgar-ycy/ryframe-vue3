import ts from 'typescript'

export type ImportKind = 'runtime' | 'type' | 'dynamic'

interface ModuleImport {
  kind: ImportKind
  specifier: string
}

export interface ApiOperationUsage {
  directImports: string[]
  directCalls: Record<string, number>
  legacyOperationImports: string[]
  methodProperties: number
  operationRequestImports: string[]
  pathLiterals: number
  urlProperties: number
}

interface ModuleInspection {
  containsDefineStoreCall: boolean
  imports: ModuleImport[]
  apiOperationUsage: ApiOperationUsage
}

const directHttpExports = new Set(['default', 'rawRequest', 'requestBlob', 'requestText'])

export function extractImportSpecifiers(source: string, fileName = 'module.ts'): ModuleImport[] {
  return inspectModuleSource(source, fileName).imports
}

function exportDeclarationKind(node: ts.ExportDeclaration): ImportKind {
  if (node.isTypeOnly) return 'type'
  const clause = node.exportClause
  if (
    clause &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly)
  ) {
    return 'type'
  }
  return 'runtime'
}

function importDeclarationKind(node: ts.ImportDeclaration): ImportKind {
  const clause = node.importClause
  if (!clause) return 'runtime'
  if (clause.isTypeOnly) return 'type'
  if (clause.name) return 'runtime'
  const bindings = clause.namedBindings
  if (
    bindings &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly)
  )
    return 'type'
  return 'runtime'
}

export function containsDefineStoreCall(source: string, fileName = 'module.ts'): boolean {
  return inspectModuleSource(source, fileName).containsDefineStoreCall
}

function syntaxPropertyName(node: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text
  return undefined
}

function isHandwrittenApiPath(node: ts.Node): boolean {
  if (ts.isStringLiteralLike(node)) return node.text.startsWith('/')
  return (
    ts.isTemplateExpression(node) &&
    (node.head.text.startsWith('/') ||
      node.templateSpans.some((span) => span.literal.text.startsWith('/')))
  )
}

export function inspectModuleSource(source: string, fileName = 'module.ts'): ModuleInspection {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind)
  const imports: ModuleImport[] = []
  const defineStoreBindings = new Set(['defineStore'])
  const apiBindings = new Map<string, string>()
  const directImports = new Set<string>()
  const operationRequestImports = new Set<string>()
  const legacyOperationImports = new Set<string>()

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const moduleName = statement.moduleSpecifier.text
    const clause = statement.importClause
    if (moduleName === 'pinia') {
      const namedBindings = clause?.namedBindings
      for (const element of namedBindings && ts.isNamedImports(namedBindings)
        ? namedBindings.elements
        : []) {
        if ((element.propertyName?.text ?? element.name.text) === 'defineStore') {
          defineStoreBindings.add(element.name.text)
        }
      }
    }
    if (moduleName === '@/api/generated/operations') legacyOperationImports.add(moduleName)
    if (moduleName === '@/api/operationRequest' && !clause?.isTypeOnly) {
      if (clause?.name) operationRequestImports.add('default')
      for (const element of clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements
        : []) {
        if (!element.isTypeOnly)
          operationRequestImports.add(element.propertyName?.text ?? element.name.text)
      }
    }
    if (moduleName !== '@/shared/http/client') continue
    if (!clause?.isTypeOnly && clause?.name) {
      apiBindings.set(clause.name.text, 'request')
      directImports.add('request')
    }
    for (const element of clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
      ? clause.namedBindings.elements
      : []) {
      if (clause?.isTypeOnly || element.isTypeOnly) continue
      const imported = element.propertyName?.text ?? element.name.text
      if (!directHttpExports.has(imported)) continue
      apiBindings.set(element.name.text, imported)
      directImports.add(imported)
    }
  }

  const directCalls: Record<string, number> = {}
  let containsDefineStoreCall = false
  let methodProperties = 0
  let pathLiterals = 0
  let urlProperties = 0
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({ kind: importDeclarationKind(node), specifier: node.moduleSpecifier.text })
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({ kind: exportDeclarationKind(node), specifier: node.moduleSpecifier.text })
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument
      if (ts.isLiteralTypeNode(argument) && ts.isStringLiteral(argument.literal)) {
        imports.push({ kind: 'type', specifier: argument.literal.text })
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments
      if (argument && ts.isStringLiteral(argument)) {
        imports.push({ kind: 'dynamic', specifier: argument.text })
      }
    }
    if (ts.isCallExpression(node)) {
      if (
        (ts.isIdentifier(node.expression) && defineStoreBindings.has(node.expression.text)) ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'defineStore')
      ) {
        containsDefineStoreCall = true
      }
      if (ts.isIdentifier(node.expression)) {
        const helper = apiBindings.get(node.expression.text)
        if (helper) directCalls[helper] = (directCalls[helper] ?? 0) + 1
      }
    }
    if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
      const name = syntaxPropertyName(node.name)
      if (name === 'url') urlProperties += 1
      if (name === 'method') methodProperties += 1
    }
    if (isHandwrittenApiPath(node)) pathLiterals += 1
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  return {
    containsDefineStoreCall,
    imports,
    apiOperationUsage: {
      directImports: [...directImports].sort(),
      directCalls: Object.fromEntries(Object.entries(directCalls).sort()),
      legacyOperationImports: [...legacyOperationImports].sort(),
      methodProperties,
      operationRequestImports: [...operationRequestImports].sort(),
      pathLiterals,
      urlProperties,
    },
  }
}

export function inspectApiOperationUsage(
  source: string,
  fileName = 'module.ts',
): ApiOperationUsage {
  return inspectModuleSource(source, fileName).apiOperationUsage
}

export function hasApiOperationUsage(inventory: ApiOperationUsage): boolean {
  return (
    inventory.directImports.length > 0 ||
    inventory.legacyOperationImports.length > 0 ||
    inventory.operationRequestImports.length > 0 ||
    Object.keys(inventory.directCalls).length > 0 ||
    inventory.pathLiterals > 0 ||
    inventory.urlProperties > 0 ||
    inventory.methodProperties > 0
  )
}
