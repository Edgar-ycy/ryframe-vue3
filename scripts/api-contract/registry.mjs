import { readFile, readdir } from 'node:fs/promises'
import ts from 'typescript'

function propertyName(property) {
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text
  }
  return undefined
}

function staticString(node, constants = new Map()) {
  if (node && ts.isStringLiteral(node)) return node.text
  if (node && ts.isIdentifier(node)) return constants.get(node.text)
  return undefined
}

function staticStringArray(node, constants = new Map()) {
  if (!node || !ts.isArrayLiteralExpression(node)) return undefined
  const values = node.elements.map(element => staticString(element, constants))
  return values.every(value => typeof value === 'string') ? values : undefined
}

async function readFeatureRegistry(featuresPath, errors) {
  const entries = new Map()
  const directories = await readdir(featuresPath, { withFileTypes: true })
  for (const directory of directories) {
    if (!directory.isDirectory()) continue
    const manifestPath = new URL(`./${directory.name}/manifest.ts`, featuresPath)
    let source
    try {
      source = await readFile(manifestPath, 'utf8')
    }
    catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    const sourceFile = ts.createSourceFile(
      manifestPath.pathname,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const constants = new Map()
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)
          && declaration.initializer
          && ts.isStringLiteral(declaration.initializer)) {
          constants.set(declaration.name.text, declaration.initializer.text)
        }
      }
    }
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer
        if (!initializer
          || !ts.isCallExpression(initializer)
          || !ts.isIdentifier(initializer.expression)
          || initializer.expression.text !== 'defineFeatureManifest'
          || initializer.arguments.length !== 1
          || !ts.isObjectLiteralExpression(initializer.arguments[0])) continue
        const fields = new Map()
        for (const field of initializer.arguments[0].properties) {
          if (ts.isPropertyAssignment(field)) fields.set(propertyName(field), field.initializer)
        }
        const routeKeyNode = fields.get('routeKey')
        const routePathNode = fields.get('path')
        const capabilityCode = staticString(fields.get('capabilityCode'), constants)
        const permissionCode = staticString(fields.get('permissionCode'), constants)
        const routeKey = staticString(routeKeyNode, constants)
        const routePath = staticString(routePathNode, constants)
        const allowedVariants = staticStringArray(fields.get('allowedVariants'), constants)
        if (!capabilityCode
          || !permissionCode
          || !routeKey
          || !routePath?.startsWith('/')
          || !allowedVariants?.length
          || new Set(allowedVariants).size !== allowedVariants.length
          || !fields.has('page')
          || !fields.has('planConfigEditor')) {
          errors.push(
            `${manifestPath.pathname}: feature manifest requires static capabilityCode, `
            + 'permissionCode, routeKey, path, unique allowedVariants, page, and planConfigEditor',
          )
          continue
        }
        if (entries.has(routeKey)) {
          errors.push(`feature manifests contain duplicate route_key ${routeKey}`)
          continue
        }
        entries.set(routeKey, {
          allowedVariants,
          capabilityCode,
          hasComponent: true,
          permissionCode,
        })
      }
    }
  }
  return entries
}

function readPermissionRouteKeys(source, featureEntries, pageRegistryPath, errors) {
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
      if (!ts.isIdentifier(declaration.name)
        || declaration.name.text !== 'permissionRouteKeys'
        || !declaration.initializer) continue
      const initializer = declaration.initializer
      if (ts.isCallExpression(initializer)
        && initializer.arguments.length === 1
        && ts.isObjectLiteralExpression(initializer.arguments[0])) {
        registry = initializer.arguments[0]
      }
      else if (ts.isObjectLiteralExpression(initializer)) {
        registry = initializer
      }
    }
  }
  if (!registry) {
    errors.push('src/router/pageRegistry.ts: permissionRouteKeys object literal is missing')
    return new Map()
  }

  const entries = new Map()
  for (const property of registry.properties) {
    if (ts.isSpreadAssignment(property)
      && ts.isIdentifier(property.expression)
      && property.expression.text === 'featurePermissionRouteKeys') {
      for (const [routeKey, feature] of featureEntries) {
        if (entries.has(feature.permissionCode)) {
          errors.push(`permissionRouteKeys contains duplicate permission ${feature.permissionCode}`)
        }
        entries.set(feature.permissionCode, routeKey)
      }
      continue
    }
    if (!ts.isPropertyAssignment(property)) {
      errors.push('permissionRouteKeys may only contain static entries or featurePermissionRouteKeys')
      continue
    }
    const permissionCode = propertyName(property)
    const routeKey = staticString(property.initializer)
    if (!permissionCode || !routeKey) {
      errors.push('permissionRouteKeys entries must use static string keys and values')
      continue
    }
    if (entries.has(permissionCode)) {
      errors.push(`permissionRouteKeys contains duplicate permission ${permissionCode}`)
    }
    entries.set(permissionCode, routeKey)
  }
  return entries
}

function readPageRegistry(source, featureEntries, pageRegistryPath, errors) {
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
    if (ts.isSpreadAssignment(property)
      && ts.isIdentifier(property.expression)
      && property.expression.text === 'featureMenuPageRegistry') {
      for (const [routeKey, entry] of featureEntries) entries.set(routeKey, entry)
      continue
    }
    if (!ts.isPropertyAssignment(property)) {
      errors.push('menuPageRegistry may only contain explicit entries or featureMenuPageRegistry')
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

/** 校验前端 AST 注册表与 OpenAPI 菜单路由扩展。 */
export async function validatePageRegistryContract({
  document,
  errors,
  featuresPath,
  pageRegistryPath,
}) {
  const featureRegistry = await readFeatureRegistry(featuresPath, errors)
  const pageRegistrySource = await readFile(pageRegistryPath, 'utf8')
  const pageRegistry = readPageRegistry(pageRegistrySource, featureRegistry, pageRegistryPath, errors)
  const permissionRouteKeys = readPermissionRouteKeys(
    pageRegistrySource,
    featureRegistry,
    pageRegistryPath,
    errors,
  )
  const routePermissions = new Map()
  for (const [permissionCode, routeKey] of permissionRouteKeys) {
    if (!routePermissions.has(routeKey)) routePermissions.set(routeKey, [])
    routePermissions.get(routeKey).push(permissionCode)
  }
  const menuRouteExtension = document['x-ryframe-menu-routes']
  const contractRoutes = new Map()
  if (!menuRouteExtension || typeof menuRouteExtension !== 'object') {
    errors.push('OpenAPI is missing x-ryframe-menu-routes')
  }
  else {
    if (menuRouteExtension.version !== 2) {
      errors.push(`unsupported menu route contract version: ${menuRouteExtension.version}`)
    }
    if (!Array.isArray(menuRouteExtension.routes)) {
      errors.push('x-ryframe-menu-routes.routes must be an array')
    }
    else {
      for (const [index, route] of menuRouteExtension.routes.entries()) {
        const routeKey = route?.route_key
        const name = route?.name
        const titleKey = route?.title_key
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
        if (typeof name !== 'string' || name.trim() !== name || name.length === 0) {
          errors.push(`menu route contract entry ${routeKey} has an invalid name`)
        }
        if (typeof titleKey !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(titleKey)) {
          errors.push(`menu route contract entry ${routeKey} has an invalid title_key`)
        }
        if (contractRoutes.has(routeKey)) {
          errors.push(`menu route contract contains duplicate route_key ${routeKey}`)
          continue
        }
        const permissionCode = route?.permission_code ?? null
        const capabilityCode = route?.capability_code ?? null
        if (permissionCode !== null && typeof permissionCode !== 'string') {
          errors.push(`menu route contract entry ${routeKey} has an invalid permission_code`)
        }
        if (capabilityCode !== null && typeof capabilityCode !== 'string') {
          errors.push(`menu route contract entry ${routeKey} has an invalid capability_code`)
        }
        contractRoutes.set(routeKey, { capabilityCode, menuType, permissionCode })
      }
    }
  }

  if (contractRoutes.size < 21) {
    errors.push(`expected at least 21 menu route contracts, found ${contractRoutes.size}`)
  }
  for (const [routeKey, contract] of contractRoutes) {
    const entry = pageRegistry.get(routeKey)
    if (!entry) {
      errors.push(`menuPageRegistry is missing backend route_key ${routeKey}`)
      continue
    }
    if (contract.menuType === 'C' && !entry.hasComponent) {
      errors.push(`menuPageRegistry.${routeKey}: page menu must declare a component`)
    }
    if (contract.menuType === 'M' && entry.hasComponent) {
      errors.push(`menuPageRegistry.${routeKey}: directory menu must not declare a component`)
    }
    const permissions = routePermissions.get(routeKey) ?? []
    if (permissions.length > 1) {
      errors.push(`permissionRouteKeys maps multiple page permissions to ${routeKey}`)
    }
    const expectedPermission = permissions[0] ?? null
    if (contract.permissionCode !== expectedPermission) {
      errors.push(
        `menu route contract ${routeKey}: permission_code must be `
        + `${JSON.stringify(expectedPermission)}, found ${JSON.stringify(contract.permissionCode)}`,
      )
    }
    const expectedCapability = featureRegistry.get(routeKey)?.capabilityCode ?? null
    if (contract.capabilityCode !== expectedCapability) {
      errors.push(
        `menu route contract ${routeKey}: capability_code must be `
        + `${JSON.stringify(expectedCapability)}, found ${JSON.stringify(contract.capabilityCode)}`,
      )
    }
  }
  for (const routeKey of pageRegistry.keys()) {
    if (!contractRoutes.has(routeKey)) {
      errors.push(`menuPageRegistry contains undeclared route_key ${routeKey}`)
    }
  }
  for (const [permissionCode, routeKey] of permissionRouteKeys) {
    if (!pageRegistry.has(routeKey)) {
      errors.push(`permissionRouteKeys.${permissionCode}: unknown route_key ${routeKey}`)
    }
  }

  return { contractRoutes, featureRegistry }
}
