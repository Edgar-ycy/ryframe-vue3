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
  const values = node.elements.map((element) => staticString(element, constants))
  return values.every((value) => typeof value === 'string') ? values : undefined
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
    } catch (error) {
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
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isStringLiteral(declaration.initializer)
        ) {
          constants.set(declaration.name.text, declaration.initializer.text)
        }
      }
    }
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer
        if (
          !initializer ||
          !ts.isCallExpression(initializer) ||
          !ts.isIdentifier(initializer.expression) ||
          initializer.expression.text !== 'defineFeatureManifest' ||
          initializer.arguments.length !== 1 ||
          !ts.isObjectLiteralExpression(initializer.arguments[0])
        )
          continue
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
        if (
          !capabilityCode ||
          !permissionCode ||
          !routeKey ||
          !routePath?.startsWith('/') ||
          !allowedVariants?.length ||
          new Set(allowedVariants).size !== allowedVariants.length ||
          !fields.has('page') ||
          !fields.has('planConfigEditor')
        ) {
          errors.push(
            `${manifestPath.pathname}: feature manifest requires static capabilityCode, ` +
              'permissionCode, routeKey, path, unique allowedVariants, page, and planConfigEditor',
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

async function readPageManifestRegistry(rootPath, fileName, errors) {
  const entries = new Map()
  const directories = await readdir(rootPath, { withFileTypes: true })
  for (const directory of directories) {
    if (!directory.isDirectory()) continue
    const pagesPath = new URL(`./${directory.name}/${fileName}`, rootPath)
    let source
    try {
      source = await readFile(pagesPath, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    const sourceFile = ts.createSourceFile(
      pagesPath.pathname,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer
        if (
          !initializer ||
          !ts.isCallExpression(initializer) ||
          !ts.isIdentifier(initializer.expression) ||
          initializer.expression.text !== 'definePageManifest' ||
          initializer.arguments.length !== 1 ||
          !ts.isObjectLiteralExpression(initializer.arguments[0])
        )
          continue
        const pagesProperty = initializer.arguments[0].properties.find(
          (property) => ts.isPropertyAssignment(property) && propertyName(property) === 'pages',
        )
        if (
          !pagesProperty ||
          !ts.isPropertyAssignment(pagesProperty) ||
          !ts.isArrayLiteralExpression(pagesProperty.initializer)
        ) {
          errors.push(`${pagesPath.pathname}: page manifest requires a static pages array`)
          continue
        }
        for (const page of pagesProperty.initializer.elements) {
          if (!ts.isObjectLiteralExpression(page)) {
            errors.push(`${pagesPath.pathname}: page entries must be object literals`)
            continue
          }
          const fields = new Map()
          for (const field of page.properties) {
            if (ts.isPropertyAssignment(field)) fields.set(propertyName(field), field.initializer)
          }
          const routeKey = staticString(fields.get('routeKey'))
          const routePath = staticString(fields.get('path'))
          const permissionCode = fields.has('permissionCode')
            ? staticString(fields.get('permissionCode'))
            : null
          if (
            !routeKey ||
            !routePath?.startsWith('/') ||
            (fields.has('permissionCode') && !permissionCode)
          ) {
            errors.push(
              `${pagesPath.pathname}: page entry requires static routeKey, absolute path, ` +
                'and an optional static permissionCode',
            )
            continue
          }
          if (entries.has(routeKey)) {
            errors.push(`page manifests contain duplicate route_key ${routeKey}`)
            continue
          }
          entries.set(routeKey, {
            hasComponent: fields.has('page'),
            permissionCode,
          })
        }
      }
    }
  }
  return entries
}

/** 校验前端 AST 注册表与 OpenAPI 菜单路由扩展。 */
export async function validatePageRegistryContract({ document, errors, featuresPath }) {
  const featureRegistry = await readFeatureRegistry(featuresPath, errors)
  const pageRegistry = await readPageManifestRegistry(featuresPath, 'pages.ts', errors)
  const resourceRegistry = await readPageManifestRegistry(
    new URL('../generated/resources/', featuresPath),
    'registration.ts',
    errors,
  )
  for (const [routeKey, resource] of resourceRegistry) {
    if (pageRegistry.has(routeKey)) {
      errors.push(`domain and resource manifests contain duplicate route_key ${routeKey}`)
      continue
    }
    pageRegistry.set(routeKey, resource)
  }
  for (const [routeKey, feature] of featureRegistry) {
    if (pageRegistry.has(routeKey)) {
      errors.push(`page and feature manifests contain duplicate route_key ${routeKey}`)
      continue
    }
    pageRegistry.set(routeKey, feature)
  }
  const permissionRouteKeys = new Map()
  for (const [routeKey, page] of pageRegistry) {
    if (!page.permissionCode) continue
    if (permissionRouteKeys.has(page.permissionCode)) {
      errors.push(`page manifests contain duplicate permission ${page.permissionCode}`)
    }
    permissionRouteKeys.set(page.permissionCode, routeKey)
  }
  const routePermissions = new Map()
  for (const [permissionCode, routeKey] of permissionRouteKeys) {
    if (!routePermissions.has(routeKey)) routePermissions.set(routeKey, [])
    routePermissions.get(routeKey).push(permissionCode)
  }
  const menuRouteExtension = document['x-ryframe-menu-routes']
  const contractRoutes = new Map()
  if (!menuRouteExtension || typeof menuRouteExtension !== 'object') {
    errors.push('OpenAPI is missing x-ryframe-menu-routes')
  } else {
    if (menuRouteExtension.version !== 2) {
      errors.push(`unsupported menu route contract version: ${menuRouteExtension.version}`)
    }
    if (!Array.isArray(menuRouteExtension.routes)) {
      errors.push('x-ryframe-menu-routes.routes must be an array')
    } else {
      for (const [index, route] of menuRouteExtension.routes.entries()) {
        const routeKey = route?.route_key
        const name = route?.name
        const titleKey = route?.title_key
        const menuType = route?.menu_type
        if (typeof routeKey !== 'string' || !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(routeKey)) {
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
        `menu route contract ${routeKey}: permission_code must be ` +
          `${JSON.stringify(expectedPermission)}, found ${JSON.stringify(contract.permissionCode)}`,
      )
    }
    const expectedCapability = featureRegistry.get(routeKey)?.capabilityCode ?? null
    if (contract.capabilityCode !== expectedCapability) {
      errors.push(
        `menu route contract ${routeKey}: capability_code must be ` +
          `${JSON.stringify(expectedCapability)}, found ${JSON.stringify(contract.capabilityCode)}`,
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
